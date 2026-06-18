import Link from "next/link";
import { AlertCircle, Flag } from "lucide-react";
import { getOrCreateCapacity, getBaseline } from "@/lib/timeline/repo";
import { getEffortBand, capacityPlan } from "@/lib/timeline/service";
import {
  project,
  compareToTarget,
  daysBetween,
  effectiveHoursPerWeek,
} from "@/lib/projection/engine";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { updateCapacityAction, setBaselineAction } from "./actions";

const inputCls =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function fmt(iso: string | null): string {
  return iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString() : "—";
}

export default async function TimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const [capacity, effort, baseline] = await Promise.all([
    getOrCreateCapacity(id),
    getEffortBand(id),
    getBaseline(id),
  ]);

  const hoursPerWeek = effectiveHoursPerWeek({
    devs: Number(capacity.devs),
    hoursPerWeekPerDev: Number(capacity.hours_per_week_per_dev),
    utilizationPct: Number(capacity.utilization_pct),
  });

  const projection = effort ? project(effort, capacityPlan(capacity)) : null;
  const targetCmp =
    projection && capacity.target_date
      ? compareToTarget(projection.expected.endDate, capacity.target_date)
      : null;

  // Proportional bar span (days from start).
  const spanDays = projection
    ? Math.max(
        projection.pessimistic.calendarDays || 0,
        capacity.target_date ? daysBetween(capacity.start_date, capacity.target_date) : 0,
        1
      )
    : 1;
  const pct = (days: number | null) =>
    days == null || !Number.isFinite(days) ? 100 : Math.min(100, (days / spanDays) * 100);

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {error}
        </div>
      ) : null}

      {!effort ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm font-medium">No estimate yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Timeline projects the estimate against planned capacity. Generate an
            estimate first.
          </p>
          <Link
            href={`/projects/${id}/estimation`}
            className={buttonVariants({ variant: "outline", className: "mt-4" })}
          >
            Go to Estimation
          </Link>
        </div>
      ) : (
        <>
          {/* Capacity form */}
          <form
            action={updateCapacityAction}
            className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
          >
            <input type="hidden" name="projectId" value={id} />
            <Field label="Developers">
              <input name="devs" type="number" min="0" defaultValue={capacity.devs} className={inputCls} />
            </Field>
            <Field label="Hrs/week/dev">
              <input name="hoursPerWeekPerDev" type="number" defaultValue={capacity.hours_per_week_per_dev} className={inputCls} />
            </Field>
            <Field label="Utilisation %">
              <input name="utilizationPct" type="number" defaultValue={capacity.utilization_pct} className={inputCls} />
            </Field>
            <Field label="Start date" wide>
              <input name="startDate" type="date" defaultValue={capacity.start_date} className={inputCls} />
            </Field>
            <Field label="Target date" wide>
              <input name="targetDate" type="date" defaultValue={capacity.target_date ?? ""} className={inputCls} />
            </Field>
            <SubmitButton size="sm" variant="outline" pendingLabel="Updating…">
              Update
            </SubmitButton>
          </form>

          <div className="text-sm text-muted-foreground">
            Effective capacity:{" "}
            <span className="font-medium text-foreground">{Math.round(hoursPerWeek)}h/week</span>
            {" · "}effort {Math.round(effort.min)}–{Math.round(effort.max)}h (incl. contingency)
          </div>

          {/* Projection cards */}
          {projection ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <DateCard label="Optimistic" point={projection.optimistic} fmt={fmt} />
              <DateCard label="Expected" point={projection.expected} fmt={fmt} highlight />
              <DateCard label="Pessimistic" point={projection.pessimistic} fmt={fmt} />
            </div>
          ) : null}

          {/* Target comparison */}
          {capacity.target_date ? (
            <div
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                targetCmp?.onTime
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-destructive/40 bg-destructive/10"
              }`}
            >
              <Flag className="size-4" />
              Target {fmt(capacity.target_date)} —{" "}
              {targetCmp
                ? targetCmp.onTime
                  ? `${targetCmp.slackDays} days of slack (expected finish is earlier)`
                  : `${Math.abs(targetCmp.slackDays)} days over (expected finish is later)`
                : "no projection"}
            </div>
          ) : null}

          {/* Proportional bar */}
          {projection ? (
            <div className="rounded-lg border bg-card p-4">
              <div className="relative h-10">
                <div className="absolute top-4 h-1.5 w-full rounded bg-muted" />
                <div
                  className="absolute top-4 h-1.5 rounded bg-primary/40"
                  style={{ width: `${pct(projection.pessimistic.calendarDays)}%` }}
                  title="Optimistic → pessimistic range"
                />
                <Marker pctLeft={pct(projection.optimistic.calendarDays)} label="Opt" />
                <Marker pctLeft={pct(projection.expected.calendarDays)} label="Exp" primary />
                <Marker pctLeft={pct(projection.pessimistic.calendarDays)} label="Pess" />
                {capacity.target_date ? (
                  <Marker
                    pctLeft={pct(daysBetween(capacity.start_date, capacity.target_date))}
                    label="Target"
                    target
                  />
                ) : null}
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{fmt(capacity.start_date)}</span>
                <span>{fmt(projection.pessimistic.endDate)}</span>
              </div>
            </div>
          ) : null}

          {/* Baseline */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
            <div className="text-sm">
              <div className="font-medium">Baseline</div>
              {baseline ? (
                <div className="text-muted-foreground">
                  Set {new Date(baseline.captured_at).toLocaleString()} · expected{" "}
                  {fmt(baseline.end_expected)} @ {Math.round(baseline.hours_per_week)}h/wk
                </div>
              ) : (
                <div className="text-muted-foreground">
                  No baseline yet. Set one to track delivery drift (Step 4).
                </div>
              )}
            </div>
            <form action={setBaselineAction}>
              <input type="hidden" name="projectId" value={id} />
              <SubmitButton size="sm" pendingLabel="Saving…">
                {baseline ? "Update baseline" : "Set baseline"}
              </SubmitButton>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className={wide ? "w-40" : "w-28"}>{children}</div>
    </div>
  );
}

function DateCard({
  label,
  point,
  fmt,
  highlight,
}: {
  label: string;
  point: { endDate: string | null; weeks: number };
  fmt: (iso: string | null) => string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "bg-card ring-1 ring-primary/30" : "bg-card"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{fmt(point.endDate)}</div>
      <div className="text-xs text-muted-foreground">
        {Number.isFinite(point.weeks) ? `${Math.ceil(point.weeks)} weeks` : "needs capacity"}
      </div>
    </div>
  );
}

function Marker({
  pctLeft,
  label,
  primary,
  target,
}: {
  pctLeft: number;
  label: string;
  primary?: boolean;
  target?: boolean;
}) {
  return (
    <div
      className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
      style={{ left: `${pctLeft}%` }}
    >
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span
        className={`mt-0.5 size-2.5 rounded-full ${
          target ? "bg-amber-500" : primary ? "bg-primary" : "bg-foreground/50"
        }`}
      />
    </div>
  );
}

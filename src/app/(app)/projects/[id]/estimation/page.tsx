import Link from "next/link";
import { AlertCircle, Lock } from "lucide-react";
import { getProjectArtifactByType } from "@/lib/artifacts/store";
import { listArtifactEvents } from "@/lib/events/bus";
import {
  listTasks,
  getOrCreateSettings,
  toEngineTask,
  toEngineSettings,
} from "@/lib/estimation/repo";
import { computeEstimate, DISCIPLINES } from "@/lib/estimation/engine";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { TaskRow } from "./task-row";
import {
  generateEstimateAction,
  updateSettingsAction,
  submitEstimateAction,
  approveEstimateAction,
  rejectEstimateAction,
  lockEstimateAction,
} from "./actions";

const inputCls =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  generated: "secondary",
  under_review: "default",
  approved: "default",
  rejected: "destructive",
};

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

export default async function EstimationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const [prd, tasksRows, settingsRow, estimate] = await Promise.all([
    getProjectArtifactByType(id, "prd"),
    listTasks(id),
    getOrCreateSettings(id),
    getProjectArtifactByType(id, "estimate"),
  ]);

  const settings = toEngineSettings(settingsRow);
  const result = computeEstimate(tasksRows.map(toEngineTask), settings);
  const events = estimate ? await listArtifactEvents(estimate.id) : [];
  const locked = !!estimate?.locked_at;
  const status = estimate?.review_status ?? "generated";
  const cur = settings.currency;

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {error}
        </div>
      ) : null}

      {!prd ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm font-medium">No PRD yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Feature Estimation breaks down the PRD. Generate a PRD first.
          </p>
          <Link
            href={`/projects/${id}/prd`}
            className={buttonVariants({ variant: "outline", className: "mt-4" })}
          >
            Go to PRD
          </Link>
        </div>
      ) : tasksRows.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm font-medium">No estimate yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Break the PRD into a discipline-tagged task breakdown.
          </p>
          <form action={generateEstimateAction} className="mt-4 inline-block">
            <input type="hidden" name="projectId" value={id} />
            <SubmitButton pendingLabel="Generating estimate…">
              Generate estimate
            </SubmitButton>
          </form>
        </div>
      ) : (
        <>
          {/* Quote + status bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
            <div>
              <div className="text-xs text-muted-foreground">Quote range</div>
              <div className="text-2xl font-semibold tabular-nums">
                {money(result.quote.quoteMin, cur)} – {money(result.quote.quoteMax, cur)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {Math.round(result.totals.expected)}h expected · confidence{" "}
                {result.confidenceScore}/100 ({result.confidenceLabel})
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[status]} className="capitalize">
                  {status.replace("_", " ")}
                </Badge>
                {estimate ? (
                  <span className="text-xs text-muted-foreground">
                    v{estimate.current_version}
                  </span>
                ) : null}
                {locked ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="size-3.5" /> Locked
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!locked ? (
                  <form action={generateEstimateAction}>
                    <input type="hidden" name="projectId" value={id} />
                    <SubmitButton size="sm" variant="outline" pendingLabel="Regenerating…">
                      Regenerate breakdown
                    </SubmitButton>
                  </form>
                ) : null}
                {estimate && !locked && (status === "generated" || status === "rejected") ? (
                  <form action={submitEstimateAction}>
                    <input type="hidden" name="projectId" value={id} />
                    <input type="hidden" name="artifactId" value={estimate.id} />
                    <SubmitButton size="sm" pendingLabel="Submitting…">
                      Submit quote
                    </SubmitButton>
                  </form>
                ) : null}
                {estimate && !locked && status === "under_review" ? (
                  <>
                    <form action={approveEstimateAction}>
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="artifactId" value={estimate.id} />
                      <SubmitButton size="sm" pendingLabel="Approving…">Approve</SubmitButton>
                    </form>
                    <form action={rejectEstimateAction}>
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="artifactId" value={estimate.id} />
                      <SubmitButton size="sm" variant="outline" pendingLabel="Rejecting…">
                        Request changes
                      </SubmitButton>
                    </form>
                  </>
                ) : null}
                {estimate && !locked && status === "approved" ? (
                  <form action={lockEstimateAction}>
                    <input type="hidden" name="projectId" value={id} />
                    <input type="hidden" name="artifactId" value={estimate.id} />
                    <SubmitButton size="sm" pendingLabel="Locking…">
                      <Lock className="size-3.5" /> Lock quote
                    </SubmitButton>
                  </form>
                ) : null}
              </div>
            </div>
          </div>

          {/* Settings */}
          <form
            action={updateSettingsAction}
            className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
          >
            <input type="hidden" name="projectId" value={id} />
            <Field label="Currency">
              <input name="currency" defaultValue={settingsRow.currency} className={inputCls} />
            </Field>
            <Field label="Day rate">
              <input name="dayRate" type="number" defaultValue={settingsRow.day_rate} className={inputCls} />
            </Field>
            <Field label="Hrs/day">
              <input name="hoursPerDay" type="number" defaultValue={settingsRow.hours_per_day} className={inputCls} />
            </Field>
            <Field label="Margin %">
              <input name="marginPct" type="number" defaultValue={settingsRow.margin_pct} className={inputCls} />
            </Field>
            <Field label="Contingency %">
              <input name="contingencyPct" type="number" defaultValue={settingsRow.contingency_pct} className={inputCls} />
            </Field>
            <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">
              Update
            </SubmitButton>
          </form>

          {/* Discipline totals */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {DISCIPLINES.map((d) => (
              <div key={d} className="rounded-lg border bg-card p-3">
                <div className="text-xs capitalize text-muted-foreground">{d}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {Math.round(result.byDiscipline[d].expected)}h
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {result.byDiscipline[d].min}–{result.byDiscipline[d].max}h
                </div>
              </div>
            ))}
          </div>

          {/* Task table */}
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Task</th>
                  <th className="px-3 py-2 font-medium">Discipline</th>
                  <th className="px-3 py-2 font-medium">Min</th>
                  <th className="px-3 py-2 font-medium">Max</th>
                  <th className="px-3 py-2 font-medium">Uncertainty</th>
                </tr>
              </thead>
              <tbody>
                {tasksRows.map((t) => (
                  <TaskRow key={t.id} projectId={id} task={t} locked={locked} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Risk report */}
          <section className="rounded-lg border">
            <h3 className="border-b px-4 py-2 text-sm font-semibold">Risk Report</h3>
            <ol className="list-inside list-decimal space-y-1 px-4 py-3 text-sm">
              {result.risks.map((r, i) => (
                <li key={i}>
                  <span className="font-medium">{r.title}</span>{" "}
                  <span className="text-muted-foreground">({r.discipline}) — {r.reason}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Activity */}
          {estimate ? (
            <section className="rounded-lg border">
              <h3 className="border-b px-4 py-2 text-sm font-semibold">Activity</h3>
              <ul className="divide-y text-sm">
                {events.length === 0 ? (
                  <li className="px-4 py-3 text-muted-foreground">No activity yet.</li>
                ) : (
                  events.map((e) => (
                    <li key={e.id} className="flex items-center justify-between px-4 py-2">
                      <span className="font-mono text-xs">{e.type}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="w-28">{children}</div>
    </div>
  );
}

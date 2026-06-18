import { AlertCircle, CheckCircle2, RefreshCw, Upload, Plug } from "lucide-react";
import { getOrCreateIntegration, listSnapshots } from "@/lib/delivery/repo";
import { computeRisk } from "@/lib/delivery/risk";
import { listTasks } from "@/lib/estimation/repo";
import { createLinearConnector } from "@/lib/connectors/linear";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import type { VelocitySnapshot } from "@/lib/db/types";
import { linkTeamAction, pushTasksAction, syncNowAction } from "./actions";

const RAG_CLASS: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40",
  amber: "bg-amber-500/15 text-amber-600 border-amber-500/40",
  red: "bg-destructive/15 text-destructive border-destructive/40",
};

function fmt(iso: string | null): string {
  return iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString() : "—";
}

export default async function DeliveryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const [integration, tasks, snapshots] = await Promise.all([
    getOrCreateIntegration(id),
    listTasks(id),
    listSnapshots(id),
  ]);

  const hasKey = !!process.env.LINEAR_API_KEY;
  const linked = !!integration.linear_team_id;
  const pushedCount = tasks.filter((t) => t.external_id).length;

  // Offer team choices only when a key exists and nothing is linked yet.
  let teams: { id: string; name: string }[] = [];
  let teamError: string | null = null;
  if (hasKey && !linked) {
    try {
      teams = await createLinearConnector().listTeams();
    } catch (e) {
      teamError = (e as Error).message;
    }
  }

  const risk = linked ? await computeRisk(id) : null;

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Banner tone="error">{error}</Banner>
      ) : ok ? (
        <Banner tone="ok">{ok}</Banner>
      ) : null}

      {/* Connection panel */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Plug className="size-4" /> Linear connection
        </div>

        {!hasKey ? (
          <p className="text-sm text-muted-foreground">
            Set <code>LINEAR_API_KEY</code> in <code>.env.local</code> and restart the
            dev server to connect.
          </p>
        ) : !linked ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Choose a Linear team to sync this project with.
            </p>
            {teamError ? (
              <p className="text-sm text-destructive">{teamError}</p>
            ) : teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No teams found.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {teams.map((t) => (
                  <form key={t.id} action={linkTeamAction}>
                    <input type="hidden" name="projectId" value={id} />
                    <input type="hidden" name="teamId" value={t.id} />
                    <input type="hidden" name="teamName" value={t.name} />
                    <SubmitButton size="sm" variant="outline" pendingLabel="Linking…">
                      Use “{t.name}”
                    </SubmitButton>
                  </form>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              Linked to <span className="font-medium">{integration.linear_team_name}</span>
              <span className="text-muted-foreground">
                {" · "}
                {pushedCount}/{tasks.length} tasks pushed
                {integration.last_synced_at
                  ? ` · synced ${new Date(integration.last_synced_at).toLocaleString()}`
                  : " · never synced"}
              </span>
            </div>
            <div className="flex gap-2">
              <form action={pushTasksAction}>
                <input type="hidden" name="projectId" value={id} />
                <SubmitButton size="sm" variant="outline" pendingLabel="Pushing…">
                  <Upload className="size-3.5" /> Push tasks
                </SubmitButton>
              </form>
              <form action={syncNowAction}>
                <input type="hidden" name="projectId" value={id} />
                <SubmitButton size="sm" pendingLabel="Syncing…">
                  <RefreshCw className="size-3.5" /> Sync now
                </SubmitButton>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Risk dashboard */}
      {linked && risk ? (
        !risk.hasData ? (
          <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
            No tasks yet — generate an estimate, push to Linear, and sync.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="On-time probability">
                {risk.probability !== null ? (
                  <span
                    className={`inline-flex items-center rounded border px-2 py-0.5 text-lg font-semibold ${
                      risk.rag ? RAG_CLASS[risk.rag] : ""
                    }`}
                  >
                    {risk.probability}%
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">set a target date</span>
                )}
              </Stat>
              <Stat label="Progress">
                {risk.pctComplete}%{" "}
                <span className="text-xs text-muted-foreground">
                  ({Math.round(risk.completedHours)}/{Math.round(risk.totalHours)}h)
                </span>
              </Stat>
              <Stat label="Velocity (actual / required)">
                {risk.actualVelocity.toFixed(1)} /{" "}
                {risk.requiredVelocity === null
                  ? "—"
                  : Number.isFinite(risk.requiredVelocity)
                    ? risk.requiredVelocity.toFixed(1)
                    : "∞"}{" "}
                h/wk
              </Stat>
              <Stat label="Projected / target">
                {fmt(risk.projectedEnd)}{" "}
                <span className="text-xs text-muted-foreground">/ {fmt(risk.targetDate)}</span>
              </Stat>
            </div>

            <BurnChart snapshots={snapshots} />

            {/* Risk brief */}
            <section className="rounded-lg border">
              <h3 className="border-b px-4 py-2 text-sm font-semibold">Risk Brief</h3>
              <ul className="list-inside list-disc space-y-1 px-4 py-3 text-sm">
                {risk.brief.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              <div className="border-t px-4 py-3">
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  Progress by discipline
                </div>
                <div className="flex flex-wrap gap-2">
                  {risk.bottlenecks.map((b) => (
                    <Badge key={b.discipline} variant="secondary">
                      {b.discipline}: {b.pctComplete}%
                    </Badge>
                  ))}
                </div>
              </div>
            </section>
          </>
        )
      ) : null}
    </div>
  );
}

function Banner({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
        tone === "error"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
      }`}
    >
      {tone === "error" ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
      {children}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{children}</div>
    </div>
  );
}

function BurnChart({ snapshots }: { snapshots: VelocitySnapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Burn chart appears after two or more syncs on different days.
      </div>
    );
  }
  const w = 600;
  const h = 120;
  const pad = 8;
  const total = Math.max(...snapshots.map((s) => Number(s.total_hours)), 1);
  const n = snapshots.length;
  const pts = snapshots
    .map((s, i) => {
      const x = pad + (i / (n - 1)) * (w - 2 * pad);
      const y = h - pad - (Number(s.completed_hours) / total) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 text-sm font-medium">Burn-up (completed hours)</div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full">
        <line x1={pad} y1={pad} x2={w - pad} y2={pad} className="stroke-muted" strokeWidth="1" />
        <polyline points={pts} fill="none" className="stroke-primary" strokeWidth="2" />
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{fmt(snapshots[0].snapshot_date)}</span>
        <span>{Math.round(total)}h total</span>
        <span>{fmt(snapshots[snapshots.length - 1].snapshot_date)}</span>
      </div>
    </div>
  );
}

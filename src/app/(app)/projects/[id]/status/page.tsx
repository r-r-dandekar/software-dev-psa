import Link from "next/link";
import { AlertCircle, CheckCircle2, GitBranch, FileText, Lock } from "lucide-react";
import { getOrCreateIntegration } from "@/lib/delivery/repo";
import { getOrCreateReportSettings } from "@/lib/reports/repo";
import { listProjectArtifacts } from "@/lib/artifacts/store";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import {
  linkRepoAction,
  updateReportSettingsAction,
  generateReportAction,
} from "./actions";

const inputCls =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  generated: "secondary",
  under_review: "default",
  approved: "default",
  rejected: "destructive",
};

export default async function StatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const [integration, settings, reports] = await Promise.all([
    getOrCreateIntegration(id),
    getOrCreateReportSettings(id),
    listProjectArtifacts(id, "status_report"),
  ]);

  const linkedRepo =
    integration.github_owner && integration.github_repo
      ? `${integration.github_owner}/${integration.github_repo}`
      : null;

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {error}
        </div>
      ) : ok ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
          <CheckCircle2 className="size-4" /> {ok}
        </div>
      ) : null}

      {/* GitHub repo link */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <GitBranch className="size-4" /> GitHub repo
        </div>
        {linkedRepo ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">
              Linked to <span className="font-medium">{linkedRepo}</span>
            </span>
            <form action={generateReportAction}>
              <input type="hidden" name="projectId" value={id} />
              <SubmitButton size="sm" pendingLabel="Generating…">
                Generate this week&apos;s report
              </SubmitButton>
            </form>
          </div>
        ) : (
          <form action={linkRepoAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="projectId" value={id} />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Owner</label>
              <input name="owner" placeholder="r-r-dandekar" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Repo</label>
              <input name="repo" placeholder="software-dev-psa" className={inputCls} />
            </div>
            <SubmitButton size="sm" variant="outline" pendingLabel="Linking…">
              Link repo
            </SubmitButton>
          </form>
        )}
      </div>

      {/* Client communication profile */}
      <form
        action={updateReportSettingsAction}
        className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
      >
        <input type="hidden" name="projectId" value={id} />
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tone</label>
          <select name="tone" defaultValue={settings.tone} className={inputCls}>
            <option value="non_technical">non-technical</option>
            <option value="technical">technical</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Formality</label>
          <select name="formality" defaultValue={settings.formality} className={inputCls}>
            <option value="formal">formal</option>
            <option value="informal">informal</option>
          </select>
        </div>
        <div className="min-w-[220px] flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">
            Notes (always/never mention…)
          </label>
          <input name="notes" defaultValue={settings.notes ?? ""} className={inputCls} />
        </div>
        <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">
          Save profile
        </SubmitButton>
      </form>

      {/* Archive */}
      <section className="rounded-lg border">
        <h3 className="border-b px-4 py-2 text-sm font-semibold">Report archive</h3>
        {reports.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No reports yet. Link a repo and generate this week&apos;s report.
          </div>
        ) : (
          <ul className="divide-y text-sm">
            {reports.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/projects/${id}/status/${r.id}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/40"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    {r.title}
                  </span>
                  <span className="flex items-center gap-2">
                    {r.locked_at ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="size-3" /> sent
                      </span>
                    ) : (
                      <Badge variant={STATUS_VARIANT[r.review_status]} className="capitalize">
                        {r.review_status.replace("_", " ")}
                      </Badge>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, AlertCircle, Lock, Send } from "lucide-react";
import { getArtifact, getCurrentVersion } from "@/lib/artifacts/store";
import { listArtifactEvents } from "@/lib/events/bus";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { ReportEditor } from "./report-editor";
import {
  submitReportAction,
  approveReportAction,
  rejectReportAction,
  sendReportAction,
} from "./actions";

const STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  generated: "secondary",
  under_review: "default",
  approved: "default",
  rejected: "destructive",
};

export default async function ReportViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; reportId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, reportId } = await params;
  const { error } = await searchParams;

  const artifact = await getArtifact(reportId);
  if (!artifact || artifact.project_id !== id || artifact.type !== "status_report") {
    notFound();
  }
  const [version, events] = await Promise.all([
    getCurrentVersion(reportId),
    listArtifactEvents(reportId),
  ]);
  const locked = !!artifact!.locked_at;
  const status = artifact!.review_status;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/projects/${id}/status`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Status reports
      </Link>

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{artifact!.title}</span>
          {locked ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="size-3.5" /> Sent
            </span>
          ) : (
            <Badge variant={STATUS_VARIANT[status]} className="capitalize">
              {status.replace("_", " ")}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!locked && (status === "generated" || status === "rejected") ? (
            <form action={submitReportAction}>
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="artifactId" value={reportId} />
              <SubmitButton size="sm" pendingLabel="Submitting…">Submit for review</SubmitButton>
            </form>
          ) : null}
          {!locked && status === "under_review" ? (
            <>
              <form action={approveReportAction}>
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="artifactId" value={reportId} />
                <SubmitButton size="sm" pendingLabel="Approving…">Approve</SubmitButton>
              </form>
              <form action={rejectReportAction}>
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="artifactId" value={reportId} />
                <SubmitButton size="sm" variant="outline" pendingLabel="Rejecting…">
                  Request changes
                </SubmitButton>
              </form>
            </>
          ) : null}
          {!locked && status === "approved" ? (
            <form action={sendReportAction}>
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="artifactId" value={reportId} />
              <SubmitButton size="sm" pendingLabel="Sending…">
                <Send className="size-3.5" /> Send
              </SubmitButton>
            </form>
          ) : null}
          <a
            href={`/print/prd/${reportId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Export PDF
          </a>
        </div>
      </div>

      {version ? (
        <ReportEditor
          projectId={id}
          artifactId={reportId}
          sections={version.content.sections}
          locked={locked}
        />
      ) : null}

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
    </div>
  );
}

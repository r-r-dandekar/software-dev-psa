import Link from "next/link";
import { Lock, Download, AlertCircle } from "lucide-react";
import { getProjectArtifactByType, getCurrentVersion } from "@/lib/artifacts/store";
import { listArtifactEvents } from "@/lib/events/bus";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { PrdSection } from "./prd-section";
import { submitAction, approveAction, rejectAction, lockAction } from "./actions";

const STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  generated: "secondary",
  under_review: "default",
  approved: "default",
  rejected: "destructive",
};

export default async function PrdPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const prd = await getProjectArtifactByType(id, "prd");
  if (!prd) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm font-medium">No PRD yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate one from the Requirements tab.
        </p>
        <Link
          href={`/projects/${id}/requirements`}
          className={buttonVariants({ variant: "outline", className: "mt-4" })}
        >
          Go to Requirements
        </Link>
      </div>
    );
  }

  const [version, events] = await Promise.all([
    getCurrentVersion(prd.id),
    listArtifactEvents(prd.id),
  ]);
  const locked = !!prd.locked_at;
  const status = prd.review_status;

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {error}
        </div>
      ) : null}

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[status]} className="capitalize">
            {status.replace("_", " ")}
          </Badge>
          <span className="text-xs text-muted-foreground">v{prd.current_version}</span>
          {locked ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="size-3.5" /> Locked
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!locked && (status === "generated" || status === "rejected") ? (
            <form action={submitAction}>
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="artifactId" value={prd.id} />
              <SubmitButton size="sm" pendingLabel="Submitting…">
                Submit for review
              </SubmitButton>
            </form>
          ) : null}

          {!locked && status === "under_review" ? (
            <>
              <form action={approveAction}>
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="artifactId" value={prd.id} />
                <SubmitButton size="sm" pendingLabel="Approving…">
                  Approve
                </SubmitButton>
              </form>
              <form action={rejectAction}>
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="artifactId" value={prd.id} />
                <SubmitButton size="sm" variant="outline" pendingLabel="Rejecting…">
                  Request changes
                </SubmitButton>
              </form>
            </>
          ) : null}

          {!locked && status === "approved" ? (
            <form action={lockAction}>
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="artifactId" value={prd.id} />
              <SubmitButton size="sm" pendingLabel="Locking…">
                <Lock className="size-3.5" /> Lock PRD
              </SubmitButton>
            </form>
          ) : null}

          <a
            href={`/print/prd/${prd.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download className="size-3.5" /> Export PDF
          </a>
        </div>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-3">
        {version?.content.sections.map((s) => (
          <PrdSection
            key={s.key}
            projectId={id}
            artifactId={prd.id}
            sectionKey={s.key}
            title={s.title}
            body={s.body}
            locked={locked}
          />
        ))}
      </div>

      {/* Audit trail */}
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

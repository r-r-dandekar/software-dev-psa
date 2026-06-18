import Link from "next/link";
import { AlertCircle, ScanLine, FileCode } from "lucide-react";
import { getOrCreateIntegration } from "@/lib/delivery/repo";
import { listProjectArtifacts } from "@/lib/artifacts/store";
import { createGitHubConnector } from "@/lib/connectors/github";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { reviewPrAction } from "./actions";

const inputCls =
  "h-9 w-24 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function CodeReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const [integration, reviews] = await Promise.all([
    getOrCreateIntegration(id),
    listProjectArtifacts(id, "code_review"),
  ]);
  const linked = integration.github_owner && integration.github_repo;

  let openPRs: { number: number; title: string }[] = [];
  let prError: string | null = null;
  if (linked) {
    try {
      openPRs = await createGitHubConnector().listOpenPullRequests(
        integration.github_owner!,
        integration.github_repo!
      );
    } catch (e) {
      prError = (e as Error).message;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {error}
        </div>
      ) : null}

      {!linked ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm font-medium">No GitHub repo linked</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Link a repo on the Status tab, then review its pull requests here.
          </p>
          <Link
            href={`/projects/${id}/status`}
            className={buttonVariants({ variant: "outline", className: "mt-4" })}
          >
            Go to Status
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <ScanLine className="size-4" /> Review a pull request
            </div>
            <form action={reviewPrAction} className="flex items-end gap-2">
              <input type="hidden" name="projectId" value={id} />
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">PR number</label>
                <input name="prNumber" type="number" min="1" placeholder="7" className={inputCls} />
              </div>
              <SubmitButton size="sm" pendingLabel="Reviewing…">Review</SubmitButton>
            </form>

            {prError ? (
              <p className="mt-3 text-sm text-destructive">{prError}</p>
            ) : openPRs.length > 0 ? (
              <div className="mt-3">
                <div className="mb-1 text-xs text-muted-foreground">Open PRs</div>
                <div className="flex flex-wrap gap-2">
                  {openPRs.map((pr) => (
                    <form key={pr.number} action={reviewPrAction}>
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="prNumber" value={pr.number} />
                      <SubmitButton size="sm" variant="outline" pendingLabel="Reviewing…">
                        #{pr.number} {pr.title.slice(0, 40)}
                      </SubmitButton>
                    </form>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">No open PRs found.</p>
            )}
          </div>

          <section className="rounded-lg border">
            <h3 className="border-b px-4 py-2 text-sm font-semibold">Review history</h3>
            {reviews.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No reviews yet.
              </div>
            ) : (
              <ul className="divide-y text-sm">
                {reviews.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/projects/${id}/review/${r.id}`}
                      className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/40"
                    >
                      <FileCode className="size-4 text-muted-foreground" />
                      {r.title}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

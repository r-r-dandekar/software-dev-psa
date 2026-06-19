import Link from "next/link";
import { Lock, Download, AlertCircle, MessageSquare, CircleDot, CheckCircle2 } from "lucide-react";
import { getProjectArtifactByType, getCurrentVersion } from "@/lib/artifacts/store";
import { listArtifactEvents } from "@/lib/events/bus";
import { listRequirements } from "@/lib/requirements/repo";
import { getInterviewState } from "@/lib/prd/interview-service";
import { isInterviewReady } from "@/lib/prd/interview-core";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { PrdSection } from "./prd-section";
import { InterviewComposer } from "./interview-composer";
import { submitAction, approveAction, rejectAction, lockAction } from "./actions";
import {
  startInterviewAction,
  continueInterviewAction,
  deferDimensionAction,
  revisitDimensionAction,
  generateFromInterviewAction,
} from "./interview-actions";
import type { DimensionState } from "@/lib/db/types";

const STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  generated: "secondary",
  under_review: "default",
  approved: "default",
  rejected: "destructive",
};

const DIM_STATE: Record<DimensionState, { variant: "secondary" | "default" | "destructive"; label: string }> = {
  open: { variant: "destructive", label: "open" },
  resolved: { variant: "default", label: "resolved" },
  deferred: { variant: "secondary", label: "deferred" },
  na: { variant: "secondary", label: "n/a" },
};

export default async function PrdPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; interview?: string }>;
}) {
  const { id } = await params;
  const { error, interview: forceInterview } = await searchParams;

  const [prd, interviewState, requirements] = await Promise.all([
    getProjectArtifactByType(id, "prd"),
    getInterviewState(id),
    listRequirements(id),
  ]);

  const inInterview =
    interviewState &&
    (interviewState.interview.status !== "generated" || forceInterview === "1");

  // ---- START: no interview yet, no PRD ----
  if (!interviewState && !prd) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <MessageSquare className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Build the PRD with a guided interview</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          The AI interviews you to clarify every requirement before writing the PRD —
          it won&apos;t generate until things are clear.
        </p>
        {requirements.length === 0 ? (
          <p className="mt-4 text-sm text-amber-600">
            Add at least one requirement first.
          </p>
        ) : (
          <form action={startInterviewAction} className="mt-4 inline-block">
            <input type="hidden" name="projectId" value={id} />
            <SubmitButton pendingLabel="Starting…">Start PRD interview</SubmitButton>
          </form>
        )}
      </div>
    );
  }

  // ---- INTERVIEW ----
  if (inInterview && interviewState) {
    const { messages, dimensions } = interviewState;
    const ready = isInterviewReady(dimensions);
    const last = messages[messages.length - 1];
    // Pending = the assistant's turn hasn't been produced yet (no messages, or
    // the user answered but the AI turn was interrupted). Resumable via Continue.
    const pending = !last || last.role === "user";
    const recommended =
      last?.role === "assistant" ? last.payload?.recommended : undefined;
    const options = last?.role === "assistant" ? last.payload?.options : undefined;

    return (
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Chat */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {error ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4" /> {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === "assistant" ? "" : "ml-auto max-w-[85%]"}
              >
                <div className="mb-0.5 text-[11px] text-muted-foreground">
                  {m.role === "assistant" ? "Analyst" : "You"}
                </div>
                <div
                  className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                    m.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          {pending ? (
            <div className="rounded-lg border bg-card p-3 text-sm">
              <p className="text-muted-foreground">
                {messages.length === 0
                  ? "Ready to begin."
                  : "Your answer was saved, but the assistant hasn't responded yet (it may have hit a rate limit). Continue when ready — nothing is lost."}
              </p>
              <form action={continueInterviewAction} className="mt-2">
                <input type="hidden" name="projectId" value={id} />
                <SubmitButton size="sm" pendingLabel="Working…">
                  Continue
                </SubmitButton>
              </form>
            </div>
          ) : (
            <InterviewComposer projectId={id} recommended={recommended} options={options} />
          )}

          {ready && !pending ? (
            <form action={generateFromInterviewAction}>
              <input type="hidden" name="projectId" value={id} />
              <SubmitButton pendingLabel="Generating PRD…">
                <CheckCircle2 className="size-4" /> Generate PRD
              </SubmitButton>
            </form>
          ) : null}
          {prd ? (
            <Link
              href={`/projects/${id}/prd`}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back to current PRD
            </Link>
          ) : null}
        </div>

        {/* Readiness checklist */}
        <aside className="w-full shrink-0 lg:w-72">
          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-semibold">Readiness</span>
              <Badge variant={ready ? "default" : "secondary"}>
                {dimensions.filter((d) => d.state !== "open").length}/{dimensions.length}
              </Badge>
            </div>
            <ul className="divide-y text-sm">
              {dimensions.map((d) => (
                <li key={d.id} className="px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <CircleDot
                        className={`size-3.5 ${d.state === "open" ? "text-destructive" : "text-emerald-500"}`}
                      />
                      {d.label}
                    </span>
                    <Badge variant={DIM_STATE[d.state].variant} className="text-[10px]">
                      {DIM_STATE[d.state].label}
                    </Badge>
                  </div>
                  {d.note ? (
                    <div className="mt-1 pl-5 text-xs text-muted-foreground">{d.note}</div>
                  ) : null}
                  <div className="mt-1 pl-5">
                    {d.state === "open" ? (
                      <form action={deferDimensionAction}>
                        <input type="hidden" name="projectId" value={id} />
                        <input type="hidden" name="key" value={d.key} />
                        <input type="hidden" name="reason" value="Deferred during interview" />
                        <button className="text-[11px] text-muted-foreground hover:text-foreground">
                          defer
                        </button>
                      </form>
                    ) : (
                      <form action={revisitDimensionAction}>
                        <input type="hidden" name="projectId" value={id} />
                        <input type="hidden" name="key" value={d.key} />
                        <button className="text-[11px] text-muted-foreground hover:text-foreground">
                          revisit
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    );
  }

  // ---- PRD VIEW ----
  if (!prd) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        No PRD yet.
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
              <SubmitButton size="sm" pendingLabel="Submitting…">Submit for review</SubmitButton>
            </form>
          ) : null}
          {!locked && status === "under_review" ? (
            <>
              <form action={approveAction}>
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="artifactId" value={prd.id} />
                <SubmitButton size="sm" pendingLabel="Approving…">Approve</SubmitButton>
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
          {!locked && interviewState ? (
            <Link
              href={`/projects/${id}/prd?interview=1`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <MessageSquare className="size-3.5" /> Refine via interview
            </Link>
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

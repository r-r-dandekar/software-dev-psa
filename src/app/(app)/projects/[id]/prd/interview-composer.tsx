"use client";

import { useFormStatus } from "react-dom";
import { Circle } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { sendMessageAction } from "./interview-actions";

/** One MCQ-style answer: full-width, left-aligned, wraps long text. */
function OptionButton({
  children,
  recommended,
}: {
  children: React.ReactNode;
  recommended?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex w-full items-start gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50 ${
        recommended ? "border-primary/30 bg-primary/[0.04]" : "border-border"
      }`}
    >
      <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 whitespace-normal break-words">{children}</span>
      {recommended ? (
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          recommended
        </span>
      ) : null}
    </button>
  );
}

export function InterviewComposer({
  projectId,
  recommended,
  options,
}: {
  projectId: string;
  recommended?: string;
  options?: string[];
}) {
  const opts: { text: string; rec: boolean }[] = [];
  if (recommended) opts.push({ text: recommended, rec: true });
  for (const o of options ?? []) {
    if (o && o !== recommended) opts.push({ text: o, rec: false });
  }

  return (
    <div className="flex flex-col gap-3">
      {opts.length ? (
        <div className="flex flex-col gap-1.5">
          {opts.map((o, i) => (
            <form key={i} action={sendMessageAction}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="message" value={o.text} />
              <OptionButton recommended={o.rec}>{o.text}</OptionButton>
            </form>
          ))}
        </div>
      ) : null}

      <form action={sendMessageAction} className="flex items-end gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <textarea
          name="message"
          rows={2}
          placeholder="…or type your own answer"
          className="flex-1 rounded-md border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <SubmitButton pendingLabel="Sending…">Send</SubmitButton>
      </form>
    </div>
  );
}

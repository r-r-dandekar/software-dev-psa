"use client";

import { Check } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { sendMessageAction } from "./interview-actions";

export function InterviewComposer({
  projectId,
  recommended,
  options,
}: {
  projectId: string;
  recommended?: string;
  options?: string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {recommended || (options && options.length) ? (
        <div className="flex flex-wrap gap-2">
          {recommended ? (
            <form action={sendMessageAction}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="message" value={recommended} />
              <SubmitButton size="sm" pendingLabel="Sending…">
                <Check className="size-3.5" /> {recommended.slice(0, 80)}
              </SubmitButton>
            </form>
          ) : null}
          {(options ?? [])
            .filter((o) => o && o !== recommended)
            .map((o) => (
              <form action={sendMessageAction} key={o}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="message" value={o} />
                <SubmitButton size="sm" variant="outline" pendingLabel="Sending…">
                  {o.slice(0, 80)}
                </SubmitButton>
              </form>
            ))}
        </div>
      ) : null}

      <form action={sendMessageAction} className="flex items-end gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <textarea
          name="message"
          rows={2}
          placeholder="Type your answer, or pick an option above…"
          className="flex-1 rounded-md border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <SubmitButton pendingLabel="Sending…">Send</SubmitButton>
      </form>
    </div>
  );
}

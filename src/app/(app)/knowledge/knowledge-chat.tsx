"use client";

import { useActionState } from "react";
import { Sparkles, Flag } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { askAction, flagQueryAction, type AskState } from "./actions";

export function KnowledgeChat() {
  const [state, formAction] = useActionState<AskState, FormData>(askAction, null);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-2">
        <textarea
          name="question"
          required
          rows={2}
          placeholder="Ask anything about past projects, PRDs, estimates, reports…"
          className="w-full rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div>
          <SubmitButton pendingLabel="Searching…">
            <Sparkles className="size-4" /> Ask
          </SubmitButton>
        </div>
      </form>

      {state ? (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            {state.question}
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {state.answer}
          </div>

          {state.citations.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Sources:</span>
              {state.citations.map((c) => (
                <Badge key={c.title} variant="secondary" className="text-[11px]">
                  {c.title}
                </Badge>
              ))}
            </div>
          ) : null}

          {!state.isGap && state.queryId ? (
            <form action={flagQueryAction} className="mt-3">
              <input type="hidden" name="queryId" value={state.queryId} />
              <button
                type="submit"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Flag className="size-3" /> Flag as incorrect
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

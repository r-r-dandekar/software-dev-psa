"use client";

import { useState } from "react";
import { Pencil, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { editSectionAction, regenerateSectionAction } from "./actions";

export function PrdSection({
  projectId,
  artifactId,
  sectionKey,
  title,
  body,
  locked,
}: {
  projectId: string;
  artifactId: string;
  sectionKey: string;
  title: string;
  body: string;
  locked: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {!locked ? (
          <div className="flex items-center gap-1">
            {!editing ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" /> Edit
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X className="size-3.5" /> Cancel
              </Button>
            )}
            <form action={regenerateSectionAction}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="artifactId" value={artifactId} />
              <input type="hidden" name="sectionKey" value={sectionKey} />
              <SubmitButton variant="ghost" size="sm" pendingLabel="Regenerating…">
                <RefreshCw className="size-3.5" /> Regenerate
              </SubmitButton>
            </form>
          </div>
        ) : null}
      </div>

      <div className="p-4">
        {editing ? (
          <form action={editSectionAction} className="space-y-2">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="artifactId" value={artifactId} />
            <input type="hidden" name="sectionKey" value={sectionKey} />
            <textarea
              name="body"
              defaultValue={body}
              rows={Math.min(20, Math.max(6, body.split("\n").length + 2))}
              className="w-full rounded-md border bg-background p-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <SubmitButton size="sm" pendingLabel="Saving…">
              Save
            </SubmitButton>
          </form>
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {body || (
              <span className="text-muted-foreground">(empty)</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { editReportAction } from "./actions";
import type { ArtifactSection } from "@/lib/artifacts/content";

export function ReportEditor({
  projectId,
  artifactId,
  sections,
  locked,
}: {
  projectId: string;
  artifactId: string;
  sections: ArtifactSection[];
  locked: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing && !locked) {
    return (
      <form action={editReportAction} className="flex flex-col gap-3">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="artifactId" value={artifactId} />
        {sections.map((s) => (
          <section key={s.key} className="rounded-lg border bg-card">
            <div className="border-b px-4 py-2 text-sm font-semibold">{s.title}</div>
            <div className="p-3">
              <textarea
                name={`body_${s.key}`}
                defaultValue={s.body}
                rows={Math.min(14, Math.max(3, s.body.split("\n").length + 1))}
                className="w-full rounded-md border bg-background p-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </section>
        ))}
        <div className="flex gap-2">
          <SubmitButton size="sm" pendingLabel="Saving…">Save</SubmitButton>
          <Button variant="ghost" size="sm" type="button" onClick={() => setEditing(false)}>
            <X className="size-3.5" /> Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!locked ? (
        <div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" /> Edit report
          </Button>
        </div>
      ) : null}
      {sections.map((s) => (
        <section key={s.key} className="rounded-lg border bg-card">
          <div className="border-b px-4 py-2 text-sm font-semibold">{s.title}</div>
          <div className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-foreground/90">
            {s.body || <span className="text-muted-foreground">(empty)</span>}
          </div>
        </section>
      ))}
    </div>
  );
}

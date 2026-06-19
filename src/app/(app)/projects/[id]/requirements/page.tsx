import Link from "next/link";
import { Trash2, FileText } from "lucide-react";
import { listRequirements } from "@/lib/requirements/repo";
import { getProjectArtifactByType } from "@/lib/artifacts/store";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { addRequirementAction, deleteRequirementAction } from "./actions";

const inputCls =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function RequirementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [requirements, prd] = await Promise.all([
    listRequirements(id),
    getProjectArtifactByType(id, "prd"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Add requirement: heading + optional description */}
      <form action={addRequirementAction} className="space-y-2 rounded-lg border p-3">
        <input type="hidden" name="projectId" value={id} />
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[240px] flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Requirement (heading)
            </label>
            <input name="heading" required placeholder="User authentication" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <select name="category" className={inputCls}>
              <option value="functional">functional</option>
              <option value="non_functional">non-functional</option>
              <option value="integration">integration</option>
              <option value="constraint">constraint</option>
              <option value="persona">persona</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Priority</label>
            <select name="priority" className={inputCls}>
              <option value="must">must</option>
              <option value="should">should</option>
              <option value="nice">nice</option>
            </select>
          </div>
          <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Description <span className="font-normal">(optional — the interview will fill gaps)</span>
          </label>
          <textarea
            name="description"
            rows={2}
            placeholder="Any detail you already know…"
            className="w-full rounded-md border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </form>

      {/* Requirements list */}
      {requirements.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No requirements yet. Add a few, then build the PRD via the interview.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Requirement</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.heading || r.description}</div>
                    {r.heading && r.description ? (
                      <div className="text-xs text-muted-foreground">{r.description}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.category}</td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary">{r.priority}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <form action={deleteRequirementAction}>
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        aria-label="Delete requirement"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PRD lives on the PRD tab (interview → generate) */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div>
          <div className="text-sm font-medium">Product Requirements Document</div>
          <div className="text-sm text-muted-foreground">
            {prd
              ? "A PRD exists for this project."
              : "Build the PRD on the PRD tab — a guided interview clarifies the details first."}
          </div>
        </div>
        <Link
          href={`/projects/${id}/prd`}
          className={buttonVariants({ variant: prd ? "outline" : "default" })}
        >
          <FileText className="size-4" /> {prd ? "Open PRD" : "Build PRD"}
        </Link>
      </div>
    </div>
  );
}

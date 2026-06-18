import Link from "next/link";
import { Trash2, FileText } from "lucide-react";
import { listRequirements } from "@/lib/requirements/repo";
import { getProjectArtifactByType } from "@/lib/artifacts/store";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import {
  addRequirementAction,
  deleteRequirementAction,
  generatePrdAction,
} from "./actions";

const inputClass =
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
      {/* Add requirement */}
      <form
        action={addRequirementAction}
        className="flex flex-wrap items-end gap-2 rounded-lg border p-3"
      >
        <input type="hidden" name="projectId" value={id} />
        <div className="min-w-[260px] flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Requirement
          </label>
          <input
            name="description"
            required
            placeholder="The system must…"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <select name="category" className={inputClass}>
            <option value="functional">functional</option>
            <option value="non_functional">non-functional</option>
            <option value="integration">integration</option>
            <option value="constraint">constraint</option>
            <option value="persona">persona</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Priority</label>
          <select name="priority" className={inputClass}>
            <option value="must">must</option>
            <option value="should">should</option>
            <option value="nice">nice</option>
          </select>
        </div>
        <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
      </form>

      {/* Requirements list */}
      {requirements.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No requirements yet. Add a few, then generate a PRD.
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
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.description}</td>
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

      {/* Generate / open PRD */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div>
          <div className="text-sm font-medium">Product Requirements Document</div>
          <div className="text-sm text-muted-foreground">
            {prd
              ? "A PRD exists for this project."
              : "Generate a PRD from the requirements above."}
          </div>
        </div>
        {prd ? (
          <Link
            href={`/projects/${id}/prd`}
            className={buttonVariants({ variant: "outline" })}
          >
            <FileText className="size-4" /> Open PRD
          </Link>
        ) : (
          <form action={generatePrdAction}>
            <input type="hidden" name="projectId" value={id} />
            <SubmitButton pendingLabel="Generating PRD…">
              <FileText className="size-4" /> Generate PRD
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}

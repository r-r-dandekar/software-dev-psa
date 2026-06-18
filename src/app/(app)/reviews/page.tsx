import Link from "next/link";
import { ListChecks } from "lucide-react";
import { listArtifactsByStatus } from "@/lib/artifacts/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ReviewsPage() {
  const pending = await listArtifactsByStatus("under_review");

  return (
    <div className="flex flex-col">
      <h1 className="text-xl font-semibold tracking-tight">Review Queue</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        AI-drafted artifacts awaiting approval.
      </p>

      {pending.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <ListChecks className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Nothing awaiting review</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Items appear here when a team member submits an artifact for review.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Artifact</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 font-medium">Submitted</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((a) => (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{a.title}</td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="uppercase">
                      {a.type}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {a.project?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(a.updated_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {a.type === "prd" && a.project ? (
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={`/projects/${a.project.id}/prd`} />}
                      >
                        Review
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

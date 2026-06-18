import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { listProjects } from "@/lib/projects/repo";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every client engagement, from lead to completed.
          </p>
        </div>
        <Link href="/projects/new" className={buttonVariants()}>
          <Plus className="size-4" /> New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FolderKanban className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No projects yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create your first project to start a PRD.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link
                      href={`/projects/${p.id}/requirements`}
                      className="font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {p.client?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="capitalize">
                      {p.stage}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
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

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getProject } from "@/lib/projects/repo";
import { Badge } from "@/components/ui/badge";
import { WorkspaceTabs } from "@/components/layout/workspace-tabs";

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="flex flex-col">
      <Link
        href="/projects"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Projects
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
        <Badge variant="secondary" className="capitalize">
          {project.stage}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {project.client?.name ?? "—"}
        {project.tech_stack ? ` · ${project.tech_stack}` : ""}
      </p>

      <div className="mt-4">
        <WorkspaceTabs projectId={project.id} />
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}

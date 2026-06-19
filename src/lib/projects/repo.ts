import "server-only";
import { getDb } from "@/lib/supabase/context";
import type { Project, ProjectStage } from "@/lib/db/types";

export type ProjectWithClient = Project & { client: { name: string } | null };

export async function listProjects(): Promise<ProjectWithClient[]> {
  const supabase = await getDb();
  const { data } = await supabase
    .from("projects")
    .select("*, client:clients(name)")
    .order("created_at", { ascending: false });
  return (data as ProjectWithClient[]) ?? [];
}

export async function getProject(id: string): Promise<ProjectWithClient | null> {
  const supabase = await getDb();
  const { data } = await supabase
    .from("projects")
    .select("*, client:clients(name)")
    .eq("id", id)
    .maybeSingle();
  return (data as ProjectWithClient) ?? null;
}

export async function createProjectWithClient(input: {
  clientName: string;
  projectName: string;
  techStack?: string;
  targetLaunch?: string;
  createdBy: string;
}): Promise<Project> {
  const supabase = await getDb();

  const { data: client, error: cErr } = await supabase
    .from("clients")
    .insert({ name: input.clientName })
    .select("*")
    .single();
  if (cErr) throw cErr;

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .insert({
      client_id: (client as { id: string }).id,
      name: input.projectName,
      tech_stack: input.techStack ?? null,
      target_launch: input.targetLaunch ?? null,
      created_by: input.createdBy,
      stage: "lead",
    })
    .select("*")
    .single();
  if (pErr) throw pErr;

  return project as Project;
}

export async function updateProjectStage(
  id: string,
  stage: ProjectStage
): Promise<void> {
  const supabase = await getDb();
  const { error } = await supabase
    .from("projects")
    .update({ stage })
    .eq("id", id);
  if (error) throw error;
}

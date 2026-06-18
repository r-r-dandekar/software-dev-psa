import { PagePlaceholder } from "@/components/page-placeholder";
import { FolderKanban } from "lucide-react";

export default function ProjectsPage() {
  return (
    <PagePlaceholder
      title="Projects"
      description="Every client engagement, from lead to completed."
      icon={FolderKanban}
      comingIn="Project records and the Project Workspace arrive with PRD Generation in Step 1."
    />
  );
}

import { PagePlaceholder } from "@/components/page-placeholder";
import { ListChecks } from "lucide-react";

export default function ReviewsPage() {
  return (
    <PagePlaceholder
      title="Review Queue"
      description="AI-drafted artifacts awaiting your approval."
      icon={ListChecks}
      comingIn="The Review Workflow and global queue arrive with PRD Generation in Step 1 (S4)."
    />
  );
}

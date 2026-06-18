import { PagePlaceholder } from "@/components/page-placeholder";
import { BookOpen } from "lucide-react";

export default function KnowledgePage() {
  return (
    <PagePlaceholder
      title="Knowledge Base"
      description="Ask questions across the agency's accumulated knowledge."
      icon={BookOpen}
      comingIn="The Living Knowledge Base (RAG over all artifacts) arrives in Step 7."
    />
  );
}

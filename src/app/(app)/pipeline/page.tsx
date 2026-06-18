import { PagePlaceholder } from "@/components/page-placeholder";
import { Inbox } from "lucide-react";

export default function PipelinePage() {
  return (
    <PagePlaceholder
      title="Pipeline"
      description="Leads and deals in progress."
      icon={Inbox}
      comingIn="The sales pipeline arrives with Prospect Research (Step 9)."
    />
  );
}

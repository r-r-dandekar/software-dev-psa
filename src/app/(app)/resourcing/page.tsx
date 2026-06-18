import { PagePlaceholder } from "@/components/page-placeholder";
import { Users } from "lucide-react";

export default function ResourcingPage() {
  return (
    <PagePlaceholder
      title="Resourcing"
      description="Team capacity and utilisation across all projects."
      icon={Users}
      comingIn="Capacity modelling arrives with Resource Optimization (Step 12)."
    />
  );
}

import { PagePlaceholder } from "@/components/page-placeholder";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <PagePlaceholder
      title="Settings"
      description="Users, roles, integrations, and platform configuration."
      icon={Settings}
      comingIn="Auth, roles (D10), and integration settings are wired across upcoming steps."
    />
  );
}

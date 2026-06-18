import {
  LayoutDashboard,
  FolderKanban,
  Inbox,
  ListChecks,
  BookOpen,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Global navigation areas (S1). The per-project Project Workspace is entered by
 * selecting a project from /projects and is added in Step 1.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Portfolio", href: "/", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Pipeline", href: "/pipeline", icon: Inbox },
  { label: "Review Queue", href: "/reviews", icon: ListChecks },
  { label: "Knowledge Base", href: "/knowledge", icon: BookOpen },
  { label: "Resourcing", href: "/resourcing", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

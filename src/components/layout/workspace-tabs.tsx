"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function WorkspaceTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const tabs = [
    { label: "Requirements", href: `/projects/${projectId}/requirements` },
    { label: "PRD", href: `/projects/${projectId}/prd` },
    { label: "Estimation", href: `/projects/${projectId}/estimation` },
    { label: "Timeline", href: `/projects/${projectId}/timeline` },
    { label: "Delivery", href: `/projects/${projectId}/delivery` },
  ];

  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

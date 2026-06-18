import { FolderKanban } from "lucide-react";

const STATS = [
  { label: "Active projects", value: "—" },
  { label: "Awaiting review", value: "—" },
  { label: "At-risk milestones", value: "—" },
  { label: "Open proposals", value: "—" },
];

export default function PortfolioPage() {
  return (
    <div className="flex flex-col">
      <h1 className="text-xl font-semibold tracking-tight">Portfolio</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Agency-wide health across all projects.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <FolderKanban className="size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No projects yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Projects appear here once created. Project creation arrives with PRD
          Generation in Step 1.
        </p>
      </div>
    </div>
  );
}

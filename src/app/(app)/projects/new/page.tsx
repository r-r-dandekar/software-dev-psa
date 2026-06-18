import Link from "next/link";
import { createProjectAction } from "../actions";
import { Button } from "@/components/ui/button";

const inputClass =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">New project</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Creates the project record (the spine all modules attach to).
      </p>

      <form action={createProjectAction} className="mt-6 space-y-4">
        <div className="space-y-1">
          <label htmlFor="clientName" className="text-sm font-medium">
            Client name
          </label>
          <input id="clientName" name="clientName" required className={inputClass} />
        </div>
        <div className="space-y-1">
          <label htmlFor="projectName" className="text-sm font-medium">
            Project name
          </label>
          <input id="projectName" name="projectName" required className={inputClass} />
        </div>
        <div className="space-y-1">
          <label htmlFor="techStack" className="text-sm font-medium">
            Tech stack <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="techStack"
            name="techStack"
            placeholder="Next.js, Supabase, Tailwind"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="targetLaunch" className="text-sm font-medium">
            Target launch <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="targetLaunch"
            name="targetLaunch"
            placeholder="Q4 2026"
            className={inputClass}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit">Create project</Button>
          <Button variant="ghost" render={<Link href="/projects" />}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

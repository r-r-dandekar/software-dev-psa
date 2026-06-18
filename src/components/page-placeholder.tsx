import type { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  description: string;
  icon?: LucideIcon;
  /** Short note about which build step delivers this area. */
  comingIn?: string;
};

/**
 * Standard page scaffold with a first-class empty state (S8). Reused by the
 * Step 0 stub areas until each feature module fills them in.
 */
export function PagePlaceholder({ title, description, icon: Icon, comingIn }: Props) {
  return (
    <div className="flex flex-col">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        {Icon ? <Icon className="size-8 text-muted-foreground" /> : null}
        <p className="mt-3 text-sm font-medium">Nothing here yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {comingIn ?? "This area will populate as you use the platform."}
        </p>
      </div>
    </div>
  );
}

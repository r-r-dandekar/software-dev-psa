"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Submit button that shows a pending label while its form action runs. */
export function SubmitButton({
  children,
  pendingLabel = "Working…",
  variant,
  size,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      size={size}
      className={className}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}

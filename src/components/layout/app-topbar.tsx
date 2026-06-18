"use client";

import Link from "next/link";
import { Bell, Search, LogOut, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/app/login/actions";
import { markReadAction, markAllReadAction } from "@/app/notifications-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type TopbarNotification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type TopbarProfile = {
  email: string | null;
  roles: string[];
};

export function AppTopbar({
  profile,
  notifications,
}: {
  profile: TopbarProfile;
  notifications: TopbarNotification[];
}) {
  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search projects, artifacts…"
          disabled
          className="h-9 w-full rounded-md border bg-muted/40 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" aria-label="Notifications" />}
          >
            <span className="relative">
              <Bell className="size-4" />
              {unread > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-white">
                  {unread}
                </span>
              ) : null}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-semibold">Notifications</span>
              {notifications.length > 0 ? (
                <form action={markAllReadAction}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <CheckCheck className="size-3.5" /> Mark all as done
                  </button>
                </form>
              ) : null}
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                You&apos;re all caught up.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.slice(0, 12).map((n) => (
                  <div key={n.id} className="flex items-start gap-1 rounded-md px-2 py-2 hover:bg-muted">
                    {n.link ? (
                      <Link href={n.link} className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{n.title}</div>
                        {n.body ? (
                          <div className="text-xs text-muted-foreground">{n.body}</div>
                        ) : null}
                      </Link>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{n.title}</div>
                        {n.body ? (
                          <div className="text-xs text-muted-foreground">{n.body}</div>
                        ) : null}
                      </div>
                    )}
                    <form action={markReadAction}>
                      <input type="hidden" name="id" value={n.id} />
                      <button
                        type="submit"
                        aria-label="Mark as done"
                        title="Mark as done"
                        className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                      >
                        <Check className="size-3.5" />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="sm" aria-label="Account" />}
          >
            <span className="max-w-[160px] truncate text-sm">
              {profile.email ?? "Account"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <div className="truncate text-sm font-medium">{profile.email}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {profile.roles.length > 0 ? (
                  profile.roles.map((r) => (
                    <Badge key={r} variant="secondary" className="text-[10px]">
                      {r}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">no roles</span>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

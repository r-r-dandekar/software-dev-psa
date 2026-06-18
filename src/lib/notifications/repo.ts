import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotifyInput = {
  type: string;
  title: string;
  body?: string;
  link?: string;
  artifactId?: string;
};

/** Create an in-app notification (S5) for each of the given users. */
export async function notifyUsers(
  userIds: string[],
  n: NotifyInput,
  client?: SupabaseClient
): Promise<void> {
  if (userIds.length === 0) return;
  const supabase = client ?? (await createClient());
  await supabase.from("notifications").insert(
    userIds.map((user_id) => ({
      user_id,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
      artifact_id: n.artifactId ?? null,
    }))
  );
}

/** Mark one of the current user's notifications read. */
export async function markRead(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
}

/** Mark all of the current user's unread notifications read. */
export async function markAllRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
}

/**
 * Auto-clear: mark every recipient's notifications for an artifact read once it
 * has been handled. Uses the admin client because it spans other users' rows.
 */
export async function markArtifactNotificationsRead(
  artifactId: string
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("artifact_id", artifactId)
    .is("read_at", null);
}

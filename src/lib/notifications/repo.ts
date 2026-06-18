import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type NotifyInput = {
  type: string;
  title: string;
  body?: string;
  link?: string;
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
    }))
  );
}

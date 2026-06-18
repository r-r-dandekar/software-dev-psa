"use server";

import { revalidatePath } from "next/cache";
import { markRead, markAllRead } from "@/lib/notifications/repo";

export async function markReadAction(formData: FormData) {
  await markRead(String(formData.get("id")));
  revalidatePath("/", "layout");
}

export async function markAllReadAction() {
  await markAllRead();
  revalidatePath("/", "layout");
}

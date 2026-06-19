import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./server";

/**
 * Data-access context. Repos/services call getDb() instead of binding to the
 * request-scoped client directly. In a normal request it returns the cookie-
 * based server client; inside a background job (Inngest), the job wraps its
 * work in runWithDb(adminClient, ...) so the same code runs with service-role
 * access and no request/session. This is the keystone that lets scheduled jobs
 * reuse the existing repos.
 */
const als = new AsyncLocalStorage<SupabaseClient>();

export function runWithDb<T>(client: SupabaseClient, fn: () => Promise<T>): Promise<T> {
  return als.run(client, fn);
}

export async function getDb(): Promise<SupabaseClient> {
  const ctx = als.getStore();
  if (ctx) return ctx;
  return createClient();
}

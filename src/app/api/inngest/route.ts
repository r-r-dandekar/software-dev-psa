import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

/** Inngest endpoint — the dev server and cloud register/invoke functions here. */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});

import { Inngest } from "inngest";

/**
 * Inngest client (D15) — the durable async/jobs layer. It runs scheduled jobs,
 * async AI generation, webhook processing, and reactions to domain events
 * (D6). Domain events are emitted via inngest.send(...) from feature modules.
 */
export const inngest = new Inngest({ id: "psa-software" });

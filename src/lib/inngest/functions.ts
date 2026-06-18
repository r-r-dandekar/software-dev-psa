import { inngest } from "./client";

/**
 * Step 0 smoke functions — prove the two async paths work end-to-end:
 *  - event-driven  (demo/hello)
 *  - scheduled     (hourly cron)
 * Replaced by real domain-event handlers and scheduled jobs from Step 1 on.
 *
 * Inngest v4: createFunction(options, handler); triggers live in options.
 */
export const helloWorld = inngest.createFunction(
  { id: "hello-world", triggers: [{ event: "demo/hello" }] },
  async ({ event, step }) => {
    const greeting = await step.run("build-greeting", async () => {
      const name =
        (event.data as { name?: string } | undefined)?.name ?? "world";
      return `Hello, ${name}!`;
    });
    return { greeting };
  }
);

export const heartbeat = inngest.createFunction(
  { id: "heartbeat", triggers: [{ cron: "0 * * * *" }] },
  async () => {
    return { ranAt: new Date().toISOString() };
  }
);

export const functions = [helloWorld, heartbeat];

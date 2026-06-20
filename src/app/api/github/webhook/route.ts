import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { inngest } from "@/lib/inngest/client";

/**
 * GitHub webhook (D13). Verifies the signature, then hands PR events to Inngest
 * so the (slow) AI review runs in the background and GitHub gets a fast 200.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (secret) {
    const sig = req.headers.get("x-hub-signature-256") ?? "";
    const expected =
      "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
    const ok =
      sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  if (req.headers.get("x-github-event") !== "pull_request") {
    return NextResponse.json({ ok: true, ignored: "event" });
  }

  const payload = JSON.parse(body) as {
    action?: string;
    number?: number;
    repository?: { name?: string; owner?: { login?: string } };
  };
  if (!["opened", "synchronize", "reopened"].includes(payload.action ?? "")) {
    return NextResponse.json({ ok: true, ignored: payload.action });
  }

  const owner = payload.repository?.owner?.login;
  const repo = payload.repository?.name;
  const number = payload.number;
  if (!owner || !repo || !number) {
    return NextResponse.json({ ok: true, ignored: "missing fields" });
  }

  await inngest.send({ name: "github/pr.opened", data: { owner, repo, number } });
  return NextResponse.json({ ok: true, queued: true });
}

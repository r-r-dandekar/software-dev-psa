import { Database } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { countChunks } from "@/lib/kb/index-service";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { KnowledgeChat } from "./knowledge-chat";
import { reindexAction } from "./actions";
import type { KbQuery } from "@/lib/db/types";

export default async function KnowledgePage() {
  const chunks = await countChunks();

  const supabase = await createClient();
  const { data } = await supabase
    .from("kb_queries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  const recent = (data as KbQuery[]) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Knowledge Base</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask across the agency&apos;s indexed artifacts — PRDs, estimates,
            reports, and code reviews.
          </p>
        </div>
        <form action={reindexAction}>
          <SubmitButton size="sm" variant="outline" pendingLabel="Indexing…">
            <Database className="size-4" /> Reindex
          </SubmitButton>
        </form>
      </div>

      <div className="text-xs text-muted-foreground">
        {chunks === 0
          ? "Nothing indexed yet — click Reindex to embed the current artifacts."
          : `${chunks} chunk(s) indexed.`}
      </div>

      <KnowledgeChat />

      {recent.length > 0 ? (
        <section className="rounded-lg border">
          <h3 className="border-b px-4 py-2 text-sm font-semibold">Recent questions</h3>
          <ul className="divide-y text-sm">
            {recent.map((q) => (
              <li key={q.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{q.question}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {q.is_gap ? (
                      <Badge variant="secondary" className="text-[10px]">gap</Badge>
                    ) : null}
                    {q.helpful === false ? (
                      <Badge variant="destructive" className="text-[10px]">flagged</Badge>
                    ) : null}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

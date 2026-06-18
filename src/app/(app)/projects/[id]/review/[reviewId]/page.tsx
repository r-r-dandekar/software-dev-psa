import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getArtifact, getCurrentVersion } from "@/lib/artifacts/store";
import { Badge } from "@/components/ui/badge";
import type { CodeFinding, Severity } from "@/lib/codereview/render";

const SEV_CLASS: Record<Severity, string> = {
  blocking: "bg-destructive/15 text-destructive border-destructive/40",
  suggestion: "bg-amber-500/15 text-amber-600 border-amber-500/40",
  nitpick: "bg-muted text-muted-foreground border-border",
};

export default async function ReviewViewPage({
  params,
}: {
  params: Promise<{ id: string; reviewId: string }>;
}) {
  const { id, reviewId } = await params;
  const artifact = await getArtifact(reviewId);
  if (!artifact || artifact.project_id !== id || artifact.type !== "code_review") {
    notFound();
  }
  const version = await getCurrentVersion(reviewId);
  const data = (version?.content.data ?? {}) as {
    verdict?: string;
    summary?: string;
    findings?: CodeFinding[];
  };
  const findings = data.findings ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/projects/${id}/review`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Code reviews
      </Link>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{artifact!.title}</span>
          <Badge variant={data.verdict === "approve" ? "secondary" : "destructive"}>
            {data.verdict === "approve" ? "Approve" : "Request changes"}
          </Badge>
        </div>
        {data.summary ? (
          <p className="mt-2 text-sm text-foreground/90">{data.summary}</p>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-lg border">
        <h3 className="border-b px-4 py-2 text-sm font-semibold">
          Findings ({findings.length})
        </h3>
        {findings.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No issues found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Severity</th>
                <th className="px-3 py-2 font-medium">Dimension</th>
                <th className="px-3 py-2 font-medium">Location</th>
                <th className="px-3 py-2 font-medium">Issue</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="px-3 py-2">
                    <span className={`rounded border px-1.5 py-0.5 text-xs ${SEV_CLASS[f.severity]}`}>
                      {f.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{f.dimension}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {f.file}
                    {f.line ? `:${f.line}` : ""}
                  </td>
                  <td className="px-3 py-2">
                    {f.message}
                    {f.suggestion ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        💡 {f.suggestion}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

import { notFound } from "next/navigation";
import { getArtifact, getCurrentVersion } from "@/lib/artifacts/store";
import { PrintTrigger } from "./print-trigger";

export default async function PrdPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const artifact = await getArtifact(id);
  if (!artifact) notFound();
  const version = await getCurrentVersion(id);

  return (
    <div className="mx-auto max-w-3xl bg-white px-10 py-12 text-black">
      <PrintTrigger />
      <h1 className="text-2xl font-bold">{artifact.title}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Version {artifact.current_version}
        {artifact.locked_at ? " · Locked" : ""}
      </p>

      <div className="mt-8 space-y-8">
        {version?.content.sections.map((s) => (
          <section key={s.key} className="break-inside-avoid">
            <h2 className="border-b border-neutral-300 pb-1 text-lg font-semibold">
              {s.title}
            </h2>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

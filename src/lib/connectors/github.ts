import "server-only";
import type { RawCommit, RawPR } from "@/lib/reports/activity";

const API = "https://api.github.com";

async function gh<T>(path: string): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "psa-software",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export type GitHubActivity = { commits: RawCommit[]; prs: RawPR[] };

export type GitHubConnector = {
  readonly provider: "github";
  validateRepo(owner: string, repo: string): Promise<boolean>;
  getActivity(owner: string, repo: string, sinceIso: string): Promise<GitHubActivity>;
};

export function createGitHubConnector(): GitHubConnector {
  return {
    provider: "github",

    async validateRepo(owner, repo) {
      try {
        await gh(`/repos/${owner}/${repo}`);
        return true;
      } catch {
        return false;
      }
    },

    async getActivity(owner, repo, sinceIso) {
      const rawCommits = await gh<
        { commit: { message: string; author: { name: string; date: string } } }[]
      >(`/repos/${owner}/${repo}/commits?since=${sinceIso}&per_page=100`);

      const commits: RawCommit[] = rawCommits.map((c) => ({
        message: c.commit.message,
        author: c.commit.author?.name ?? "unknown",
        date: c.commit.author?.date ?? "",
      }));

      const rawPRs = await gh<
        {
          number: number;
          title: string;
          merged_at: string | null;
          state: string;
        }[]
      >(`/repos/${owner}/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=50`);

      const since = new Date(sinceIso).getTime();
      const prs: RawPR[] = rawPRs
        .filter(
          (p) =>
            p.state === "open" ||
            (p.merged_at !== null && new Date(p.merged_at).getTime() >= since)
        )
        .map((p) => ({
          number: p.number,
          title: p.title,
          mergedAt: p.merged_at,
          open: p.state === "open",
        }));

      return { commits, prs };
    },
  };
}

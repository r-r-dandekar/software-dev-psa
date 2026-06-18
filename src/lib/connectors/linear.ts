import "server-only";
import type { IssueConnector, ExternalIssue } from "./types";
import type { TaskStatus } from "@/lib/db/types";

const ENDPOINT = "https://api.linear.app/graphql";

function mapStatus(stateType: string): TaskStatus {
  switch (stateType) {
    case "completed":
      return "done";
    case "canceled":
      return "canceled";
    case "started":
      return "in_progress";
    default:
      return "todo"; // backlog, unstarted, triage
  }
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) throw new Error("LINEAR_API_KEY is not set");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(
      `Linear API error: ${json.errors?.[0]?.message ?? res.statusText}`
    );
  }
  return json.data as T;
}

export function createLinearConnector(): IssueConnector {
  return {
    provider: "linear",

    async listTeams() {
      const data = await gql<{ teams: { nodes: { id: string; name: string }[] } }>(
        `query { teams(first: 100) { nodes { id name } } }`,
        {}
      );
      return data.teams.nodes;
    },

    async createIssue({ teamId, title, description }) {
      const data = await gql<{
        issueCreate: { success: boolean; issue: { id: string; identifier: string } };
      }>(
        `mutation($input: IssueCreateInput!) {
           issueCreate(input: $input) { success issue { id identifier } }
         }`,
        { input: { teamId, title, description } }
      );
      // A mutation can return no top-level errors yet still produce no issue.
      if (!data.issueCreate?.success || !data.issueCreate.issue) {
        throw new Error("Linear issueCreate failed (no issue returned)");
      }
      return { id: data.issueCreate.issue.id, key: data.issueCreate.issue.identifier };
    },

    async listTeamIssues(teamId): Promise<ExternalIssue[]> {
      const data = await gql<{
        team: {
          issues: {
            nodes: {
              id: string;
              identifier: string;
              title: string;
              completedAt: string | null;
              state: { type: string };
            }[];
          };
        };
      }>(
        `query($teamId: String!) {
           team(id: $teamId) {
             issues(first: 250) {
               nodes { id identifier title completedAt state { type } }
             }
           }
         }`,
        { teamId }
      );
      return data.team.issues.nodes.map((n) => ({
        id: n.id,
        key: n.identifier,
        title: n.title,
        status: mapStatus(n.state.type),
        completedAt: n.completedAt,
      }));
    },
  };
}

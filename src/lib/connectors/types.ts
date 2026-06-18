import type { TaskStatus } from "@/lib/db/types";

/** Normalised external issue (provider-agnostic). */
export type ExternalIssue = {
  id: string;
  key: string;
  title: string;
  status: TaskStatus;
  completedAt: string | null;
};

/**
 * Pluggable connector interface (D11). New providers (Slack, Fireflies, CRM)
 * implement the slice they support; Delivery Risk uses the issue methods.
 */
export interface IssueConnector {
  readonly provider: string;
  listTeams(): Promise<{ id: string; name: string }[]>;
  createIssue(input: {
    teamId: string;
    title: string;
    description?: string;
  }): Promise<{ id: string; key: string }>;
  listTeamIssues(teamId: string): Promise<ExternalIssue[]>;
}

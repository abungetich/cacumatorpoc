export type DashboardStatKey =
  | "activeMentorships"
  | "pendingApprovals"
  | "safeguardingAlerts"
  | "sessionsThisWeek";

export type DashboardStatsResponse = {
  stats: Record<DashboardStatKey, number>;
  recentActivity: Array<{
    id: string;
    action: string;
    actor: string;
    entity: string;
    timestamp: string;
  }>;
};

export type MenteeRow = {
  id: string;
  name: string;
  school: string;
  educationLevel: "Primary" | "Secondary" | "College" | "University" | "Vocational";
  mentor: string;
  nextSession: string;
  status: "Matched" | "Waiting" | "At Risk";
};

export type MenteesResponse = {
  items: MenteeRow[];
};

export type AuditLogItem = {
  id: string;
  action: string;
  actor: string;
  entityType: string;
  entityId: string;
  timestamp: string;
};

export type IncidentItem = {
  id: string;
  subject: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
  immediateAction: string;
  reportedBy: string;
  timestamp: string;
};

export type AuditResponse = {
  items: AuditLogItem[];
};

export type IncidentsResponse = {
  items: IncidentItem[];
};

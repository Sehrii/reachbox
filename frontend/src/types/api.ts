export type EmailStatus = "scheduled" | "sending" | "sent" | "failed";
export type EmailListKind = "scheduled" | "sent";

export interface Email {
  id: string;
  campaignId: string;
  recipient: string;
  subject: string;
  body: string;
  senderEmail: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  failedReason: string | null;
  previewUrl: string | null;
  rescheduleCount: number;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface MeResponse {
  user: User;
  slack: { teamName: string; channel: string; connectedAt: string } | null;
}

export interface SlackStatus {
  connected: boolean;
  teamName: string | null;
  channel: string | null;
  connectedAt: string | null;
}

export interface EmailStats {
  scheduled: number;
  sent: number;
  failed: number;
}

export interface Sender {
  id: string;
  email: string;
  name: string;
}

export interface ScheduleRequest {
  subject: string;
  body: string;
  recipients: string[];
  startAt: string;
  delayMs: number;
  hourlyLimit: number;
  senderId?: string;
}

export interface ScheduleResponse {
  campaignId: string;
  count: number;
  firstScheduledAt: string;
  lastScheduledAt: string;
}

export interface ApiErrorBody {
  error: string;
  details?: Record<string, string[] | undefined>;
}

import type {
  ApiErrorBody,
  Email,
  EmailListKind,
  EmailStats,
  MeResponse,
  Paginated,
  ScheduleRequest,
  ScheduleResponse,
  Sender,
  SlackStatus,
} from "@/types/api";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function messageFrom(body: ApiErrorBody | null, status: number): string {
  if (!body) return `Request failed (${status})`;
  const firstDetail = body.details && Object.entries(body.details).find(([, v]) => v?.length);
  return firstDetail ? `${firstDetail[0]}: ${firstDetail[1]![0]}` : body.error;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the API running?");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, messageFrom(data, res.status));
  return data as T;
}

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  me: () => request<MeResponse>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  devLogin: (email: string) => request<unknown>("/auth/dev-login", json({ email })),

  listEmails: (kind: EmailListKind, page: number, pageSize: number) =>
    request<Paginated<Email>>(`/api/emails/${kind}?page=${page}&pageSize=${pageSize}`),
  searchEmails: (q: string, kind: EmailListKind) =>
    request<{ items: Email[] }>(`/api/emails/search?q=${encodeURIComponent(q)}&kind=${kind}`),
  getEmail: (id: string) => request<Email>(`/api/emails/${encodeURIComponent(id)}`),
  stats: () => request<EmailStats>("/api/emails/stats"),
  schedule: (body: ScheduleRequest) => request<ScheduleResponse>("/api/emails/schedule", json(body)),
  senders: () => request<{ items: Sender[] }>("/api/senders"),

  slackStatus: () => request<SlackStatus>("/api/slack/status"),
  slackTest: () => request<{ ok: boolean }>("/api/slack/test", { method: "POST" }),
  slackDisconnect: () => request<void>("/api/slack", { method: "DELETE" }),
};

/** OAuth flows are full-page navigations, not fetches. */
export const googleLoginUrl = `${API_URL}/auth/google`;
export const slackConnectUrl = `${API_URL}/api/slack/connect`;

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong";

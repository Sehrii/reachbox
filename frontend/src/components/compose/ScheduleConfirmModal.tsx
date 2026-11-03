import type { ReactNode } from "react";
import { formatDateTime, pluralize } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export interface ScheduleSummary {
  recipients: number;
  from: string;
  startAt: Date | null;
  delaySec: number;
  hourlyLimit: number;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-[13px]">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

export function ScheduleConfirmModal({ open, summary, loading, onCancel, onConfirm }: {
  open: boolean;
  summary: ScheduleSummary;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const start = summary.startAt ?? new Date();
  const lastAt = new Date(start.getTime() + (summary.recipients - 1) * summary.delaySec * 1000);
  const overLimit = summary.recipients > summary.hourlyLimit;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Schedule emails?"
      footer={
        <>
          <Button variant="ghost" pill size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button pill size="sm" onClick={onConfirm} loading={loading}>
            Schedule {pluralize(summary.recipients, "email")}
          </Button>
        </>
      }
    >
      <dl className="divide-y divide-line">
        <Row label="Recipients">{summary.recipients.toLocaleString()}</Row>
        <Row label="From">{summary.from}</Row>
        <Row label="Starts">{summary.startAt ? formatDateTime(summary.startAt.toISOString()) : "Right away"}</Row>
        <Row label="Delay between emails">{summary.delaySec ? `${summary.delaySec}s` : "None"}</Row>
        <Row label="Hourly limit">{summary.hourlyLimit.toLocaleString()} / hour</Row>
        {summary.recipients > 1 && <Row label="Last email (planned)">{formatDateTime(lastAt.toISOString())}</Row>}
      </dl>
      {overLimit && (
        <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700">
          This list is larger than the hourly limit. Emails over the limit wait for the next hour instead of being
          dropped. If Slack is connected, you&apos;ll get an alert when that happens.
        </p>
      )}
    </Modal>
  );
}

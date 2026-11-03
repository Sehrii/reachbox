"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useScheduleEmails, useSenders } from "@/hooks/useEmails";
import { errorMessage } from "@/lib/api";
import { htmlToText, pluralize } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/layout/PageHeader";
import { RecipientInput } from "./RecipientInput";
import { RichTextEditor } from "./RichTextEditor";
import { ScheduleConfirmModal } from "./ScheduleConfirmModal";
import { SendLaterPopover } from "./SendLaterPopover";
import { SenderSelect } from "./SenderSelect";

function FieldRow({ label, htmlFor, children, bordered = true }: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  bordered?: boolean;
}) {
  return (
    <div className={`flex items-start gap-4 ${bordered ? "border-b border-line" : ""}`}>
      <label htmlFor={htmlFor} className="w-14 shrink-0 pt-2.5 text-[13px] text-ink/80">
        {label}
      </label>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </div>
  );
}

const toInt = (s: string) => (s.trim() === "" ? NaN : Number(s));

export function ComposeForm() {
  const router = useRouter();
  const schedule = useScheduleEmails();
  const { data: senders } = useSenders();

  const [senderId, setSenderId] = useState<string | undefined>();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [delaySec, setDelaySec] = useState("");
  const [hourlyLimit, setHourlyLimit] = useState("");
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [confirming, setConfirming] = useState(false);

  const delay = delaySec.trim() === "" ? 0 : toInt(delaySec);
  const limit = toInt(hourlyLimit);

  function validate(): string | null {
    if (recipients.length === 0) return "Add at least one recipient or upload a list";
    if (!subject.trim()) return "Subject is required";
    if (!htmlToText(body)) return "Write a message body";
    if (!Number.isInteger(delay) || delay < 0) return "Delay between emails must be 0 or more seconds";
    if (!Number.isInteger(limit) || limit < 1) return "Hourly limit must be at least 1";
    return null;
  }

  function onSubmit() {
    const error = validate();
    if (error) toast.error(error);
    else setConfirming(true);
  }

  function onConfirm() {
    schedule.mutate(
      {
        subject: subject.trim(),
        body,
        recipients,
        startAt: (startAt ?? new Date()).toISOString(),
        delayMs: delay * 1000,
        hourlyLimit: limit,
        senderId,
      },
      {
        onSuccess: (res) => {
          toast.success(`${pluralize(res.count, "email")} scheduled`);
          router.push("/dashboard");
        },
        onError: (err) => {
          setConfirming(false);
          toast.error(errorMessage(err));
        },
      },
    );
  }

  const fromLabel = senders?.items.find((s) => s.id === senderId)?.email ?? "All senders (rotating)";

  return (
    <>
      <PageHeader
        title="Compose New Email"
        actions={
          <>
            <SendLaterPopover value={startAt} onChange={setStartAt} />
            <Button variant="outline" pill size="sm" onClick={onSubmit} loading={schedule.isPending}>
              {startAt ? "Send Later" : "Send"}
            </Button>
          </>
        }
      />

      <form
        className="mx-auto w-full max-w-[700px] space-y-1 px-4 pb-16 sm:px-6"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <FieldRow label="From" bordered={false}>
          <div className="py-1">
            <SenderSelect value={senderId} onChange={setSenderId} />
          </div>
        </FieldRow>

        <FieldRow label="To" htmlFor="compose-to">
          <RecipientInput id="compose-to" value={recipients} onChange={setRecipients} />
        </FieldRow>

        <FieldRow label="Subject" htmlFor="compose-subject">
          <Input
            id="compose-subject"
            variant="bare"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            maxLength={500}
          />
        </FieldRow>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 py-3">
          <label className="flex items-center gap-3 text-[13px] text-ink/80">
            Delay between 2 emails
            <span className="flex items-center gap-1.5">
              <Input variant="boxed" inputMode="numeric" placeholder="00" value={delaySec} onChange={(e) => setDelaySec(e.target.value.replace(/\D/g, ""))} />
              <span className="text-xs whitespace-nowrap text-muted">sec</span>
            </span>
          </label>
          <label className="flex items-center gap-3 text-[13px] text-ink/80">
            Hourly Limit
            <span className="flex items-center gap-1.5">
              <Input variant="boxed" inputMode="numeric" placeholder="00" value={hourlyLimit} onChange={(e) => setHourlyLimit(e.target.value.replace(/\D/g, ""))} />
              <span className="text-xs whitespace-nowrap text-muted">/ hr</span>
            </span>
          </label>
        </div>

        <RichTextEditor value={body} onChange={setBody} />
        <button type="submit" hidden />
      </form>

      <ScheduleConfirmModal
        open={confirming}
        loading={schedule.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={onConfirm}
        summary={{
          recipients: recipients.length,
          from: fromLabel,
          startAt,
          delaySec: Number.isInteger(delay) ? delay : 0,
          hourlyLimit: Number.isInteger(limit) ? limit : 0,
        }}
      />
    </>
  );
}

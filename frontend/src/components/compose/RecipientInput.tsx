"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { extractEmails, isEmail, mergeEmails } from "@/lib/parseEmails";
import { pluralize } from "@/lib/format";

const COLLAPSED_CHIPS = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface RecipientInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  id?: string;
}

function Chip({ email, onRemove }: { email: string; onRemove: () => void }) {
  return (
    <span className="group inline-flex h-6 items-center gap-1 rounded-full border border-brand/40 bg-brand-soft pr-1 pl-2.5 text-xs text-ink">
      {email}
      <button
        type="button"
        aria-label={`Remove ${email}`}
        onClick={onRemove}
        className="rounded-full p-0.5 text-muted opacity-60 hover:bg-white hover:text-ink group-hover:opacity-100"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

export function RecipientInput({ value, onChange, id }: RecipientInputProps) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const commitDraft = () => {
    const parts = draft.split(/[\s,;]+/).filter(Boolean);
    if (parts.length === 0) return;
    const valid = parts.filter(isEmail).map((e) => e.toLowerCase());
    const invalid = parts.filter((p) => !isEmail(p));
    if (valid.length) onChange(mergeEmails(value, valid));
    if (invalid.length) toast.error(`Not a valid email: ${invalid.join(", ")}`);
    setDraft(invalid.join(" "));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", ";", " ", "Tab"].includes(e.key) && draft.trim()) {
      if (e.key !== "Tab") e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File is too large (max 5 MB)");
      return;
    }
    const found = extractEmails(await file.text());
    if (found.length === 0) {
      toast.error(`No email addresses found in ${file.name}`);
      return;
    }
    const merged = mergeEmails(value, found);
    onChange(merged);
    toast.success(`${pluralize(found.length, "email")} detected in ${file.name}`, {
      description: merged.length - value.length < found.length ? "Duplicates were skipped." : undefined,
    });
  };

  const visible = expanded ? value : value.slice(0, COLLAPSED_CHIPS);
  const hidden = value.length - visible.length;
  const remove = (email: string) => onChange(value.filter((v) => v !== email));

  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <div className="flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-1.5 py-1">
        {visible.map((email) => (
          <Chip key={email} email={email} onRemove={() => remove(email)} />
        ))}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex h-6 items-center rounded-full border border-brand/40 bg-brand-soft px-2 text-xs font-medium text-ink hover:bg-brand-soft-hover"
          >
            +{hidden.toLocaleString()}
          </button>
        )}
        {expanded && value.length > COLLAPSED_CHIPS && (
          <button type="button" onClick={() => setExpanded(false)} className="text-xs text-muted hover:text-ink">
            Show less
          </button>
        )}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commitDraft}
          onPaste={(e) => {
            const pasted = extractEmails(e.clipboardData.getData("text"));
            if (pasted.length > 1) {
              e.preventDefault();
              onChange(mergeEmails(value, pasted));
            }
          }}
          placeholder={value.length ? "" : "recipient@example.com"}
          className="h-7 min-w-40 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/80"
        />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 py-1.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand hover:text-brand-hover"
        >
          <Upload className="size-3.5" />
          Upload List
        </button>
        {value.length > 0 && (
          <span className="text-[11px] text-muted" aria-live="polite">
            {pluralize(value.length, "email")} detected
          </span>
        )}
        <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={onFile} />
      </div>
    </div>
  );
}

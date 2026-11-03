"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronsUpDown,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Type,
  Underline,
  Undo2,
} from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { MenuItem } from "@/components/ui/Menu";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * Lightweight contentEditable editor. `execCommand` is deprecated on paper but is
 * still supported by every browser and is plenty for bold/lists/quotes in an email body.
 */
function exec(command: string, arg?: string) {
  document.execCommand(command, false, arg);
}

function ToolButton({ label, onRun, children }: { label: string; onRun: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // mousedown + preventDefault keeps the text selection in the editor
      onMouseDown={(e) => {
        e.preventDefault();
        onRun();
      }}
      className="inline-flex h-7 items-center justify-center gap-0.5 rounded-md px-1.5 text-ink/70 hover:bg-surface hover:text-ink [&>svg]:size-4"
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-4 w-px bg-line" aria-hidden />;

function DropdownTool({ label, icon, options }: {
  label: string;
  icon: ReactNode;
  options: { label: string; icon?: ReactNode; run: () => void }[];
}) {
  return (
    <Popover
      trigger={({ toggle }) => (
        <ToolButton label={label} onRun={toggle}>
          {icon}
          <ChevronsUpDown className="!size-3" />
        </ToolButton>
      )}
      panelClassName="min-w-36"
    >
      {(close) =>
        options.map((o) => (
          <MenuItem
            key={o.label}
            icon={o.icon}
            onMouseDown={(e) => {
              e.preventDefault();
              o.run();
              close();
            }}
          >
            {o.label}
          </MenuItem>
        ))
      }
    </Popover>
  );
}

export function RichTextEditor({ value, onChange, placeholder = "Type Your Reply..." }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Only push external values in (e.g. a reset); never while typing, or the caret jumps.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, [value]);

  const apply = (command: string, arg?: string) => {
    ref.current?.focus();
    exec(command, arg);
    onChange(ref.current?.innerHTML ?? "");
  };

  return (
    <div className="rounded-xl bg-[#f7f7f7] p-3">
      <p className="px-1 pb-2 text-sm text-muted">{placeholder}</p>
      <div
        role="toolbar"
        aria-label="Formatting"
        className="mb-2 flex flex-wrap items-center gap-0.5 rounded-full bg-white px-3 py-1 shadow-[0_0_0_1px_rgba(0,0,0,0.03)]"
      >
        <ToolButton label="Undo" onRun={() => apply("undo")}><Undo2 /></ToolButton>
        <ToolButton label="Redo" onRun={() => apply("redo")}><Redo2 /></ToolButton>
        <Divider />
        <DropdownTool
          label="Text size"
          icon={<Type />}
          options={[
            { label: "Small", run: () => apply("fontSize", "2") },
            { label: "Normal", run: () => apply("fontSize", "3") },
            { label: "Large", run: () => apply("fontSize", "5") },
          ]}
        />
        <Divider />
        <ToolButton label="Bold" onRun={() => apply("bold")}><Bold /></ToolButton>
        <ToolButton label="Italic" onRun={() => apply("italic")}><Italic /></ToolButton>
        <ToolButton label="Underline" onRun={() => apply("underline")}><Underline /></ToolButton>
        <Divider />
        <DropdownTool
          label="Align"
          icon={<AlignCenter />}
          options={[
            { label: "Left", icon: <AlignLeft />, run: () => apply("justifyLeft") },
            { label: "Center", icon: <AlignCenter />, run: () => apply("justifyCenter") },
            { label: "Right", icon: <AlignRight />, run: () => apply("justifyRight") },
          ]}
        />
        <Divider />
        <ToolButton label="Numbered list" onRun={() => apply("insertOrderedList")}><ListOrdered /></ToolButton>
        <ToolButton label="Bulleted list" onRun={() => apply("insertUnorderedList")}><List /></ToolButton>
        <ToolButton label="Indent" onRun={() => apply("indent")}><IndentIncrease /></ToolButton>
        <ToolButton label="Outdent" onRun={() => apply("outdent")}><IndentDecrease /></ToolButton>
        <ToolButton label="Quote" onRun={() => apply("formatBlock", "blockquote")}><Quote /></ToolButton>
        <ToolButton label="Clear formatting" onRun={() => apply("removeFormat")}><RemoveFormatting /></ToolButton>
        <Divider />
        <ToolButton label="Strikethrough" onRun={() => apply("strikeThrough")}><Strikethrough /></ToolButton>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline
        aria-label="Email body"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Write your message…"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="rich-editor min-h-64 px-2 py-1 text-sm leading-relaxed text-ink outline-none"
      />
    </div>
  );
}

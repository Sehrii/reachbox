"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Built on <dialog> so focus trapping, Escape and the backdrop come from the browser. */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(92vw,440px)] rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-black/30"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="text-base font-semibold">{title}</h2>
        <IconButton label="Close" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
    </dialog>
  );
}

"use client";

import { useState } from "react";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Bodies scheduled through the API may be plain text; keep their line breaks. */
const asHtml = (body: string) => (/<[a-z][\s\S]*>/i.test(body) ? body : escapeHtml(body).replace(/\n/g, "<br>"));

/**
 * Renders the stored HTML in a sandboxed iframe: scripts can't run and the email's
 * styles can't leak into the app. `allow-same-origin` (without scripts) lets us size it.
 */
export function EmailBody({ html }: { html: string }) {
  const [height, setHeight] = useState(120);
  const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
    body{margin:0;font:14px/1.6 Inter,system-ui,sans-serif;color:#1a1a1a;word-wrap:break-word}
    blockquote{border-left:3px solid #d4d4d4;margin:0;padding-left:12px;color:#555}
    p{margin:0 0 12px}
  </style></head><body>${asHtml(html)}</body></html>`;

  return (
    <iframe
      title="Email content"
      sandbox="allow-same-origin allow-popups"
      srcDoc={doc}
      style={{ height }}
      className="w-full border-0"
      onLoad={(e) => {
        const body = e.currentTarget.contentDocument?.body;
        if (body) setHeight(body.scrollHeight + 8);
      }}
    />
  );
}

import { useState } from "react";

export const shortId = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const shortHash = (h) => `${h.slice(0, 10)}…${h.slice(-6)}`;
export const formatWhen = (d) => new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" }).format(d);

// Small inline icons on one 16px grid.
const base = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, className: "icon" };
export const CheckIcon = () => (<svg {...base} width="12" height="12"><path d="M3 8.5l3 3 7-7" /></svg>);
export const AlertIcon = () => (<svg {...base}><path d="M8 2l6.5 11.5h-13L8 2z" /><path d="M8 7v3M8 12v.01" /></svg>);
export const InfoIcon = () => (<svg {...base}><circle cx="8" cy="8" r="6.5" /><path d="M8 7.5V11M8 5v.01" /></svg>);
export const OkIcon = () => (<svg {...base}><circle cx="8" cy="8" r="6.5" /><path d="M5 8.5l2 2 4-4.5" /></svg>);
export const ClockIcon = () => (<svg {...base}><circle cx="8" cy="8" r="6.5" /><path d="M8 4.5V8l2.5 1.5" /></svg>);
export const DotIcon = () => (<svg {...base}><circle cx="8" cy="8" r="6.5" /></svg>);
export const PrintIcon = () => (<svg {...base}><path d="M4.5 6V2h7v4M4.5 12H2.5V6h11v6h-2M4.5 9.5h7V14h-7z" /></svg>);
export const ArrowLeftIcon = () => (<svg {...base}><path d="M13 8H3M7 4L3 8l4 4" /></svg>);

// kind: ok | warn | err | info. Always has an icon and text, so color is never the only signal.
export function Notice({ kind = "info", children, role, className = "" }) {
  const Icon = kind === "ok" ? OkIcon : kind === "info" ? InfoIcon : AlertIcon;
  return (
    <div className={`notice ${kind} enter ${className}`} role={role}>
      <Icon />
      <div className="body">{children}</div>
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

// Copy buttons save people from selecting long codes by hand.
export function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked; the full value stays on screen */
    }
  }
  return (
    <button type="button" className="copy no-print" onClick={copy} aria-label={`Copy ${label}`}>
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

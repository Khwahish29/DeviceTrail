import { useState } from "react";

export const shortAddr = (a) => `${a.slice(0, 6)}...${a.slice(-4)}`;

export function Spinner() {
  return <span className="spinner" />;
}

export function Logo() {
  return (
    <span className="logo">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="2" width="12" height="20" rx="3" />
        <path d="M10 18h4" />
      </svg>
    </span>
  );
}

// Copy buttons save users from selecting long hex strings by hand.
export function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard can be blocked; ignore */
    }
  }
  return (
    <button type="button" className="btn ghost" onClick={copy}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

import { useEffect, useState } from "react";
import { Wordmark } from "./Brand.jsx";

const LINKS = [
  { href: "#/check", label: "Check a device", match: (r) => r.name === "home" && (!r.target || r.target === "check") },
  { href: "#/how", label: "How it works", match: (r) => r.name === "home" && r.target === "how" },
  { href: "#/partners", label: "For manufacturers", match: (r) => r.name === "partners" },
];

export default function Header({ route, wallet, connecting, onSignIn, onSignOut }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const routeKey = JSON.stringify(route);

  // A hairline appears only once the page has scrolled, so the bar blends into the top of the page.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [routeKey]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const partner = wallet ? (
    <span className="partner-state">
      <span>Signed in · {wallet.role === "None" ? "No role" : wallet.role}</span>
      <button className="text-link" onClick={onSignOut}>Sign out</button>
    </span>
  ) : (
    <button className="text-link" onClick={onSignIn} disabled={connecting}>{connecting ? "Signing in…" : "Partner sign in"}</button>
  );

  return (
    <header className={`topbar ${scrolled ? "scrolled" : ""}`}>
      <div className="topbar-inner">
        <a href="#/" className="brand" aria-label="DeviceTrail home"><Wordmark /></a>
        <nav className="nav" aria-label="Main">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} aria-current={l.match(route) ? "page" : undefined}>{l.label}</a>
          ))}
        </nav>
        <div className="partner">{partner}</div>
        <button className="menu-btn" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M4 4l12 12M16 4L4 16" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
          </svg>
        </button>
      </div>
      <div id="mobile-menu" className={`mobile-menu ${open ? "open" : ""}`}>
        <nav aria-label="Mobile">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} aria-current={l.match(route) ? "page" : undefined}>{l.label}</a>
          ))}
          <div className="mobile-partner">{partner}</div>
        </nav>
      </div>
    </header>
  );
}

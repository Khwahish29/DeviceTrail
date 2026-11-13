// A device outline with a short trail of steps inside it: the product in one small mark.
export function Mark({ size = 28 }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" className="mark-bg" />
      <rect x="8.5" y="6" width="15" height="20" rx="3.5" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M12.5 21l3-3.5 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <Mark /> <span className="wordmark-text">Device<span>Trail</span></span>
    </span>
  );
}

// Restrained product-style composition: a laptop showing an abstract report. Shapes only, no text or data.
export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 480 380" role="img" aria-label="Illustration of a laptop showing a device report with a progress track">
      <rect width="480" height="380" rx="16" className="a-tint" />
      <circle cx="420" cy="330" r="90" className="a-tint2" />
      <circle cx="50" cy="40" r="60" className="a-tint2" />
      <path d="M40 282h400l-18 24H58z" className="a-body" />
      <rect x="200" y="282" width="80" height="6" rx="3" className="a-line" />
      <rect x="70" y="52" width="340" height="224" rx="14" className="a-body" />
      <rect x="96" y="78" width="130" height="14" rx="7" className="a-ink" />
      <rect x="96" y="102" width="84" height="10" rx="5" className="a-soft" />
      <rect x="300" y="76" width="86" height="26" rx="8" className="a-ok" />
      <path d="M318 89l5 5 9-10" className="a-check" />
      <line x1="112" y1="168" x2="368" y2="168" className="a-track" />
      <line x1="112" y1="168" x2="268" y2="168" className="a-track-done" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={112 + i * 51.2} cy="168" r={i === 3 ? 11 : 9} className={i < 3 ? "a-node-done" : i === 3 ? "a-node-now" : "a-node"} />
      ))}
      <rect x="96" y="208" width="200" height="10" rx="5" className="a-soft" />
      <rect x="96" y="230" width="150" height="10" rx="5" className="a-soft" />
      <rect x="318" y="208" width="68" height="32" rx="8" className="a-tint" />
      <circle cx="414" cy="62" r="30" className="a-badge-ring" />
      <circle cx="414" cy="62" r="24" className="a-badge" />
      <path d="M404 63l7 7 12-14" className="a-check" />
    </svg>
  );
}

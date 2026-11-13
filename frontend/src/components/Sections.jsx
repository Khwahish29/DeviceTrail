import { Logo } from "./ui.jsx";

const STEPS = [
  ["1", "Register", "The manufacturer records the device on the blockchain with a unique product ID."],
  ["2", "Transfer custody", "Each hand-off, from distributor to refurbisher to retailer, is logged permanently."],
  ["3", "Refurbish & inspect", "Repairs are recorded and certified by an inspector. Report hashes are stored on-chain."],
  ["4", "Verify", "Buyers look up the product ID and see the full, tamper-proof history."],
];

export function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-head">
          <div className="kicker">How it works</div>
          <h2>One trusted record from factory to buyer</h2>
          <p>Every stakeholder adds to the same history, and nobody can quietly change it.</p>
        </div>
        <div className="steps-grid">
          {STEPS.map(([n, title, text]) => (
            <div className="feature" key={n}>
              <div className="num">{n}</div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <div className="brand"><Logo /> DeviceTrail</div>
            <p>Blockchain-based provenance for refurbished electronics. Built for CSE 540, Team 5.</p>
          </div>
          <div className="footer-links">
            <a href="#verify">Verify</a>
            <a href="#how">How it works</a>
            <a href="#register">Register</a>
          </div>
        </div>
        <div className="footer-bottom">© 2026 DeviceTrail. Running on a local test network.</div>
      </div>
    </footer>
  );
}

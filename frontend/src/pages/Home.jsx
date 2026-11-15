import { HeroArt } from "../components/Brand.jsx";
import ReportView from "../components/ReportView.jsx";
import SearchBox from "../components/SearchBox.jsx";
import CheckReport from "../components/CheckReport.jsx";
import { SAMPLE_DEVICE, SAMPLE_PARTS } from "../sampleReport.js";

const STEPS = [
  ["Find the device ID", "It is printed on the label on the device, and it is also in the QR code."],
  ["Enter it above", "Type or paste the ID into the search box and choose Check device."],
  ["Read the report", "See the device’s model, where it is in its journey and which kind of company holds it now."],
];

const GUIDE = [
  ["Status", "The stage the device is in right now, in plain words."],
  ["Journey so far", "Stages the device has already passed are filled in. The highlighted one is where it is now."],
  ["Currently held by", "The kind of company that has the device at the moment, such as a retailer."],
  ["Repairs", "Each repair that was recorded, what was done and which kind of company did it."],
  ["Inspections", "Whether an independent inspector certified the device, and the ID of their report."],
  ["Check a report", "If you were given an inspection report file, choose it here to see whether it matches the record."],
  ["History", "Everything that was recorded about the device, in order, written in plain words."],
  ["Share this report", "A QR code that opens the report on a phone. It can be printed for the device label."],
  ["Report checked", "The date and time you looked, so you know how fresh the report is."],
];

const FAQ = [
  ["What is a device ID?", "A short code that identifies one specific device. It is printed on the device label and in its QR code. No two devices share an ID."],
  ["What if my device is not found?", "Check the ID for typos, since letters such as O and 0 can look alike. If it is still not found, the manufacturer may not have added it yet, so ask the seller. A missing report does not prove a device is fake, but it is worth asking for an explanation before you buy."],
  ["Who can add records?", "Only approved partner companies. Each partner has a role, such as manufacturer or refurbisher, and can only add the kind of record that role allows. Buyers can only read reports."],
  ["Can records be changed?", "Records cannot be quietly edited or deleted. When something changes, an approved partner adds a newer record, and the report shows the latest one."],
];

export default function Home() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1 id="hero-title">Know the history of a refurbished device before you buy it.</h1>
            <p className="hero-lede">Every device gets a report: what it is, where it is in its journey and which company holds it now. Enter the device ID to see it.</p>
            <SearchBox inputId="device-id-input" hiddenLabel helper="You can find the ID on the device label or in its QR code." />
          </div>
          <div className="hero-visual"><HeroArt /></div>
        </div>
      </section>

      <section className="section" id="sample" aria-labelledby="sample-title">
        <div className="container">
          <div className="section-head">
            <h2 id="sample-title">What you will see in a report</h2>
            <p>Every report has the same sections. This one is a sample, so you know what to look for.</p>
          </div>
          <div className="sample-grid">
            <ReportView device={SAMPLE_DEVICE} sample {...SAMPLE_PARTS} check={<CheckReport sample inspections={SAMPLE_PARTS.inspections} />} share={<p className="muted">A QR code for the device appears here. Scan it with a phone to open the report, or print it for the device label.</p>} />
            <aside className="guide" aria-labelledby="guide-title">
              <h3 id="guide-title">How to read it</h3>
              <dl>
                {GUIDE.map(([term, text]) => (
                  <div key={term}><dt>{term}</dt><dd>{text}</dd></div>
                ))}
              </dl>
            </aside>
          </div>
        </div>
      </section>

      <section className="section tinted" id="how" aria-labelledby="how-title">
        <div className="container how-grid">
          <div>
            <h2 id="how-title">How it works</h2>
            <ol className="steps-timeline">
              {STEPS.map(([title, text]) => (
                <li key={title}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
          <aside className="trust" aria-labelledby="trust-title">
            <h3 id="trust-title">How we keep records trustworthy</h3>
            <p>Records are stored on a shared public ledger that no single company can edit.</p>
            <p>Partners along the way add what they are responsible for, and what has been recorded stays on the report.</p>
          </aside>
        </div>
      </section>

      <section className="section" id="faq" aria-labelledby="faq-title">
        <div className="container faq-grid">
          <div>
            <h2 id="faq-title">Common questions</h2>
            <p className="faq-more">Are you a manufacturer? <a href="#/partners">Register devices from the partner page.</a></p>
          </div>
          <div className="faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

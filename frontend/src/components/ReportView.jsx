import { HOLDER_FALLBACK, STAGES, STAGE_TONE } from "../labels.js";
import { AlertIcon, CheckIcon, ClockIcon, CopyButton, DotIcon, OkIcon, article, formatWhen, shortHash, shortId, whenText } from "./ui.jsx";
import { Mark } from "./Brand.jsx";

function StatusBadge({ status }) {
  const tone = STAGE_TONE[status];
  const Icon = tone === "ok" ? OkIcon : tone === "warn" ? ClockIcon : DotIcon;
  return <span className={`status ${tone}`}><Icon /> {STAGES[status]}</span>;
}

function Track({ current }) {
  return (
    <ol className="track" aria-label="Where this device is in its journey">
      {STAGES.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        return (
          <li key={label} className={`stage ${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="node">{state === "done" && <CheckIcon />}</span>
            <span className="stage-label">
              {label}
              <span className="sr-only"> ({state === "done" ? "completed" : state === "current" ? "current stage" : "not reached yet"})</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// One part of the report. It shows its own skeleton or error, so one failing part never hides the rest.
// part = { state: "loading" | "ready" | "error", data, retry }
function Part({ id, title, part, empty, children }) {
  return (
    <section className="report-section" aria-labelledby={id}>
      <h2 id={id} className="section-label">{title}</h2>
      {part.state === "loading" && (
        <div className="part-skeleton skeleton" aria-hidden="true">
          <div className="bar" style={{ width: "70%" }} />
          <div className="bar" style={{ width: "45%" }} />
        </div>
      )}
      {part.state === "loading" && <span className="sr-only">Loading</span>}
      {part.state === "error" && (
        <p className="part-error">
          <AlertIcon /> We couldn’t load this part of the report.{" "}
          <button className="text-link no-print" onClick={part.retry}>Try again</button>
        </p>
      )}
      {part.state === "ready" && (part.data.length === 0 ? <p className="muted">{empty}</p> : children(part.data))}
    </section>
  );
}

// One layout for real reports and the sample on the home page, so the sample is honest about what you get.
// `check` and `share` are the "Check a report" and "Share this report" contents, supplied by the caller because they need the device ID.
export default function ReportView({ device, sample = false, repairs, inspections, history, check, share }) {
  // The sample sits inside the home page, which already has its own h1. Ids are prefixed to stay unique there.
  const Title = sample ? "h3" : "h1";
  const p = sample ? "s-" : "";
  return (
    <article className={`report ${sample ? "is-sample" : ""}`} aria-label={sample ? "Sample device report" : `Device report for ${device.id}`}>
      {sample && <div className="sample-strip">Sample report. This is not a real device.</div>}
      <header className="report-head">
        <div className="report-brand"><Mark size={20} /> <span>Device report</span></div>
        <div className="report-checked">
          <span className="label">Report checked</span>
          <span>{sample ? "Date and time of your check" : formatWhen(device.checkedAt)}</span>
        </div>
      </header>

      <div className="report-title">
        <Title className="report-model">{device.model}</Title>
        <div className="report-id">
          <span className="label">Device ID</span>
          <span className="mono">{device.id}</span>
          {!sample && <CopyButton text={device.id} label="device ID" />}
        </div>
        <StatusBadge status={device.status} />
      </div>

      <section className="report-section" aria-labelledby={`${p}journey`}>
        <h2 id={`${p}journey`} className="section-label">Journey so far</h2>
        <Track current={device.status} />
      </section>

      <section className="report-section" aria-labelledby={`${p}held`}>
        <h2 id={`${p}held`} className="section-label">Currently held by</h2>
        <div className="held">
          <span className="held-role">{device.holderRole && device.holderRole !== "None" ? device.holderRole : HOLDER_FALLBACK}</span>
          <span className="mono" title={sample ? undefined : device.holder}>{shortId(device.holder)}</span>
          {!sample && <CopyButton text={device.holder} label="holder ID" />}
        </div>
      </section>

      <Part id={`${p}repairs`} title="Repairs" part={repairs} empty="No repairs recorded.">
        {(list) => (
          <ul className="records">
            {list.map((r, i) => (
              <li key={i}>
                <div className="rec-title">{r.description}</div>
                <div className="rec-meta">Done by {article(r.company)} · {whenText(r.when)}</div>
              </li>
            ))}
          </ul>
        )}
      </Part>

      <Part id={`${p}inspections`} title="Inspections" part={inspections} empty="Not inspected yet.">
        {(list) => (
          <ul className="records">
            {list.map((r, i) => (
              <li key={i}>
                <div className="rec-title">Certified by {article(r.company)}</div>
                <div className="rec-meta">{whenText(r.when)}</div>
                <div className="rec-id">
                  <span className="label">Report ID</span>
                  <span className="mono" title={sample ? undefined : r.reportId}>{shortHash(r.reportId)}</span>
                  {!sample && <CopyButton text={r.reportId} label="report ID" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Part>

      <section className="report-section" aria-labelledby={`${p}check`}>
        <h2 id={`${p}check`} className="section-label">Check a report</h2>
        {check}
      </section>

      <Part id={`${p}history`} title="History" part={history} empty="No history recorded yet.">
        {(list) => (
          <ol className="history">
            {list.map((ev) => (
              <li key={ev.key}>
                <div className="h-title">{ev.title}</div>
                {ev.detail && <div className="h-detail">{ev.detail}</div>}
                {ev.when && <div className="h-when">{whenText(ev.when)}</div>}
              </li>
            ))}
          </ol>
        )}
      </Part>

      <section className="report-section" aria-labelledby={`${p}share`}>
        <h2 id={`${p}share`} className="section-label">Share this report</h2>
        {share}
      </section>

      <footer className="report-foot">This report shows the latest recorded information for this device.</footer>
    </article>
  );
}

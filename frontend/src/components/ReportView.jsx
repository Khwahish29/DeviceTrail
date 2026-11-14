import { HOLDER_FALLBACK, STAGES, STAGE_TONE } from "../labels.js";
import { CheckIcon, ClockIcon, CopyButton, DotIcon, OkIcon, formatWhen, shortId } from "./ui.jsx";
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

// One layout for real reports and the sample on the home page, so the sample is honest about what you get.
export default function ReportView({ device, sample = false }) {
  // The sample sits inside the home page, which already has its own h1.
  const Title = sample ? "h3" : "h1";
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

      <section className="report-section" aria-labelledby={sample ? "s-journey" : "journey"}>
        <h2 id={sample ? "s-journey" : "journey"} className="section-label">Journey so far</h2>
        <Track current={device.status} />
      </section>

      <section className="report-section" aria-labelledby={sample ? "s-held" : "held"}>
        <h2 id={sample ? "s-held" : "held"} className="section-label">Currently held by</h2>
        <div className="held">
          <span className="held-role">{device.holderRole && device.holderRole !== "None" ? device.holderRole : HOLDER_FALLBACK}</span>
          <span className="mono" title={sample ? undefined : device.holder}>{shortId(device.holder)}</span>
          {!sample && <CopyButton text={device.holder} label="holder ID" />}
        </div>
      </section>

      <footer className="report-foot">This report shows the latest recorded information for this device.</footer>
    </article>
  );
}

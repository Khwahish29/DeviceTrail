import { useEffect, useRef, useState } from "react";
import { CONTRACT_ADDRESS } from "../config.js";
import { ZeroAddress } from "ethers";
import { isNotFound, readDevice } from "../lib/records.js";
import ReportView from "../components/ReportView.jsx";
import SearchBox from "../components/SearchBox.jsx";
import { ArrowLeftIcon, Notice, PrintIcon } from "../components/ui.jsx";

function Skeleton() {
  return (
    <div className="report skeleton" aria-hidden="true">
      <div className="report-head"><div className="bar" style={{ width: "30%" }} /><div className="bar" style={{ width: "25%" }} /></div>
      <div className="report-title">
        <div className="bar" style={{ width: "55%", height: "var(--sp-5)" }} />
        <div className="bar" style={{ width: "40%" }} />
        <div className="bar" style={{ width: "28%", height: "var(--sp-4)" }} />
      </div>
      <div className="report-section"><div className="bar" style={{ width: "100%", height: "var(--sp-6)" }} /></div>
      <div className="report-section"><div className="bar" style={{ width: "45%" }} /></div>
    </div>
  );
}

export default function DeviceReport({ id, onTech }) {
  const [state, setState] = useState({ kind: "loading" }); // loading | found | notfound | error
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0); // ignore a slow earlier answer if a newer request started

  useEffect(() => {
    const n = ++latest.current;
    setState({ kind: "loading" });
    readDevice(id)
      .then((device) => n === latest.current && setState({ kind: "found", device }))
      .catch((err) => {
        if (n !== latest.current) return;
        if (isNotFound(err)) return setState({ kind: "notfound" });
        // Raw details go to the footer's Technical details, not to the buyer.
        onTech({
          lastError: CONTRACT_ADDRESS === ZeroAddress ? "Contract address is not set in src/config.js." : err.shortMessage || err.message,
          connectionFailed: true,
        });
        setState({ kind: "error" });
      });
  }, [id, attempt]);

  return (
    <div className="container page-device">
      <div className="report-actions no-print">
        <a className="back" href="#/check"><ArrowLeftIcon /> Check another device</a>
        {state.kind === "found" && (
          <button className="btn secondary" onClick={() => window.print()}><PrintIcon /> Print or save as PDF</button>
        )}
      </div>

      <div aria-live="polite" aria-busy={state.kind === "loading"}>
        {state.kind === "loading" && <Skeleton />}
        {state.kind === "found" && <ReportView device={state.device} />}

        {state.kind === "notfound" && (
          <section className="problem" aria-labelledby="nf-title">
            <h1 id="nf-title">We couldn’t find a device with the ID “{id}”.</h1>
            <p>This usually means the ID has a typo, or the device has not been added yet.</p>
            <ul>
              <li>Check the ID against the label on the device or its QR code.</li>
              <li>Letters such as O and 0, or I and 1, can look alike.</li>
              <li>If it still isn’t found, ask the seller to confirm the ID.</li>
            </ul>
            <SearchBox initial={id} inputId="retry-id-input" button="Try again" />
          </section>
        )}

        {state.kind === "error" && (
          <section className="problem" aria-labelledby="err-title">
            <h1 id="err-title">We couldn’t load this report right now.</h1>
            <p>Nothing is wrong with the ID. The report service did not respond. Please try again in a moment.</p>
            <button className="btn" onClick={() => setAttempt(attempt + 1)}>Try again</button>
          </section>
        )}
      </div>
    </div>
  );
}

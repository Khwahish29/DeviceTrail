import { useId, useState } from "react";
import { fingerprintOf, reportMatches } from "../lib/records.js";
import { AlertIcon, Notice, Spinner } from "./ui.jsx";

const MAX_BYTES = 50 * 1024 * 1024; // inspection reports are small; this just stops a huge file freezing the page

// "Check a report": the buyer picks the report file they were given, and we compare its fingerprint
// with the recorded inspections. The file is read in the browser and never uploaded.
export default function CheckReport({ deviceId, inspections, onTech, sample = false }) {
  const inputId = useId();
  const [check, setCheck] = useState(null); // { kind: "working" | "match" | "nomatch" | "toobig" | "error", name }

  const noneRecorded = inspections?.state === "ready" && inspections.data.length === 0;

  async function onPick(e) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setCheck({ kind: "toobig", name: file.name });
      input.value = "";
      return;
    }
    setCheck({ kind: "working", name: file.name });
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const matches = await reportMatches(deviceId, fingerprintOf(bytes));
      setCheck({ kind: matches ? "match" : "nomatch", name: file.name });
    } catch (err) {
      onTech?.({ lastError: err.shortMessage || err.message });
      setCheck({ kind: "error", name: file.name });
    }
    input.value = ""; // lets the same file be checked again
  }

  if (noneRecorded) {
    return <p className="muted">There is no inspection on record yet, so there is nothing to compare a file with.</p>;
  }

  const working = check?.kind === "working";
  return (
    <div className={`check ${check && check.kind !== "working" ? "has-result" : ""}`}>
      <p className="muted">
        Were you given an inspection report file? Choose it here to see whether it matches what was recorded.
      </p>
      <div className="file-pick-row no-print">
        <label className={`btn secondary file-pick ${sample || working ? "is-disabled" : ""}`} htmlFor={inputId}>
          {working && <Spinner />}
          {working ? "Checking…" : "Choose report file"}
        </label>
        <input id={inputId} className="file-input" type="file" onChange={onPick} disabled={sample || working} />
        {check?.name && <span className="file-name">{check.name}</span>}
      </div>
      <p className="helper">The file never leaves your device. Only a fingerprint of it is compared with the record.</p>

      <div aria-live="polite">
        {check?.kind === "match" && <Notice kind="ok"><strong>This file matches the recorded inspection.</strong></Notice>}
        {check?.kind === "nomatch" && (
          <Notice kind="err">
            <strong>This file does not match the record.</strong> It may have been edited, or it may belong to a different device.
          </Notice>
        )}
        {check?.kind === "toobig" && <Notice kind="warn">That file is too large to check here. Reports are usually much smaller than 50 MB.</Notice>}
        {check?.kind === "error" && (
          <Notice kind="warn"><AlertIcon /> We couldn’t check this file right now. Please try again in a moment.</Notice>
        )}
      </div>
    </div>
  );
}

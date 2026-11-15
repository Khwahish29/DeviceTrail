import { useCallback, useEffect, useRef, useState } from "react";
import { CONTRACT_ADDRESS } from "../config.js";
import { readDevice, readHistory, readInspections, readRepairs, readSnapshot } from "../lib/records.js";
import { ACTORS, BLOCKED, STEPS, loadDemoAccounts, newDeviceId, nextStepIndex, reportText, revertReason, sendAs } from "../lib/demo.js";
import { useAsync } from "../lib/useAsync.js";
import ReportView from "../components/ReportView.jsx";
import CheckReport from "../components/CheckReport.jsx";
import ShareReport from "../components/ShareReport.jsx";
import { CheckIcon, InfoIcon, Notice, Spinner, shortId } from "../components/ui.jsx";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Who does what, in one glance. Accounts are the local test accounts, one per role.
const WHO = [
  [1, "Registers devices and starts the shipment."],
  [2, "Carries the device to the refurbisher."],
  [3, "Repairs the device and moves it through refurbishing."],
  [4, "Independently certifies the inspection report."],
  [5, "Puts the device on sale and sells it."],
  [6, "Has no role. Used to show what is refused."],
];

// The buyer's view of the same device, refreshed after every action. It is the real report page.
function LiveDemoReport({ id, version }) {
  const keep = { keep: true };
  const device = useAsync(() => readDevice(id), [id, version], null, keep);
  const repairs = useAsync(() => readRepairs(id), [id, version], null, keep);
  const inspections = useAsync(() => readInspections(id), [id, version], null, keep);
  const history = useAsync(() => readHistory(id), [id, version], null, keep);
  if (device.state !== "ready") return <div className="report skeleton" aria-hidden="true"><div className="report-section"><div className="bar" style={{ width: "60%" }} /><div className="bar" style={{ width: "40%" }} /></div></div>;
  return (
    <ReportView
      device={device.data}
      repairs={repairs}
      inspections={inspections}
      history={history}
      check={<CheckReport deviceId={id} inspections={inspections} />}
      share={<ShareReport deviceId={id} />}
    />
  );
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Demo() {
  const [setup, setSetup] = useState({ state: "checking" }); // checking | ready | problem
  const [deviceId, setDeviceId] = useState(newDeviceId);
  const [snap, setSnap] = useState(null);
  const [version, setVersion] = useState(0);
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const stopRef = useRef(false);
  const accounts = setup.addresses;

  useEffect(() => {
    let live = true;
    loadDemoAccounts().then((r) => live && setSetup(r.ok ? { state: "ready", addresses: r.addresses } : { state: "problem", ...r }));
    return () => { live = false; };
  }, []);

  const refresh = useCallback(async (id) => {
    try {
      setSnap(await readSnapshot(id));
      setVersion((v) => v + 1);
    } catch (err) {
      setError(`Could not read the device: ${err.shortMessage || err.message}`);
    }
  }, []);

  useEffect(() => {
    if (setup.state !== "ready" || !deviceId.trim()) return;
    const t = setTimeout(() => refresh(deviceId.trim()), 250);
    return () => clearTimeout(t);
  }, [deviceId, setup.state, refresh]);

  const id = deviceId.trim();
  const next = snap ? nextStepIndex(snap) : 0;
  const finished = next >= STEPS.length;

  const addLog = (entry) => setLog((l) => [{ key: crypto.randomUUID?.() ?? String(Math.random()), at: new Date(), ...entry }, ...l]);

  // Sends the actions of one step as the right account(s). Stops at the first refusal.
  async function runStep(index) {
    const step = STEPS[index];
    for (const a of step.actions({ id, accounts })) {
      try {
        const r = await sendAs(a.actor, a.fn, a.args);
        addLog({ kind: "ok", actor: ACTORS[a.actor], fn: a.fn, note: a.note, hash: r.hash, gas: r.gas });
      } catch (err) {
        addLog({ kind: "unexpected", actor: ACTORS[a.actor], fn: a.fn, note: a.note, reason: revertReason(err) });
        throw err;
      }
    }
    await refresh(id);
  }

  async function onRunNext() {
    setBusy(true); setError(null);
    try { await runStep(next); } catch { /* shown in the log */ }
    setBusy(false);
  }

  async function onRunAll() {
    setBusy(true); setError(null); stopRef.current = false;
    try {
      let i = next;
      while (i < STEPS.length && !stopRef.current) {
        await runStep(i);
        i = nextStepIndex(await readSnapshot(id));
        await sleep(900);
      }
    } catch { /* shown in the log */ }
    setBusy(false);
  }

  async function onBlocked(b) {
    setBusy(true); setError(null);
    const a = b.action({ id, accounts, snap });
    try {
      await sendAs(a.actor, a.fn, a.args);
      addLog({ kind: "unexpected", actor: ACTORS[a.actor], fn: a.fn, note: b.title, reason: "This was allowed, which is not expected." });
      await refresh(id);
    } catch (err) {
      addLog({ kind: "blocked", actor: ACTORS[a.actor], fn: a.fn, note: b.title, reason: revertReason(err), expect: b.expect });
    }
    setBusy(false);
  }

  function startNew() {
    setLog([]); setSnap(null); setError(null);
    setDeviceId(newDeviceId());
  }

  // ---------- setup problems ----------
  if (setup.state === "checking") {
    return <div className="container page-demo"><p className="muted" role="status"><Spinner /> Checking the demo setup…</p></div>;
  }
  if (setup.state === "problem") {
    const msg = {
      chain: "The page can’t reach the local test chain. Start it with npm run node, then deploy with npm run deploy:local.",
      accounts: "The chain doesn’t have the 7 test accounts the demo needs. Start it with npm run node (the default Hardhat node).",
      roles: "The test accounts don’t have their roles yet. Run npm run deploy:local, which assigns them.",
    }[setup.problem];
    return (
      <div className="container page-demo">
        <h1>Workflow demo</h1>
        <Notice kind="warn" role="alert"><strong>Demo setup needed.</strong> {msg}</Notice>
        <p className="muted">Also check that the contract address in <span className="mono">src/config.js</span> matches the one the deploy printed ({shortId(CONTRACT_ADDRESS)}).</p>
        <button className="btn secondary" onClick={() => { setSetup({ state: "checking" }); loadDemoAccounts().then((r) => setSetup(r.ok ? { state: "ready", addresses: r.addresses } : { state: "problem", ...r })); }}>Check again</button>
      </div>
    );
  }

  return (
    <div className="container page-demo">
      <header className="demo-head">
        <h1>Workflow demo</h1>
        <p className="lede">
          Follow one laptop from the factory to a buyer. Each step is sent as the right company’s account, the contract decides whether it is allowed,
          and the buyer’s report on the right updates as it happens.
        </p>
        <p className="demo-status"><span className="badge ok">Demo mode</span> Local test network. The accounts below sign for themselves, so no wallet is needed.</p>
      </header>

      <section aria-labelledby="who-title" className="demo-who">
        <h2 id="who-title" className="section-label">Who does what</h2>
        <dl>
          {WHO.map(([i, text]) => (
            <div key={i}>
              <dt>{ACTORS[i]} <span className="mono" title={accounts[i]}>{shortId(accounts[i])}</span></dt>
              <dd>{text}</dd>
            </div>
          ))}
          <div><dt>Buyer</dt><dd>Reads and verifies the report. No account needed.</dd></div>
        </dl>
      </section>

      <div className="demo-grid">
        <div className="demo-left">
          <div className="demo-device">
            <label htmlFor="demo-id" className="label">Demo device ID</label>
            <div className="demo-device-row">
              <input id="demo-id" className="input id-input has-value" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} spellCheck="false" autoComplete="off" disabled={busy} />
              <button className="btn secondary" onClick={startNew} disabled={busy}>New device</button>
            </div>
          </div>

          {error && <Notice kind="err" role="alert">{error}</Notice>}

          <h2 className="demo-h2">The workflow</h2>
          <ol className="flow">
            {STEPS.map((s, i) => {
              const state = i < next ? "done" : i === next && !finished ? "current" : "upcoming";
              return (
                <li key={s.title} className={`flow-step ${state}`} aria-current={state === "current" ? "step" : undefined}>
                  <span className="flow-mark">{state === "done" ? <CheckIcon /> : i + 1}</span>
                  <div className="flow-body">
                    <div className="flow-title">
                      {s.title}
                      <span className="actor">{s.role}</span>
                      <span className="sr-only">{state === "done" ? " (done)" : state === "current" ? " (next step)" : ""}</span>
                    </div>
                    <code className="code">{s.signature}</code>
                    <p className="flow-why">{s.why}</p>
                    {state === "current" && (
                      <button className="btn" onClick={onRunNext} disabled={busy}>
                        {busy && <Spinner />}
                        {busy ? "Sending…" : `Run as ${s.role}`}
                      </button>
                    )}
                    {i === 6 && snap?.inspections > 0 && (
                      <div className="flow-files">
                        <span className="muted">Try these in the report’s “Check a report” box:</span>
                        <button className="btn secondary sm" onClick={() => download(`report-${id}.txt`, reportText(id))}>Download genuine report</button>
                        <button className="btn secondary sm" onClick={() => download(`report-${id}-edited.txt`, reportText(id, true))}>Download edited copy</button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {finished ? (
            <Notice kind="ok"><strong>The device has been sold.</strong> The history is complete. Use “New device” to run the demo again.</Notice>
          ) : (
            <div className="demo-run-all">
              <button className="btn secondary" onClick={onRunAll} disabled={busy}>Run all remaining steps</button>
              <span className="muted">Plays the rest automatically, about one step per second.</span>
            </div>
          )}

          <section aria-labelledby="blocked-title" className="demo-blocked">
            <h2 id="blocked-title" className="demo-h2">Try to break the rules</h2>
            <p className="muted">Each button tries something forbidden. The contract should refuse it, and nothing changes.</p>
            <ul>
              {BLOCKED.map((b) => {
                const can = snap && b.available(snap);
                return (
                  <li key={b.title}>
                    <div>
                      <div className="flow-title">{b.title} <span className="actor">{b.role}</span></div>
                      <p className="flow-why">{b.why}</p>
                      {!can && <p className="helper">{b.whenNot}</p>}
                    </div>
                    <button className="btn secondary sm" onClick={() => onBlocked(b)} disabled={busy || !can}>Try it</button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="log-title" className="demo-log">
            <h2 id="log-title" className="demo-h2">What was sent</h2>
            {log.length === 0 ? (
              <p className="muted">Nothing yet. Run the first step.</p>
            ) : (
              <ol aria-live="polite">
                {log.map((e) => (
                  <li key={e.key} className={e.kind}>
                    <div className="log-top">
                      <span className={`badge ${e.kind === "ok" ? "ok" : e.kind === "blocked" ? "warn" : "err"}`}>
                        {e.kind === "ok" ? "Confirmed" : e.kind === "blocked" ? "Blocked, as expected" : "Failed"}
                      </span>
                      <span><strong>{e.actor}</strong> · <code className="code">{e.fn}</code></span>
                      <span className="muted log-time">{e.at.toLocaleTimeString()}</span>
                    </div>
                    <div>{e.note}</div>
                    {e.reason && <div className="muted">Contract said: “{e.reason}”</div>}
                    {e.hash && <div className="muted mono">gas {e.gas.toLocaleString()} · tx {e.hash.slice(0, 10)}…{e.hash.slice(-6)}</div>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="demo-right" aria-labelledby="buyer-title">
          <h2 id="buyer-title" className="demo-h2">What a buyer sees</h2>
          {snap?.exists ? (
            <LiveDemoReport key={id} id={id} version={version} />
          ) : (
            <div className="demo-placeholder">
              <InfoIcon />
              <p>Nothing to show yet. Run step 1 to register the device, and its report appears here.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

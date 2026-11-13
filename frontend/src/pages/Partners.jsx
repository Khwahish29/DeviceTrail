import { useId, useState } from "react";
import { Contract } from "ethers";
import { ABI, CONTRACT_ADDRESS } from "../config.js";
import { deviceHref } from "../router.js";
import { CheckIcon, Notice, Spinner } from "../components/ui.jsx";

const STEPS = ["Confirm in your wallet", "Saving", "Done"];

// Turns a wallet or contract failure into one plain sentence that says what to do next.
function explain(err, id) {
  if (err.code === "ACTION_REJECTED") return { kind: "info", text: "You cancelled in your wallet, so nothing was saved." };
  const reason = err.reason || err.revert?.args?.[0] || err.info?.error?.message || err.shortMessage || err.message || "";
  if (/already registered/i.test(reason)) return { kind: "warn", text: `A device with the ID “${id}” is already registered. Use a different device ID.` };
  if (/wrong role/i.test(reason)) return { kind: "warn", text: "This account is not allowed to register devices. Sign in with a manufacturer account." };
  if (/empty product/i.test(reason)) return { kind: "warn", text: "The device ID is empty. Enter an ID and try again." };
  return { kind: "err", text: "We couldn’t save this device. Please try again. If it keeps happening, see Technical details at the bottom of the page.", reason };
}

export default function Partners({ wallet, wrongNetwork, connecting, connectError, onSignIn, onSwitchNetwork, onTech }) {
  const idField = useId();
  const modelField = useId();
  const [deviceId, setDeviceId] = useState("");
  const [model, setModel] = useState("");
  const [tx, setTx] = useState(null); // { step: 0 wallet | 1 saving | 2 done, id }
  const [message, setMessage] = useState(null);

  const isManufacturer = wallet?.role === "Manufacturer";
  const busy = tx && tx.step < 2;
  const ready = deviceId.trim() && model.trim();

  async function submit(e) {
    e.preventDefault();
    setMessage(null);
    const id = deviceId.trim();
    try {
      setTx({ step: 0, id });
      const sent = await new Contract(CONTRACT_ADDRESS, ABI, wallet.signer).registerProduct(id, model.trim());
      onTech({ lastTx: sent.hash });
      setTx({ step: 1, id });
      await sent.wait();
      setTx({ step: 2, id });
      setDeviceId("");
      setModel("");
    } catch (err) {
      setTx(null);
      const m = explain(err, id);
      if (m.reason) onTech({ lastError: m.reason });
      setMessage(m);
    }
  }

  return (
    <div className="container page-partners">
      <div className="partners-head">
        <h1>For manufacturers</h1>
        <p className="lede">Register a device so buyers can check its report. Partner accounts only.</p>
      </div>

      {connectError && <Notice kind="err" role="alert">{connectError}</Notice>}

      {!wallet && (
        <section className="panel" aria-labelledby="signin-title">
          <h2 id="signin-title">Partner sign in</h2>
          <p>Sign in with your partner account to register devices. You will be asked to approve in your wallet. This does not cost anything.</p>
          <button className="btn" onClick={onSignIn} disabled={connecting}>
            {connecting && <Spinner />}
            {connecting ? "Signing in…" : "Sign in with your wallet"}
          </button>
        </section>
      )}

      {wallet && (
        <>
          <p className="signed-row">
            <span>Signed in as</span> <span className={`badge ${isManufacturer ? "ok" : ""}`}>{wallet.role === "None" ? "No role assigned" : wallet.role}</span>
          </p>

          {wrongNetwork && (
            <Notice kind="warn" role="alert">
              Your wallet is connected to a different network than DeviceTrail uses.
              <div><button className="btn secondary sm" onClick={onSwitchNetwork}>Switch network</button></div>
            </Notice>
          )}

          {/* On the wrong network the role cannot be read, so say nothing about it until the network is fixed. */}
          {!isManufacturer && !wrongNetwork && (
            <section className="panel" aria-labelledby="role-title">
              <h2 id="role-title">Only manufacturers can register devices</h2>
              <p>
                {wallet.role === "None" || wallet.role === "Unknown"
                  ? "This account has not been given a partner role yet."
                  : `This account is signed in as a ${wallet.role}, which can’t register new devices.`}{" "}
                To register devices, switch to your manufacturer account in your wallet and sign in again.
              </p>
              <p className="muted">Need a manufacturer role? Ask the DeviceTrail administrator to assign one to your account.</p>
            </section>
          )}

          {isManufacturer && (
            <section className="panel" aria-labelledby="reg-title">
              <h2 id="reg-title">Register a device</h2>
              <p className="muted">Registers this device so it can be checked by buyers. You become its first holder.</p>
              <form onSubmit={submit} noValidate>
                <div className="field">
                  <label htmlFor={idField}>Device ID</label>
                  <input id={idField} className="input id-input has-value" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="e.g. SN-1001" disabled={busy} autoComplete="off" spellCheck="false" />
                  <p className="help">Must be unique. It is printed on the device label and cannot be changed later.</p>
                </div>
                <div className="field">
                  <label htmlFor={modelField}>Model</label>
                  <input id={modelField} className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Laptop 14-inch, 16 GB" disabled={busy} autoComplete="off" />
                  <p className="help">The name buyers will see at the top of the report.</p>
                </div>
                <button className="btn" disabled={!ready || busy || wrongNetwork}>
                  {busy && <Spinner />}
                  {busy ? "Saving…" : "Register device"}
                </button>
                {wrongNetwork && <p className="help">Switch network above to continue.</p>}
              </form>

              <div aria-live="polite">
                {tx && (
                  <ol className="steps" aria-label="Progress">
                    {STEPS.map((label, i) => {
                      const done = i < tx.step || tx.step === 2;
                      return (
                        <li key={label} className={done ? "done" : i === tx.step ? "active" : ""}>
                          <span className="mark-dot">{done && <CheckIcon />}</span>
                          {label}
                          <span className="sr-only">{done ? " (done)" : i === tx.step ? " (in progress)" : ""}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
                {tx?.step === 2 && (
                  <Notice kind="ok">
                    <strong>Saved.</strong> “{tx.id}” is registered. <a href={deviceHref(tx.id)}>View the report</a>
                  </Notice>
                )}
                {message && <Notice kind={message.kind}>{message.text}</Notice>}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

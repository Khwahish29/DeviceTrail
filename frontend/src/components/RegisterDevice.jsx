import { useState } from "react";
import { Contract } from "ethers";
import { ABI, CONTRACT_ADDRESS } from "../config.js";
import { CopyButton, Spinner } from "./ui.jsx";

// Pulls the Solidity revert message out of an ethers error so users see "Product already registered".
function readableError(e) {
  return e.reason || e.revert?.args?.[0] || e.info?.error?.message || e.shortMessage || e.message;
}

const STEPS = ["Confirm in your wallet", "Transaction is being mined", "Device registered"];

// Manufacturer portal section: explanation on the left, the form on the right.
export default function RegisterDevice({ wallet, wrongNetwork, onConnect, onRegistered }) {
  const [productId, setProductId] = useState("");
  const [model, setModel] = useState("");
  const [tx, setTx] = useState(null); // { step: 0 wallet | 1 pending | 2 done, hash, id }
  const [error, setError] = useState(null);
  const [cancelled, setCancelled] = useState(false);

  const isManufacturer = wallet?.role === "Manufacturer" && !wrongNetwork;
  const busy = tx && tx.step < 2;
  const ready = productId.trim() && model.trim();

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setCancelled(false);
    const id = productId.trim();
    try {
      setTx({ step: 0, id });
      const sent = await new Contract(CONTRACT_ADDRESS, ABI, wallet.signer).registerProduct(id, model.trim());
      setTx({ step: 1, id, hash: sent.hash });
      await sent.wait();
      setTx({ step: 2, id, hash: sent.hash });
      setProductId("");
      setModel("");
      onRegistered(id);
    } catch (err) {
      setTx(null);
      // Cancelling in the wallet is a choice, not a failure, so it gets a neutral message.
      if (err.code === "ACTION_REJECTED") setCancelled(true);
      else setError(readableError(err));
    }
  }

  return (
    <section className="section soft" id="register">
      <div className="container portal">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="kicker">For manufacturers</div>
          <h2>Register devices at the source</h2>
          <p>Every device starts its trail with you. Registering writes the device to the ledger and makes you its first custodian.</p>
          <ul className="checks">
            <li>Only accounts with the Manufacturer role can register</li>
            <li>Duplicate product IDs are rejected automatically</li>
            <li>The record is permanent and publicly verifiable</li>
          </ul>
        </div>

        <div className="form-card">
          <h3>Register a device</h3>
          <p className="sub">Enter the details exactly as they appear on the device label.</p>

          {!wallet && (
            <div className="banner info">
              <span>Connect your wallet to register devices.</span>
              <button className="btn ghost" onClick={onConnect}>Connect Wallet</button>
            </div>
          )}
          {wallet && wrongNetwork && <div className="banner warn">Switch to the Hardhat local network to register devices.</div>}
          {wallet && !wrongNetwork && wallet.role !== "Manufacturer" && (
            <div className="banner warn">
              This account is <strong>{wallet.role}</strong>. Only a Manufacturer can register devices. Switch accounts in MetaMask.
            </div>
          )}

          <form onSubmit={submit}>
            <label>
              Product ID
              <input className="field" value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="e.g. SN-1001" disabled={busy} />
            </label>
            <label>
              Model
              <input className="field" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Phone X" disabled={busy} />
            </label>
            <button className="btn lg full" disabled={!isManufacturer || !ready || busy}>
              {busy && <Spinner />}
              {busy ? "Working..." : "Register device"}
            </button>
          </form>

          {tx && (
            <ol className="tx-steps">
              {STEPS.map((label, i) => {
                const done = i < tx.step || tx.step === 2;
                return (
                  <li key={label} className={done ? "done" : i === tx.step ? "active" : ""}>
                    <span className="mark">{done ? "✓" : ""}</span>
                    {label}
                  </li>
                );
              })}
            </ol>
          )}
          {tx?.hash && (
            <div style={{ marginTop: 14 }}>
              <div className="label">Transaction hash</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className="mono">{tx.hash}</span>
                <CopyButton text={tx.hash} />
              </div>
            </div>
          )}
          {tx?.step === 2 && <div className="banner ok">Device “{tx.id}” is registered. Scroll up to see its record.</div>}
          {cancelled && <div className="banner info">Cancelled in the wallet. Nothing was sent.</div>}
          {error && <div className="banner err">{error}</div>}
        </div>
      </div>
    </section>
  );
}

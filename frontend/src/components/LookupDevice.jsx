import { useEffect, useState } from "react";
import { Contract, JsonRpcProvider } from "ethers";
import { ABI, CONTRACT_ADDRESS, RPC_URL, STATUS_NAMES } from "../config.js";
import { CopyButton, Spinner } from "./ui.jsx";

// Read-only, so it uses its own RPC provider and works without a wallet.
const provider = new JsonRpcProvider(RPC_URL);

// Hero: the verify search is the main action of the site; the result card overlaps the hero's bottom edge.
export default function LookupDevice({ wallet, requestedId }) {
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { id, product } | { notFound, id } | { error }

  async function lookup(id) {
    id = id.trim();
    if (!id) return;
    setLoading(true);
    setResult(null);
    try {
      const p = await new Contract(CONTRACT_ADDRESS, ABI, provider).getProduct(id);
      setResult({ id, product: { model: p.model, custodian: p.currentCustodian, status: Number(p.status) } });
    } catch (err) {
      // The contract reverts for unknown IDs; any other failure is a connection or config problem.
      const reason = err.reason || err.revert?.args?.[0];
      setResult(
        reason === "Product not found"
          ? { notFound: true, id }
          : { error: "Could not reach the contract. Check that the local node is running and the address in config.js is correct." }
      );
    }
    setLoading(false);
  }

  // Lets the register form (or a QR link like ?id=SN-1001) open a device directly.
  useEffect(() => {
    if (requestedId) {
      setProductId(requestedId);
      lookup(requestedId);
      document.getElementById("verify")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [requestedId]);

  const p = result?.product;
  return (
    <>
      <section className="hero" id="verify">
        <div className="container">
          <span className="eyebrow">⛓ Verified on the blockchain</span>
          <h1>The full story of every device, <span>verified.</span></h1>
          <p className="lead">
            DeviceTrail records who made a device, who has held it and how it was refurbished, so buyers can trust what
            they are buying.
          </p>
          <form className="search" onSubmit={(e) => { e.preventDefault(); lookup(productId); }}>
            <input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="Enter a product ID, e.g. SN-1001" aria-label="Product ID" />
            <button className="btn lg" disabled={!productId.trim() || loading}>
              {loading && <Spinner />}
              {loading ? "Checking..." : "Verify device"}
            </button>
          </form>
          <p className="hint">No wallet needed. Anyone can verify a device.</p>
        </div>
      </section>

      {(result || loading) && (
        <div className="container result-wrap">
          {result?.error && (
            <div className="state-card">
              <span className="icon" style={{ background: "var(--err-bg)" }}>!</span>
              <div><strong>Something went wrong</strong><div className="muted">{result.error}</div></div>
            </div>
          )}
          {result?.notFound && (
            <div className="state-card">
              <span className="icon" style={{ background: "var(--warn-bg)" }}>?</span>
              <div>
                <strong>No device found for “{result.id}”</strong>
                <div className="muted">Check the ID on the device label or QR code and try again.</div>
              </div>
            </div>
          )}
          {p && (
            <div className="result">
              <div className="result-head">
                <div>
                  <div className="label">Device</div>
                  <h2>{p.model}</h2>
                  <span className="muted mono">ID: {result.id}</span>
                </div>
                <span className="pill ok">✓ Verified on-chain</span>
              </div>
              <div className="result-cols">
                <div>
                  <div className="fact">
                    <div className="label">Current custodian</div>
                    <div className="row">
                      <span className="mono">{p.custodian}</span>
                      <CopyButton text={p.custodian} />
                      {wallet && wallet.address.toLowerCase() === p.custodian.toLowerCase() && <span className="pill">You</span>}
                    </div>
                  </div>
                  <div className="fact">
                    <div className="label">Status</div>
                    <span className="pill">{STATUS_NAMES[p.status]}</span>
                  </div>
                </div>
                <div>
                  <div className="label">Lifecycle</div>
                  <ol className="timeline">
                    {STATUS_NAMES.map((name, i) => (
                      <li key={name} className={i < p.status ? "done" : i === p.status ? "current" : ""}>{name}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

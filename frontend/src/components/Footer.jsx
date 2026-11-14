import { CONTRACT_ADDRESS, HARDHAT_CHAIN_ID, RPC_URL } from "../config.js";
import { ZeroAddress } from "ethers";
import { Wordmark } from "./Brand.jsx";
import { CopyButton } from "./ui.jsx";

// Developer information lives here, collapsed, so buyers never see it in the main flow.
export default function Footer({ tech, techOpen, onTechToggle, wallet }) {
  const notSet = CONTRACT_ADDRESS === ZeroAddress;
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Wordmark />
          <p>Check where a refurbished device has been before you buy it.</p>
        </div>
        <nav className="footer-col" aria-label="Product">
          <h2>Product</h2>
          <a href="#/check">Check a device</a>
          <a href="#/how">How it works</a>
          <a href="#/sample">Sample report</a>
          <a href="#/faq">Questions</a>
        </nav>
        <nav className="footer-col" aria-label="For manufacturers">
          <h2>For manufacturers</h2>
          <a href="#/partners">Partner sign in</a>
          <a href="#/partners">Register a device</a>
        </nav>
        <div className="footer-col">
          <h2>About</h2>
          <p>Built as a CSE 540 course project (Team 5).</p>
        </div>
      </div>

      <div className="footer-inner footer-tech">
        <details id="technical" open={techOpen} onToggle={(e) => onTechToggle(e.currentTarget.open)}>
          <summary>Technical details</summary>
          <dl>
            <div><dt>Network</dt><dd>Local test network (chain {HARDHAT_CHAIN_ID.toString()})</dd></div>
            <div><dt>Records service</dt><dd className="mono">{RPC_URL}</dd></div>
            <div>
              <dt>Contract address</dt>
              <dd>{notSet ? "Not set. Add the deployed address to CONTRACT_ADDRESS in src/config.js." : <><span className="mono">{CONTRACT_ADDRESS}</span> <CopyButton text={CONTRACT_ADDRESS} label="contract address" /></>}</dd>
            </div>
            {wallet && <div><dt>Signed-in account</dt><dd className="mono">{wallet.address}</dd></div>}
            {tech.lastTx && <div><dt>Last transaction</dt><dd><span className="mono">{tech.lastTx}</span> <CopyButton text={tech.lastTx} label="transaction hash" /></dd></div>}
            {tech.lastError && <div><dt>Last error</dt><dd className="mono">{tech.lastError}</dd></div>}
          </dl>
        </details>
      </div>
    </footer>
  );
}

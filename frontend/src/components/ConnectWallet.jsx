import { HARDHAT_CHAIN_ID } from "../config.js";
import { shortAddr, Spinner } from "./ui.jsx";

// Nav-bar wallet control: connect, then show role + address, with a way to disconnect.
export default function ConnectWallet({ wallet, connecting, onConnect, onDisconnect }) {
  if (!wallet) {
    return (
      <button className="btn" onClick={onConnect} disabled={connecting}>
        {connecting && <Spinner />}
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }
  const wrongNetwork = wallet.chainId !== HARDHAT_CHAIN_ID;
  return (
    <div className="wallet">
      <span className={`pill hide-sm ${wrongNetwork ? "warn" : "ok"}`}>
        <span className="dot" />
        {wrongNetwork ? "Wrong network" : "Hardhat local"}
      </span>
      <span className="pill hide-sm">{wallet.role}</span>
      <span className="pill mono" title={wallet.address}>{shortAddr(wallet.address)}</span>
      <button className="btn ghost" onClick={onDisconnect}>Disconnect</button>
    </div>
  );
}

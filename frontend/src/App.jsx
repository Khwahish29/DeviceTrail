import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import { ABI, CONTRACT_ADDRESS, HARDHAT_CHAIN_ID, ROLE_NAMES } from "./config.js";
import ConnectWallet from "./components/ConnectWallet.jsx";
import RegisterDevice from "./components/RegisterDevice.jsx";
import LookupDevice from "./components/LookupDevice.jsx";
import { HowItWorks, Footer } from "./components/Sections.jsx";
import { Logo } from "./components/ui.jsx";

// Hex chain id in the format MetaMask expects for switching networks.
const HARDHAT_HEX = "0x" + HARDHAT_CHAIN_ID.toString(16);

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);
  // Set by the register form or a ?id= link; the lookup card reacts to it.
  const [requestedId, setRequestedId] = useState(new URLSearchParams(window.location.search).get("id") || "");

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setConnectError("MetaMask not found. Install the MetaMask extension to register devices.");
      return;
    }
    setConnecting(true);
    setConnectError(null);
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      // A wrong network or address makes getRole fail, so treat that as an unknown role.
      let role = "Unknown";
      try {
        role = ROLE_NAMES[Number(await new Contract(CONTRACT_ADDRESS, ABI, provider).getRole(address))];
      } catch {
        setConnectError("Could not read your role. Check the network and the contract address in config.js.");
      }
      setWallet({ signer, address, chainId: network.chainId, role });
    } catch (e) {
      if (e.code !== "ACTION_REJECTED") setConnectError(e.shortMessage || e.message);
    }
    setConnecting(false);
  }, []);

  // Keep the UI right when the user switches account or network inside MetaMask.
  useEffect(() => {
    if (!window.ethereum || !wallet) return;
    const refresh = () => connect();
    window.ethereum.on("accountsChanged", refresh);
    window.ethereum.on("chainChanged", refresh);
    return () => {
      window.ethereum.removeListener("accountsChanged", refresh);
      window.ethereum.removeListener("chainChanged", refresh);
    };
  }, [wallet, connect]);

  async function switchNetwork() {
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HARDHAT_HEX }] });
    } catch {
      setConnectError("Could not switch automatically. Add the network in MetaMask: RPC http://127.0.0.1:8545, chain id 31337.");
    }
  }

  const wrongNetwork = Boolean(wallet) && wallet.chainId !== HARDHAT_CHAIN_ID;

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <a href="#verify" className="brand"><Logo /> DeviceTrail</a>
          <nav className="nav-links">
            <a href="#verify">Verify</a>
            <a href="#how">How it works</a>
            <a href="#register">Register</a>
          </nav>
          <ConnectWallet wallet={wallet} connecting={connecting} onConnect={connect} onDisconnect={() => setWallet(null)} />
        </div>
      </header>

      {wrongNetwork && (
        <div className="netbar">
          <div className="container">
            <span>You are on chain {wallet.chainId.toString()}. DeviceTrail runs on Hardhat local (chain id 31337).</span>
            <button className="btn ghost" onClick={switchNetwork}>Switch network</button>
          </div>
        </div>
      )}
      {connectError && (
        <div className="container"><div className="banner err">{connectError}</div></div>
      )}

      <main>
        <LookupDevice wallet={wallet} requestedId={requestedId} />
        <HowItWorks />
        <RegisterDevice wallet={wallet} wrongNetwork={wrongNetwork} onConnect={connect} onRegistered={setRequestedId} />
      </main>
      <Footer />
    </>
  );
}

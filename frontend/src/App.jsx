import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract, ZeroAddress } from "ethers";
import { ABI, CONTRACT_ADDRESS, HARDHAT_CHAIN_ID, ROLE_NAMES } from "./config.js";
import { useRoute } from "./router.js";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import DeviceReport from "./pages/DeviceReport.jsx";
import Partners from "./pages/Partners.jsx";

// Hex chain id in the format MetaMask expects for switching networks.
const HARDHAT_HEX = "0x" + HARDHAT_CHAIN_ID.toString(16);

// Old links like /?id=SN-1001 still work: send them to the report page.
(function redirectLegacyLink() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (id && !window.location.hash) window.location.replace(`${window.location.pathname}#/device/${encodeURIComponent(id)}`);
})();

export default function App() {
  const route = useRoute();
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [tech, setTech] = useState({}); // developer details for the footer panel: lastError, lastTx, connectionFailed
  const [techOpen, setTechOpen] = useState(false);
  const addTech = useCallback((patch) => setTech((t) => ({ ...t, ...patch })), []);

  // Returns true when sign-in worked, so the header link can move on to the partner page.
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setConnectError("We couldn’t find a wallet in this browser. Install the MetaMask extension, then try again.");
      return false;
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
      } catch (e) {
        addTech({ lastError: `Could not read the account role: ${e.shortMessage || e.message}` });
      }
      setWallet({ signer, address, chainId: network.chainId, role });
      setConnecting(false);
      return true;
    } catch (e) {
      if (e.code !== "ACTION_REJECTED") {
        setConnectError("We couldn’t sign you in. Please try again.");
        addTech({ lastError: e.shortMessage || e.message });
      }
    }
    setConnecting(false);
    return false;
  }, [addTech]);

  // Keep the page right when the partner switches account or network inside their wallet.
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

  // Go to the partner page first so progress and any error (for example no wallet installed) are visible there.
  async function signIn() {
    if (route.name !== "partners") window.location.hash = "#/partners";
    await connect();
  }

  async function switchNetwork() {
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HARDHAT_HEX }] });
    } catch (e) {
      setConnectError("We couldn’t switch networks automatically. Switch to the DeviceTrail test network in your wallet, then sign in again.");
      addTech({ lastError: e.shortMessage || e.message });
    }
  }

  const wrongNetwork = Boolean(wallet) && wallet.chainId !== HARDHAT_CHAIN_ID;
  const routeKey = JSON.stringify(route);

  // Page title and scroll position follow the route, like a normal multi-page site.
  useEffect(() => {
    document.title =
      route.name === "device" ? `Device report ${route.id} | DeviceTrail`
      : route.name === "partners" ? "For manufacturers | DeviceTrail"
      : "DeviceTrail | Check a refurbished device before you buy";
    if (route.name === "home" && route.target) {
      const el = document.getElementById(route.target === "check" ? "device-id-input" : route.target);
      el?.scrollIntoView({ block: route.target === "check" ? "center" : "start" });
      if (route.target === "check") el?.focus({ preventScroll: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [routeKey]);

  const needsSetup = CONTRACT_ADDRESS === ZeroAddress || tech.connectionFailed;
  function showTechnical() {
    setTechOpen(true);
    setTimeout(() => document.getElementById("technical")?.scrollIntoView({ block: "center" }), 0);
  }

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Header route={route} wallet={wallet} connecting={connecting} onSignIn={signIn} onSignOut={() => setWallet(null)} />

      {needsSetup && (
        <div className="setup-banner no-print" role="status">
          Setup needed: the report service isn’t connected yet.{" "}
          <button className="text-link" onClick={showTechnical}>Show technical details</button>
        </div>
      )}

      <main id="main">
        {route.name === "home" && <Home />}
        {route.name === "device" && <DeviceReport key={route.id} id={route.id} onTech={addTech} />}
        {route.name === "partners" && (
          <Partners wallet={wallet} wrongNetwork={wrongNetwork} connecting={connecting} connectError={connectError}
            onSignIn={connect} onSwitchNetwork={switchNetwork} onTech={addTech} />
        )}
      </main>

      <Footer tech={tech} techOpen={techOpen} onTechToggle={setTechOpen} wallet={wallet} />
    </>
  );
}

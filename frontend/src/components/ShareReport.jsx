import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CopyButton } from "./ui.jsx";

// Same rule as Meet's QR generator (qr/generate.js): only these characters can be turned into a QR code.
const QR_SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;

// The link a QR code opens: <this site>/?productId=<id>, the same format Meet's generator writes.
// The site turns it into the report page (#/device/<id>).
export function reportLink(id) {
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set("productId", id);
  return url.toString();
}

const onThisComputerOnly = () => ["localhost", "127.0.0.1", ""].includes(window.location.hostname);

export default function ShareReport({ deviceId }) {
  const [image, setImage] = useState(null); // data URL of the QR PNG
  const canMake = QR_SAFE_ID.test(deviceId);
  const link = reportLink(deviceId);

  useEffect(() => {
    if (!canMake) return;
    let live = true;
    // Same settings as Meet's generator: 400px wide, 2-module margin, medium error correction.
    QRCode.toDataURL(link, { width: 400, margin: 2, errorCorrectionLevel: "M" })
      .then((url) => live && setImage(url))
      .catch(() => live && setImage(null));
    return () => { live = false; };
  }, [link, canMake]);

  if (!canMake) {
    return <p className="muted">This ID can’t be turned into a QR code. QR codes support letters, digits and the characters “.”, “_” and “-” (up to 64).</p>;
  }

  return (
    <div className="share">
      <div className="share-qr">
        {image ? (
          <img src={image} width="160" height="160" alt={`QR code that opens the report for device ${deviceId}`} />
        ) : (
          <div className="share-qr-placeholder skeleton" aria-hidden="true"><div className="bar" /></div>
        )}
      </div>
      <div className="share-info">
        <p className="muted">Scan this code with a phone camera to open this report. You can also print it for the device label.</p>
        <div className="share-link">
          <span className="mono" title={link}>{link}</span>
          <CopyButton text={link} label="report link" />
        </div>
        {image && (
          <a className="btn secondary no-print" href={image} download={`${deviceId}.png`}>Download QR code</a>
        )}
        {onThisComputerOnly() && (
          <p className="helper no-print">This link only opens on this computer. To scan it with a phone, open this site using your computer’s network address first (see the README).</p>
        )}
      </div>
    </div>
  );
}

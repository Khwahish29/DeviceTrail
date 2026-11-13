// Plain-language wording for buyers. Index order matches the Status enum in IDeviceTrail.
export const STAGES = ["Registered", "In transit", "Being refurbished", "Inspected", "Available for sale", "Sold"];

// Badge tone per stage: in progress is amber, ready for sale is green, the two ends are neutral.
export const STAGE_TONE = ["", "warn", "warn", "ok", "ok", ""];

export const HOLDER_FALLBACK = "Unlisted holder";

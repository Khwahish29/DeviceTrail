// Clearly labelled sample data. It only shows what a real report contains and is never read from the records.
const ready = (data) => ({ state: "ready", data });
const SAMPLE_DATE = "Sample date";

export const SAMPLE_DEVICE = { id: "SAMPLE-0001", model: "Sample laptop 14\"", holder: "0x1234567890abcdef1234567890abcdef1234abcd", holderRole: "Retailer", status: 4 };

export const SAMPLE_PARTS = {
  repairs: ready([
    { description: "Sample repair: replaced the battery", company: "Refurbisher", when: SAMPLE_DATE },
    { description: "Sample repair: replaced the keyboard", company: "Refurbisher", when: SAMPLE_DATE },
  ]),
  inspections: ready([{ reportId: "0x9f2c4be1a07d33c85e19f0b6a41b", company: "Inspector", when: SAMPLE_DATE }]),
  history: ready([
    { key: "1", title: "Registered", detail: "by a Manufacturer", when: SAMPLE_DATE },
    { key: "2", title: "Changed hands", detail: "From a Manufacturer to a Distributor", when: SAMPLE_DATE },
    { key: "3", title: "Repair recorded", detail: "Sample repair: replaced the battery", when: SAMPLE_DATE },
    { key: "4", title: "Inspection certified", detail: "by an Inspector · sample report ID", when: SAMPLE_DATE },
    { key: "5", title: "Status changed to Available for sale", detail: "", when: SAMPLE_DATE },
  ]),
};

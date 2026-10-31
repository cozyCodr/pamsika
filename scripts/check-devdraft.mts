const base = (process.env.DEVDRAFT_BASE_URL || "https://api.devdraft.ai") + "/api/v0";
const headers = { "x-client-key": process.env.DEVDRAFT_CLIENT_KEY!, "x-client-secret": process.env.DEVDRAFT_CLIENT_SECRET!, accept: "application/json" };
for (const path of ["/health", "/balance", "/webhooks", "/products", "/payment-links"]) {
  const res = await fetch(base + path, { headers });
  const text = await res.text();
  console.log(path, res.status, text.slice(0, 600).replace(/0x[0-9a-fA-F]{20,}/g, "0x…"));
}

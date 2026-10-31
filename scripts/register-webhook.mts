// Usage: npm run webhook:register -- https://<your-tunnel-host>
const base = (process.env.DEVDRAFT_BASE_URL || "https://api.devdraft.ai") + "/api/v0";
const publicUrl = (process.argv[2] || process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
const secret = process.env.DEVDRAFT_WEBHOOK_SECRET;

if (!publicUrl.startsWith("https://")) {
  console.error("Pass the public HTTPS tunnel URL, e.g. npm run webhook:register -- https://pamsika.trycloudflare.com");
  process.exit(1);
}
if (!secret) {
  console.error("DEVDRAFT_WEBHOOK_SECRET is missing from .env.local");
  process.exit(1);
}

const res = await fetch(`${base}/webhooks`, {
  method: "POST",
  headers: {
    "x-client-key": process.env.DEVDRAFT_CLIENT_KEY!,
    "x-client-secret": process.env.DEVDRAFT_CLIENT_SECRET!,
    "content-type": "application/json",
    accept: "application/json",
  },
  body: JSON.stringify({ name: "Pamsika payments", url: `${publicUrl}/api/devdraft/webhook`, isActive: true, encrypted: false, signing_secret: secret }),
});
const text = await res.text();
console.log(res.status, text.slice(0, 500));
if (!res.ok) process.exit(1);

import http from "node:http";
import { URL } from "node:url";

const TZ = "America/Los_Angeles";

function ptISO(now = new Date()) {
  // Format PT clock in local wall time
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  const ptNaive = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;

  // Compute numeric offset like -07:00 / -08:00
  const ptNow = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  const offsetMin = Math.round((ptNow.getTime() - now.getTime()) / 60000); // negative in PT
  const sign = offsetMin <= 0 ? "-" : "+";
  const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
  const mm = String(Math.abs(offsetMin) % 60).padStart(2, "0");
  const offset = `${sign}${hh}:${mm}`;

  return `${ptNaive}${offset}`;
}

function abbrPT(now = new Date()) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "short" })
    .formatToParts(now).find(p => p.type === "timeZoneName");
  return part?.value || "PT";
}

const server = http.createServer((req, res) => {
  const now = new Date();

  // Health endpoint for Fly smoke check
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  // Always ensure a cache-busting query (?t=nonce)
  const url = new URL(req.url, "http://localhost");
  if (!url.searchParams.get("t")) {
    const nonce = Math.random().toString(36).slice(2, 10);
    url.searchParams.set("t", nonce);
    res.statusCode = 302;
    res.setHeader("Location", url.toString());
    res.setHeader("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("pragma", "no-cache");
    res.setHeader("expires", "0");
    res.end("redirecting");
    return;
  }

  const body =
`PT_ISO=${ptISO(now)}
UTC_ISO=${now.toISOString()}
ABBR=${abbrPT(now)}
EPOCH_MS=${now.getTime()}
`;

  res.writeHead(200, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    "pragma": "no-cache",
    "expires": "0",
    "surrogate-control": "no-store",
    "cdn-cache-control": "no-store",
    "vary": "*"
  });
  res.end(body);
});

const port = Number(process.env.PORT || 8080);
// bind explicitly to 0.0.0.0 for Fly
server.listen(port, "0.0.0.0", () => {
  console.log(`listening on ${port}`);
});

import http from "node:http";
import { URL } from "node:url";

const TZ = "America/Los_Angeles";

function ptISO(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  const ptNaive =
    `${parts.year}-${parts.month}-${parts.day}` +
    `T${parts.hour}:${parts.minute}:${parts.second}`;

  const ptNow = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  const offsetMin = Math.round((ptNow.getTime() - now.getTime()) / 60000);
  const sign = offsetMin <= 0 ? "-" : "+";
  const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
  const mm = String(Math.abs(offsetMin) % 60).padStart(2, "0");
  return `${ptNaive}${sign}${hh}:${mm}`;
}

function abbrPT(now = new Date()) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "short" })
    .formatToParts(now).find(p => p.type === "timeZoneName");
  return part?.value || "PT";
}

function noStoreHeaders(extra = {}) {
  return {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0, private, no-transform",
    "pragma": "no-cache",
    "expires": "0",
    "surrogate-control": "no-store",
    "cdn-cache-control": "no-store",
    "vary": "*",
    "date": new Date().toUTCString(),
    ...extra,
  };
}

const server = http.createServer((req, res) => {
  const now = new Date();
  const u = new URL(req.url, "http://example"); // parse only

  // health
  if (u.pathname === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  // if not on /pt/<nonce>, redirect to a unique path
  const m = u.pathname.match(/^\/pt\/([a-z0-9]+)$/i);
  if (!m) {
    const nonce = Math.random().toString(36).slice(2, 10);
    const target = `/pt/${nonce}`;
    res.writeHead(302, {
      Location: target,
      ...noStoreHeaders(),
      "etag": `W/"redir-${nonce}-${Date.now()}"`,
    });
    res.end("redirecting");
    return;
  }

  // serve fresh body at /pt/<nonce>
  const body =
`PT_ISO=${ptISO(now)}
UTC_ISO=${now.toISOString()}
ABBR=${abbrPT(now)}
EPOCH_MS=${now.getTime()}
`;

  res.writeHead(200, {
    ...noStoreHeaders(),
    "etag": `W/"pt-${m[1]}-${Date.now()}"`,
  });
  res.end(body);
});

const port = Number(process.env.PORT || 8080);
server.listen(port, "0.0.0.0", () => console.log(`listening on ${port}`));

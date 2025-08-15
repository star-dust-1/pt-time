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
  const ptNaive = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;

  // numeric offset like -07:00 / -08:00
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

const server = http.createServer((req, res) => {
  const now = new Date();

  // parse once
  const parsed = new URL(req.url, "http://example"); // dummy base just for parsing
  const pathname = parsed.pathname;

  // health check works even if someone adds ?foo=bar
  if (pathname === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  // force cache-busting nonce; use a RELATIVE redirect so host stays correct
  if (!parsed.searchParams.get("t")) {
    const nonce = Math.random().toString(36).slice(2, 10);
    parsed.searchParams.set("t", nonce);
    const relative = `${parsed.pathname}?${parsed.searchParams.toString()}`;

    res.writeHead(302, {
      "Location": relative,
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
      "pragma": "no-cache",
      "expires": "0",
    });
    res.end("redirecting");
    return;
  }

  // fresh body
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
    "vary": "*",
  });
  res.end(body);
});

const port = Number(process.env.PORT || 8080);
server.listen(port, "0.0.0.0", () => {
  console.log(`listening on ${port}`);
});

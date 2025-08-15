import http from "node:http";

const TZ = "America/Los_Angeles";

function ptIso(now = new Date()) {
  // Build PT wall-clock (server-side) without changing process TZ
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  const ptNaive = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;

  // Compute numeric offset like -07:00 / -08:00
  const ptNow = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  const offsetMin = Math.round((ptNow - now) / 60000); // negative in PT
  const sign = offsetMin <= 0 ? "-" : "+";
  const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
  const mm = String(Math.abs(offsetMin) % 60).padStart(2, "0");
  const offset = `${sign}${hh}:${mm}`;

  return `${ptNaive}${offset}`;
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/health")) {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  const now = new Date();
  const body =
`PT_ISO=${ptIso(now)}
UTC_ISO=${now.toISOString()}
ABBR=${new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "short" })
        .formatToParts(now).find(p => p.type === "timeZoneName")?.value || "PT"}
EPOCH_MS=${now.getTime()}
`;

  res.writeHead(200, {
    "content-type": "text/plain; charset=utf-8",
    // kill all caches
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    "pragma": "no-cache",
    "expires": "0",
    "surrogate-control": "no-store",
    "cdn-cache-control": "no-store",
    "vary": "*"
  });
  res.end(body);
});

const port = process.env.PORT || 8080;
server.listen(port, () => console.log(`listening on ${port}`));

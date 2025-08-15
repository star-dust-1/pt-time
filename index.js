import express from "express";

const app = express();

// Middleware: auto-append ?t=<random>
app.use((req, res, next) => {
  if (!req.query.t) {
    const nonce = Math.floor(Math.random() * 1e9).toString(36);
    const url = new URL(req.originalUrl, `https://${req.hostname}`);
    url.searchParams.set("t", nonce);
    return res.redirect(302, url.toString());
  }
  next();
});

// Main endpoint: return current Pacific Time
app.get("/", (req, res) => {
  const now = new Date();
  const ptTime = now.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    hour12: false
  });

  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.type("text/plain").send(ptTime);
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

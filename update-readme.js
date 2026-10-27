// Rewrites the stopwatch block at the top of README.md with the current elapsed time.
// Run by GitHub Actions every 5 minutes. Needs Node 18+ (no packages).
const fs = require("fs");

const START_MS = Date.parse("2026-10-28T04:00:00+06:00"); // Bangladesh time, UTC+06:00
const elapsed = Math.max(0, Date.now() - START_MS);

const totalSec = BigInt(Math.floor(elapsed / 1000));      // BigInt: the day count has no limit
const days = totalSec / 86400n;
const rem = Number(totalSec % 86400n);
const h = Math.floor(rem / 3600);
const m = Math.floor((rem % 3600) / 60);
const s = rem % 60;
const pad = n => String(n).padStart(2, "0");

const nowBD = new Date().toLocaleString("en-GB", {
  timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short",
});

const block = [
  "<!--STOPWATCH:START-->",
  "```",
  `   ${days.toLocaleString("en-US")} DAYS  ${pad(h)} HOURS  ${pad(m)} MINUTES  ${pad(s)} SECONDS`,
  "```",
  `<sub>Snapshot taken ${nowBD} (Bangladesh time). For the second-by-second live version, open the live stopwatch above.</sub>`,
  "<!--STOPWATCH:END-->",
].join("\n");

const file = "README.md";
const text = fs.readFileSync(file, "utf8");
const next = text.replace(/<!--STOPWATCH:START-->[\s\S]*?<!--STOPWATCH:END-->/, block);
if (next !== text) fs.writeFileSync(file, next);

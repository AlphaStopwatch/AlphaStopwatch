<div align="center">

# ⏱️ Alpha Infinite Stopwatch

### Running since **28 October 2026, 04:00:00 AM Bangladesh Time**

## 👉 [**Open the Live Stopwatch**](https://alphastopwatch.github.io/AlphaStopwatch/) 👈

*Days · Hours · Minutes · Seconds, and it never stops.*

</div>

> **Why a link and not a ticking clock right here?**
> GitHub does not run JavaScript inside a README, so a README can never tick by itself. The real, live stopwatch is the page linked above (`index.html`, hosted free on GitHub Pages). This README explains everything about it.

---

## Table of Contents

1. [What is this stopwatch?](#1-what-is-this-stopwatch)
2. [Key guarantees](#2-key-guarantees)
3. [How it works](#3-how-it-works)
4. [Infrastructure](#4-infrastructure)
5. [The code, explained](#5-the-code-explained)
6. [How to use it](#6-how-to-use-it)
7. [Possibilities and ideas](#7-possibilities-and-ideas)
8. [Edge cases and how they are handled](#8-edge-cases-and-how-they-are-handled)
9. [FAQ](#9-faq)
10. [Honest limits](#10-honest-limits)

---

## 1. What is this stopwatch?

This is a stopwatch that **counts upward from one fixed moment and never ends**.

- **Start moment:** 28 October 2026, 04:00:00 AM in Bangladesh (Bangladesh Standard Time, UTC+06:00).
- **Units shown:** Days, Hours, Minutes, Seconds. Nothing else.
- **Days are unlimited.** Hours, minutes and seconds roll over normally (seconds 0–59, minutes 0–59, hours 0–23), and every time hours roll past 23 the day counter goes up by one, forever.

A normal stopwatch resets, pauses, or breaks at some limit. This one has no buttons, no pause, no reset. It simply shows how much time has passed since the start moment.

## 2. Key guarantees

| Guarantee | What it means |
|---|---|
| **Infinite days** | The day counter has no upper limit. It uses `BigInt`, so it stays exact for any number of days. |
| **Never stops** | The display keeps updating continuously. If the tab is hidden and shown again, it re-syncs and jumps to the correct value. |
| **No overflow** | The digits are automatically resized so the display always stays inside its box and the screen, however many digits the day count has. |
| **Bangladesh official time** | On load, the stopwatch asks an online time server for the current time in `Asia/Dhaka`. It does **not** read the time from your device clock. |
| **Same for everyone** | Every visitor syncs to the same official time, so everyone anywhere in the world sees the same numbers. |

## 3. How it works

The whole idea is one subtraction:

```
elapsed = (official Bangladesh time now) − (start moment)
```

Then the elapsed time is split into units:

```
total seconds = elapsed / 1000
days    = total seconds ÷ 86400          (whole number, unlimited)
hours   = remainder ÷ 3600               (0–23)
minutes = (remainder % 3600) ÷ 60        (0–59)
seconds = remainder % 60                 (0–59)
```

### Step by step

1. **Page loads.** The stopwatch has no time yet, so it shows "Getting Bangladesh official time…".
2. **Ask the time server.** It requests the current time for `Asia/Dhaka` from an online time API.
3. **Fix the delay.** Network travel takes a moment, so half of the request's round-trip time is added to the answer. This makes the synced time more accurate.
4. **Remember the anchor.** It stores two things: the official time it received, and the browser's internal monotonic timer value (`performance.now()`) at that same instant.
5. **Tick.** Every frame, the current official time is calculated as `anchor time + (performance.now() − anchor timer)`. The monotonic timer only moves forward at a steady rate and **cannot be changed by the user changing their device clock**, so the device clock is never trusted.
6. **Show the result.** Elapsed time is calculated, split into days/hours/minutes/seconds, and drawn on screen.
7. **Re-sync.** Every 5 minutes, and whenever the tab becomes visible again, the stopwatch re-syncs with the official time to remove any drift.

### Time zone note

Bangladesh does not currently use daylight saving time, so Bangladesh Standard Time is UTC+06:00. The start moment `28 Oct 2026 04:00:00 BST` equals `27 Oct 2026 22:00:00 UTC`, and that is the constant stored in the code.

## 4. Infrastructure

Everything here is deliberately simple and free.

```
┌──────────────┐   1. request time (Asia/Dhaka)   ┌─────────────────────┐
│  Visitor's   │ ───────────────────────────────▶ │ Online time server  │
│  browser     │ ◀─────────────────────────────── │ (official time API) │
│ (index.html) │   2. current Bangladesh time     └─────────────────────┘
└──────┬───────┘
       │ 3. anchor + monotonic timer → elapsed → days/hours/min/sec
       ▼
   Live display
```

- **Hosting:** GitHub Pages serves a single static file, `index.html`. No server, no database, no build step.
- **Time sources:** two online sources are tried in order. If the first fails or times out (6 seconds), the second is tried.
  1. `timeapi.io` (zone `Asia/Dhaka`)
  2. `worldtimeapi.org` (zone `Asia/Dhaka`)
- **No device time:** if **no** source can be reached when the page first loads, the stopwatch does **not** fall back to your device clock. It shows a message and keeps retrying every 5 seconds until it gets official time.
- **After the first sync:** if a later re-sync fails, the stopwatch keeps running from the last good sync (using the monotonic timer) and retries every 30 seconds.
- **Dependencies:** none. No libraries, no frameworks, no external fonts or images.

## 5. The code, explained

The whole project is one file: [`index.html`](./index.html). It has three parts: HTML (the four boxes), CSS (the look), and JavaScript (the logic).

### The start moment

```js
// 28 Oct 2026 04:00:00 BST (UTC+6) = 27 Oct 2026 22:00:00 UTC
var START_MS = Date.UTC(2026, 9, 27, 22, 0, 0);
```

JavaScript months start at 0, so `9` means October.

### Getting official time

```js
var SOURCES = [
  { url: "https://timeapi.io/api/Time/current/zone?timeZone=Asia/Dhaka", parse: ... },
  { url: "https://worldtimeapi.org/api/timezone/Asia/Dhaka",             parse: ... }
];
```

Each source has a URL and a small function that turns its answer into milliseconds. `sync()` tries them one by one.

### The anchor and the monotonic clock

```js
anchorServerMs = serverMs + (t1 - t0) / 2;   // official time, corrected for network delay
anchorPerf     = t1;                          // performance.now() at that moment

function officialNow() {
  return anchorServerMs + (performance.now() - anchorPerf);
}
```

This is the heart of "not from the device". The device clock (`Date.now()`) is never used to decide the time.

### Infinite days with BigInt

```js
var totalSec = BigInt(Math.floor(elapsed / 1000));
var days = totalSec / 86400n;          // exact, unlimited size
var rem  = Number(totalSec % 86400n);  // always 0–86399, safe as a normal number
```

`BigInt` has no fixed maximum size, which is what makes the day counter unbounded in code. Only the small remainder is converted back to a normal number for hours, minutes and seconds.

### No overflow: auto-fit

```js
function fit() { ... }
```

Whenever the number of day-digits or the screen width changes, `fit()` recalculates the font size so all four boxes fit in one row. With 10 digits or 10,000 digits of days, nothing crosses the boundary.

### The loop

```js
requestAnimationFrame(render);
```

The browser calls `render()` every frame. The numbers are recalculated from the anchor each time, so the display cannot drift or fall behind.

## 6. How to use it

### Option A: just view it

Open the live link at the top of this page. Nothing to install.

### Option B: host your own copy on GitHub Pages

1. Open the repository on GitHub and make sure `index.html` is in the root folder.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Pick the `main` branch and the `/ (root)` folder, then press **Save**.
5. Wait a minute or two. Your stopwatch will be live at:
   `https://<your-username>.github.io/<repository-name>/`

### Option C: run it on your own computer

1. Download `index.html`.
2. Double-click it to open in any modern browser. An internet connection is required, because the time comes online.

### Option D: change the start moment

Edit one line in `index.html`:

```js
var START_MS = Date.UTC(YEAR, MONTH_MINUS_1, DAY, HOUR_UTC, MINUTE, SECOND);
```

Convert your Bangladesh time to UTC first by **subtracting 6 hours**. Example: 9:30 AM Bangladesh time on 1 January 2027 is 3:30 AM UTC, so use `Date.UTC(2027, 0, 1, 3, 30, 0)`.

### Browser support

Any modern browser from the last several years (Chrome, Edge, Firefox, Safari, and their mobile versions). `BigInt` support is required.

## 7. Possibilities and ideas

The same approach can be used for many things:

- **Anniversary and memorial counters:** days since a special moment, by changing one constant.
- **Streak trackers:** how long since a habit or goal began.
- **Project uptime:** how long a site or experiment has been running.
- **Business milestones:** time since launch day.
- **Shared public clocks:** every visitor syncs to the same official time, so a group sees exactly the same value at the same moment.
- **Embeds:** the page can be embedded in other sites with an `<iframe>` pointing at the Pages link.
- **Other time zones:** change `Asia/Dhaka` in the source URLs and adjust `START_MS` to count from another place's start moment.
- **Different looks:** the counting logic and the styling are separate, so themes, fonts and layouts can change without touching the logic.

## 8. Edge cases and how they are handled

| Situation | What happens |
|---|---|
| Visitor opens the page **before** the start moment | Shows `0 days 00:00:00` until the start moment arrives, then counts. |
| User changes their device clock | No effect. The device clock is not used. |
| Tab is in the background for hours | On return, the stopwatch re-syncs and shows the correct value. |
| Time server is slow | The request times out after 6 seconds, then the next source is tried. |
| All time servers unreachable at first load | Shows a retry message. It does not guess from the device clock. |
| Day count becomes very large | `BigInt` keeps it exact, and `fit()` shrinks the digits to stay inside the screen. |
| Very small phone screens | The layout tightens and digits scale down automatically. |

## 9. FAQ

**Does it really never stop?**
While the page is open, it keeps updating. Closing the page stops the *display*, not the count: when anyone opens it again, it shows the true elapsed time since the start moment.

**Why not use the visitor's device time?**
Device clocks can be wrong or changed on purpose. Official online time keeps every visitor's view identical and accurate.

**How accurate is it?**
Typically within a fraction of a second of official time. Accuracy depends on the time server and the visitor's network delay, and it is corrected every 5 minutes.

**Why do hours, minutes and seconds have limits?**
They follow normal clock rules and roll over. Only days are unlimited, by design.

## 10. Honest limits

- "Infinite" here means **no limit built into the code**. It counts for as long as browsers, GitHub Pages and the time servers exist. No program can literally run forever on its own.
- The stopwatch depends on third-party online time services. If all of them are down when a visitor first opens the page, it waits and retries rather than showing a wrong time.
- GitHub README files cannot run code, so the live ticking display is on the linked Pages site, not inside this file.

---

<div align="center">

**Alpha Infinite Stopwatch** · Counting since 28 October 2026, 04:00 AM Bangladesh Time

</div>

<div align="center">

# ⏱️ Alpha Infinite Stopwatch

<!--STOPWATCH:START-->
```
   0 DAYS  00 HOURS  00 MINUTES  00 SECONDS
```
<sub>Starts 28 Oct 2026, 04:00 AM Bangladesh time. This block refreshes automatically every 5 minutes.</sub>
<!--STOPWATCH:END-->

### 👉 [Open the live stopwatch (updates every second)](https://alphastopwatch.github.io/AlphaStopwatch/)

**Days · Hours · Minutes · Seconds. It never stops. It never overflows. It never ends.**

</div>

---

## 📖 Table of Contents

1. [What is this stopwatch?](#1-what-is-this-stopwatch)
2. [The start moment](#2-the-start-moment)
3. [How it works](#3-how-it-works)
4. [Why it is infinite](#4-why-it-is-infinite)
5. [Why it never overflows](#5-why-it-never-overflows)
6. [Infrastructure: how everything fits together](#6-infrastructure-how-everything-fits-together)
7. [The code, explained piece by piece](#7-the-code-explained-piece-by-piece)
8. [How to use this code yourself](#8-how-to-use-this-code-yourself)
9. [Possibilities and ideas](#9-possibilities-and-ideas)
10. [Frequently asked questions](#10-frequently-asked-questions)
11. [Troubleshooting](#11-troubleshooting)
12. [License](#12-license)

---

## 1. What is this stopwatch?

This is a stopwatch with one purpose: **count time forever**.

An ordinary stopwatch stops at 99:59:59 or 23:59:59, or resets, or has a "stop" button. This one has none of that. It shows exactly four things:

| Unit | Range shown | Behaviour |
|------|-------------|-----------|
| **Days** | 0 → ∞ | Grows without any limit |
| **Hours** | 00 → 23 | Rolls into the next day |
| **Minutes** | 00 → 59 | Rolls into the next hour |
| **Seconds** | 00 → 59 | Rolls into the next minute |

There are no months and no years. Everything above 24 hours is counted in **days**, and the day counter is the part that is infinite.

There is no pause, no reset and no stop button. Once the start moment passes, it counts forward for as long as the web page is open, and it always shows the correct value when you come back.

---

## 2. The start moment

The stopwatch starts at:

> **28 October 2026, 04:00:00 AM, Bangladesh Standard Time (UTC+06:00)**

In code this is one fixed value:

```js
const START_MS = Date.parse("2026-10-28T04:00:00+06:00");
```

Two details matter here:

- The `+06:00` is part of the value, so the start moment is the same for everyone in the world. Someone in London, New York or Tokyo sees the exact same numbers as someone in Dhaka.
- Bangladesh does not use daylight saving time, so `+06:00` never changes.

If someone opens the page **before** the start moment, the stopwatch shows `0 days 00:00:00` and a "waiting" message, then begins counting at 4:00 AM sharp.

---

## 3. How it works

The key idea: **the stopwatch does not count. It calculates.**

A naive stopwatch adds 1 to a variable every second. That goes wrong because browsers slow down background tabs, phones sleep, and every tiny delay adds up as drift. This stopwatch never adds anything. Every tick it does this:

```
elapsed time  =  current time  −  start moment
```

Then it converts the elapsed time into days, hours, minutes and seconds.

### Step by step

1. **Read the clock.** `Date.now()` gives the current time in milliseconds.
2. **Subtract the start.** `Date.now() - START_MS` gives milliseconds elapsed.
3. **Convert to whole seconds.** Divide by 1000 and round down.
4. **Split into units.**
   - `days = totalSeconds ÷ 86400` (whole number)
   - `remainder = totalSeconds mod 86400`
   - `hours = remainder ÷ 3600`
   - `minutes = (remainder mod 3600) ÷ 60`
   - `seconds = remainder mod 60`
5. **Draw the numbers**, adding a leading zero so `7` shows as `07`.
6. **Schedule the next tick** for the start of the next real second.

### Worked example

Suppose 200,000 seconds have passed since the start.

- Days: 200,000 ÷ 86,400 = **2** (whole days)
- Remainder: 200,000 − 2 × 86,400 = 27,200
- Hours: 27,200 ÷ 3,600 = **7**
- Minutes: (27,200 − 7 × 3,600) ÷ 60 = 2,000 ÷ 60 = **33**
- Seconds: 2,000 − 33 × 60 = **20**

Result: **2 days 07 hours 33 minutes 20 seconds.**

### Why calculating beats counting

| Situation | Counting every second | Calculating from the clock |
|-----------|----------------------|----------------------------|
| Tab in the background | Falls behind | Correct instantly on return |
| Phone locked for hours | Wrong | Correct instantly on return |
| Computer sleeps | Wrong | Correct instantly on return |
| Page refreshed | Restarts from zero | Same correct value |
| Slow device | Drifts | No drift |

---

## 4. Why it is infinite

Two things could stop a stopwatch: running out of numbers, or running out of display. Both are handled.

**Numbers.** Normal JavaScript numbers are precise only up to about 9 quadrillion (`9,007,199,254,740,991`). Past that, they silently lose accuracy. The stopwatch therefore keeps the **seconds and the days in `BigInt`**, a JavaScript type that has **no maximum size**. It can hold a number with a thousand digits, or a million, as long as memory exists.

```js
const totalSec = BigInt(Math.floor(elapsedMs / 1000));
const days = totalSec / 86400n;
```

Hours, minutes and seconds are always small (at most 86,399 for the remainder of a day), so ordinary numbers are used for those, and that is safe forever.

**Time itself.** The count comes from the clock, not from a stored value, so there is nothing to run out. As long as the device has a clock, the stopwatch has a value.

> **An honest note:** nothing physical is truly infinite. The page needs a device and a browser to run on, and the browser's built-in date has its own technical upper limit in the far future (year 275,760). Long before any of that matters, nothing in this code limits the day counter. For every practical purpose, it never stops.

---

## 5. Why it never overflows

"Overflow" has two meanings, and both are covered.

### Number overflow

Covered above: `BigInt` has no ceiling, and the small units are mathematically restricted to their ranges by the modulo operator (`%`):

- seconds are always `0–59`
- minutes are always `0–59`
- hours are always `0–23`

Seconds can never become 60, minutes can never become 60, and hours can never become 24. They roll over into the next unit automatically.

### Display overflow

When the day count gets more digits (999 → 1,000 → 1,000,000 → …), the text gets wider. A fixed-size layout would burst out of the screen. Instead, every time the number of digits changes, the code recalculates a font size so everything fits inside the screen width:

```js
function fit(daysText) {
  const vw = Math.min(window.innerWidth, 1100);
  const chars = daysText.length + 6;            // day digits + HH MM SS
  const size = Math.max(14, Math.min(120, (vw * 0.9) / (chars * 0.62 + 3)));
  // apply `size` to every number
}
```

The layout also reacts to window resizing and phone rotation, and uses `min-width: 0` and `white-space: nowrap` so no part of the clock can push beyond its boundary or wrap onto a second line.

---

## 6. Infrastructure: how everything fits together

The project has four moving parts:

```
AlphaStopwatch/
├── index.html                       ← the live stopwatch (HTML + CSS + JS in one file)
├── README.md                        ← this file
├── update-readme.js                 ← small Node script that writes a snapshot into the README
└── .github/workflows/
    └── update-stopwatch.yml         ← GitHub Actions job that runs the script every 5 minutes
```

### Part 1: The live page (`index.html`)

A single static file. No server, no database, no build step, no libraries. GitHub Pages serves it to the world for free. All the maths runs inside the visitor's own browser.

### Part 2: The README snapshot (`update-readme.js` + the workflow)

**Important limit:** GitHub README files cannot run JavaScript. GitHub strips scripts for safety, so a README cannot tick by itself. That is why there are two displays:

| Display | Where | Updates | How |
|---------|-------|---------|-----|
| Snapshot | Top of this README | About every 5 minutes | A GitHub Actions job rewrites the block |
| Live stopwatch | The GitHub Pages site | Every second | The browser calculates it |

The Actions job:

1. Wakes up on a 5-minute schedule (the fastest GitHub allows).
2. Runs `update-readme.js`, which uses the same maths as the live page.
3. Replaces everything between `<!--STOPWATCH:START-->` and `<!--STOPWATCH:END-->` in the README.
4. Commits the change.

GitHub sometimes delays scheduled jobs by a few minutes when it is busy, so treat the README block as "close to now", and the live page as exact.

### Part 3: Time zone handling

Both files use the same `2026-10-28T04:00:00+06:00` value, so they always agree with each other.

---

## 7. The code, explained piece by piece

### The page structure

```html
<div id="clock">
  <div class="unit days"><div class="num" id="d">0</div><div class="label">Days</div></div>
  <div class="unit"><div class="num" id="h">00</div><div class="label">Hours</div></div>
  <div class="unit"><div class="num" id="m">00</div><div class="label">Minutes</div></div>
  <div class="unit"><div class="num" id="s">00</div><div class="label">Seconds</div></div>
</div>
```

Four boxes, each with a number and a label. Days comes first and is allowed to grow.

### The splitting function

```js
function split(elapsedMs) {
  const totalSec = BigInt(Math.floor(elapsedMs / 1000));
  const days = totalSec / 86400n;              // BigInt division: whole days
  const rem = Number(totalSec % 86400n);       // 0..86399
  return { days, h: Math.floor(rem / 3600), m: Math.floor((rem % 3600) / 60), s: rem % 60 };
}
```

This is the heart of the project. The `n` after a number (`86400n`) marks it as a BigInt.

### The tick loop

```js
function tick() {
  const now = Date.now();
  const elapsed = Math.max(0, now - START_MS);   // never negative
  const t = split(elapsed);
  // ...update the four numbers on screen...
  setTimeout(tick, 1000 - (now % 1000) + 5);     // aim for the start of the next second
}
```

Instead of `setInterval(…, 1000)`, which slowly drifts, each tick calculates exactly how long until the next real second begins.

### Comma formatting

```js
t.days.toLocaleString("en-US")   // 1234567 → "1,234,567"
```

This makes huge day counts readable. It also works on BigInt.

### Waking up properly

```js
document.addEventListener("visibilitychange", tick);
```

When you return to the tab, the stopwatch refreshes immediately instead of waiting for the next scheduled tick.

---

## 8. How to use this code yourself

### Option A: Just view it

Open **https://alphastopwatch.github.io/AlphaStopwatch/** in any browser, on any device.

### Option B: Run it on your own computer

1. Download or clone the repository:
   ```bash
   git clone https://github.com/AlphaStopwatch/AlphaStopwatch.git
   cd AlphaStopwatch
   ```
2. Double-click `index.html`. It opens in your browser and works immediately. No installation needed.

### Option C: Publish your own copy with GitHub Pages

1. Create a new repository on GitHub.
2. Upload `index.html` (and the other files if you want the README snapshot too).
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select **main** and **/ (root)**, then **Save**.
5. After a minute, your site is live at `https://YOUR-NAME.github.io/YOUR-REPO/`.

### Option D: Use your own start moment

Edit one line in `index.html` **and** the same line in `update-readme.js`:

```js
const START_MS = Date.parse("2027-01-01T00:00:00+06:00");
```

Format: `YYYY-MM-DDTHH:MM:SS` followed by the UTC offset. Examples:

| Place | Offset to write |
|-------|-----------------|
| Bangladesh | `+06:00` |
| India | `+05:30` |
| UTC | `Z` |
| US Eastern (winter) | `-05:00` |

### Option E: Turn on the README snapshot

1. Make sure `README.md`, `update-readme.js` and `.github/workflows/update-stopwatch.yml` are in your repository.
2. Open **Settings → Actions → General → Workflow permissions** and choose **Read and write permissions**, then **Save**.
3. Open the **Actions** tab and run **Update stopwatch snapshot** once by hand with **Run workflow**. After that it runs by itself.

### Showing it on your GitHub profile page

GitHub shows a special README on your profile if you create a repository named exactly the same as your username (for example `AlphaStopwatch/AlphaStopwatch`) and put a `README.md` in it. This file is designed for exactly that.

---

## 9. Possibilities and ideas

The same idea (calculate from a fixed start moment) can do much more:

- **Anniversary counter:** days since a wedding, birthday or friendship.
- **Memorial counter:** time lived by a loved one, counted forever.
- **Project uptime:** how long a service has been running.
- **Streak counter:** days since you started a habit, quit something, or launched a product.
- **Countdown:** flip the subtraction (`target − now`) to count down to an event.
- **World-clock stopwatch:** show the same stopwatch next to several cities.
- **Milestone alerts:** celebrate day 100, day 365, day 1,000.
- **Years and months view:** convert days into approximate years, months and days.
- **Theme switcher:** dark, light, neon, minimal.
- **Fullscreen mode:** a wall display for a TV or a spare tablet.
- **Sound or notification** at every hour or every new day.
- **Embed it** in another website with an `<iframe>`:
  ```html
  <iframe src="https://alphastopwatch.github.io/AlphaStopwatch/" width="100%" height="300" style="border:0"></iframe>
  ```
- **Multiple stopwatches** with different start moments on one page.
- **Share cards:** generate an image of today's value to post on social media.

---

## 10. Frequently asked questions

**Does it really never stop?**
Nothing in the code can stop it. It has no end condition, no limit on days, and no stop button. It needs a device with a working clock and a browser, like any website.

**What happens if I close the page and open it tomorrow?**
It shows the correct elapsed time instantly, because it calculates from the clock rather than remembering a count.

**What if my device's clock is wrong?**
The stopwatch trusts the device clock. If the clock is set incorrectly, the stopwatch will be off by the same amount. Turn on automatic date and time in your device settings.

**Is there a reset button?**
No, by design.

**Why are there no months or years?**
Months and years have unequal lengths, which would make the count inconsistent. Days are always exactly 24 hours, so counting in days is exact.

**Why is the README number not exactly the live number?**
The README can only be rewritten by a scheduled job, about every 5 minutes. The live page is exact to the second.

**Does it work offline?**
Yes, once the page is loaded. The page needs no internet to keep calculating.

**Does it collect any data?**
No. There are no cookies, no tracking, no network requests and no external libraries.

**Which browsers work?**
Any modern browser (Chrome, Edge, Firefox, Safari, and mobile browsers). `BigInt` is supported by all of them.

---

## 11. Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| Page shows `0 00 00 00` | Start moment has not arrived yet | Wait until 4:00 AM Bangladesh time, or check the `START_MS` date |
| Numbers look wrong | Device clock or time zone is off | Enable automatic date and time |
| GitHub Pages link gives a 404 | Pages not enabled yet, or the file is not named `index.html` | Enable Pages and check the file name (case-sensitive) |
| README block never changes | Workflow not enabled or lacks permission | Follow [Option E](#option-e-turn-on-the-readme-snapshot) |
| Workflow fails with a permission error | Write access missing | Set **Read and write permissions** in Settings → Actions → General |
| Numbers shrink very small | Day count has a very large number of digits | Expected; the font scales down to keep everything inside the screen |

---

## 12. License

Free to use, copy and modify. Add a `LICENSE` file (for example MIT) if you want to state this formally.

<div align="center">

**⏱️ Alpha Infinite Stopwatch. Time never stops, and neither does this.**

</div>

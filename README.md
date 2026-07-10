# LifeOS

**Your life, beautifully organized.** One intelligent home for tasks, habits, money, goals, health, journaling and deep-work focus — instead of five different apps.

**Live app:** https://lifeos-eta-woad.vercel.app · **Repo:** https://github.com/EXCALIBUR303/lifeos
Redeploy after changes with `npx vercel --prod`.

## Cross-device sync (E2E encrypted)

Settings → **Sync between devices** → Create sync code on device 1, Join with the same
code on device 2. Everything (tasks, money, habits, calendar, notes…) stays in sync:
changes push automatically a few seconds after you make them and pull on app open/focus.

Privacy model: the AES-256 key is derived from your code with PBKDF2 and never leaves
your devices; the server (a free Supabase project, `ap-south-1`) stores only ciphertext
under a hashed id, behind RLS-sealed tables reachable only through exact-id RPCs.
Conflicts resolve newest-write-wins. Chat history and API keys deliberately never sync.

## iPhone / Mac Calendar sync

Calendar page → toggle **iPhone & Mac Calendar sync** → copy the `webcal://` link:
- iPhone: open the link in Safari → Subscribe (or Settings → Apps → Calendar → Add Subscribed Calendar)
- Mac: Calendar → File → New Calendar Subscription

Import a timetable (or add/edit any event) and the feed republishes automatically;
Apple refreshes it on the schedule you pick when subscribing (choose hourly). The feed
shares event titles/times only, on an unguessable URL, and can be switched off anytime.

Local-first: everything lives in your browser's localStorage. No account, no cloud, no tracking.

## Run it

```bash
cd ~/Claude/lifeos
npm run dev
```

Then open **http://localhost:3000** in your browser.

For the full app experience (offline support + installability): `npm run build && npm start`.

## Install as an app (PWA)

LifeOS ships a manifest, app icons and a service worker — after the first visit it
works offline and installs like a native app:

- **Mac (Safari):** open the app → File → **Add to Dock**
- **Mac (Chrome/Edge):** click the install icon in the address bar
- **iPhone/iPad (Safari):** Share → **Add to Home Screen** — full-screen, home-screen icon, safe-area aware
- **iPhone on your home Wi-Fi:** run `npm run build && npm start` on the Mac, then open the
  `Network:` URL that Next prints (e.g. `http://192.168.x.x:3000`) in iPhone Safari
- **From anywhere (recommended):** deploy free to Vercel, then install from the HTTPS URL:

  ```bash
  cd ~/Claude/lifeos
  npx vercel login
  npx vercel --prod
  ```

  (Press Enter to accept every default. Offline mode + Add to Home Screen work fully over HTTPS.)

## What's inside

| Module | Highlights |
|---|---|
| **Dashboard** | Life Score ring, AI daily briefing, insight cards, life-balance radar, live widgets for every module |
| **Tasks** | Natural-language quick add (“submit report next friday at 9pm urgent #college”), list + kanban board with drag & drop |
| **Habits** | Streaks, 18-week heatmap, per-day week toggles, perfect-day stats, custom habits (icon/color/cadence) |
| **Money** | ₹ INR budgets with over-spend meters, category donut, 30-day trend, 6-month bars, recurring bills, income/savings rate |
| **Goals** | Short-term / long-term / dream board, milestone checklists, **deadline forecast** (on track / at risk) from milestone velocity |
| **Journal** | Mood picker, gratitude chips, 30-day mood trend, full-text search |
| **Health** | Water / sleep / steps / workout rings, 1-tap loggers, sleep-vs-workout **correlation insight**, 14-day charts |
| **Focus** | 25/50/90-min pomodoro with animated ring, session labels, auto-logging, celebration burst, weekly stats |
| **Calendar** | Month + week time-grid, color-coded recurring classes/events, **exam mode** with countdowns, **.ics import/export** |
| **Study** | Subjects with credits → live **CGPA**, attendance with "safe to skip N classes" math, exam countdowns, **spaced-repetition flashcards** |
| **Notes** | Markdown-lite editor with **[[wiki links]]**, automatic backlinks, pinning, full-text search |
| **Assistant** | Chat grounded in your data — **Claude or Gemini** (your own key, browser-direct) with an honest on-device fallback engine |
| **Recap (Life Replay)** | Any month retold as numbered story headlines + a stat mosaic (deep work, habits, money, sleep, steps, mood) |
| **Settings** | Dark / Light / OLED themes, 4 accent colors, Anthropic API key, JSON export, demo-data reset |

System-wide: **⌘K command palette** (navigate, quick-add tasks in natural language, log water, switch themes), aurora glass design, staggered entrance animations, mobile bottom nav, `prefers-reduced-motion` support.

## The intelligence layer

`src/lib/insights.ts` is a rule-based, on-device engine (no API calls — swappable for an LLM later):

- **Life Score** — 8-axis weighted score (health, fitness, mindfulness, productivity, money, learning, career, relationships) feeding the radar chart
- **Unusual spending** — current month vs 3-month category average
- **Habit risk** — recent completion collapse vs baseline
- **Burnout watch** — low sleep + high focus load
- **Budget pace, savings rate, streak wins, deep-work weekday, journaling nudges**

## Architecture

```
src/
  app/            one route per module (all client components, statically prerendered)
  components/
    shell.tsx     grouped sidebar / topbar / splash / ⌘K palette
    charts.tsx    hand-rolled SVG charts (area, bars, donut, heatmap, radar, sparkline)
    ui.tsx        glass cards, rings, meters, buttons, motion presets
  lib/
    types.ts      domain models
    store.ts      Zustand stores persisted to localStorage
    seed.ts       deterministic demo-data generator (~200 days)
    insights.ts   Life Score + insight detectors + daily briefing
    nlp.ts        natural-language task parser
    calendar.ts   recurrence expansion + .ics import/export
    assistant.ts  data digest, Claude API client, on-device fallback
```

- **Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, Framer Motion, Zustand, Lucide icons
- **Theming:** CSS custom properties on `<html data-theme>`; chart palettes validated for colorblind-safe contrast in both modes
- **State:** Zustand + `persist` → localStorage key `lifeos-data` (settings under `lifeos-settings`); export/reset in Settings

## The AI assistant

Three modes, chosen in Settings → AI (keys live only in your browser and are sent
straight from your device to the provider — no middleman server):

- **Claude** — official `@anthropic-ai/sdk` in the browser (`dangerouslyAllowBrowser`), model `claude-opus-4-8`, adaptive thinking. Key from console.anthropic.com (pay-as-you-go — **separate from a Claude Pro subscription**).
- **Gemini** — REST call to `gemini-2.5-flash`. Key from **aistudio.google.com — free tier**, separate from a Gemini Pro subscription.
- **On-device** — a transparent rules engine answers about money, habits, sleep, plans and burnout with zero network. Runs whenever no key is set, and is clearly labeled.

## Roadmap (requires accounts/native apps — not buildable client-side)

- Supabase backend + auth (Google/Apple/passkeys) with cross-device sync — needs a provisioned backend project and OAuth app registrations
- Google/Apple/Outlook **two-way** calendar sync — needs OAuth client IDs and consent screens (one-way `.ics` import/export ships today)
- Apple Health / Google Fit / Health Connect — need native mobile apps, not reachable from a web page
- Receipt-scanning OCR, push notifications, Memory Vault media storage

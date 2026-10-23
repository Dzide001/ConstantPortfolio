# Day Ledger

Daily to-do tracker with nested tasks (goal → task → subtask) and an hourly schedule.
Installable web app (PWA). Tasks are stored in the browser (IndexedDB): no accounts, no server, no cost. Google Calendar is optional.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (tree logic, persistence, backup)
npm run build      # type-check + production build into dist/
```

`dist/` is static and can be hosted anywhere (GitHub Pages, Cloudflare Pages). It builds with a relative base, so it works from a subfolder.

## Layout

- `src/tree.ts` pure hierarchy logic (add, complete-cascade, carry-over, progress)
- `src/db.ts` IndexedDB persistence
- `src/backup.ts` JSON export/import
- `src/useLedger.ts` React state + persistence + midnight rollover
- `src/calendar/` Google sign-in, Calendar REST client, sync hook
- `src/components/` plan pane, schedule pane, task row, backup bar

## Roadmap

1. Core app (done)
2. Google Calendar: show events, create events from time-blocked tasks (done; setup in `docs/GOOGLE_SETUP.md`)
3. Reminders (via calendar notifications, plus in-app alerts)
4. Optional cross-device sync, Firebase free tier (plan in `docs/SYNC_PLAN.md`)
5. Quick-add parsing, recurring tasks, end-of-day review

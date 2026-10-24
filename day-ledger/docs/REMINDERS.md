# Reminders

Two layers, because a web page cannot wake itself up when it is closed and a free setup has no push server.

| | Works when the app is closed | Needs |
|---|---|---|
| **Google Calendar reminder** | Yes, on every device signed in to your Google account | The task has a time and is on your calendar ("Add to calendar") |
| **In-app alert** | No, only while Day Ledger is open or in the background of a running browser | Optional: allow notifications |

## Setting a reminder

Open a task's ⋯ menu, set a **Time**, and pick **Remind**: at start, 5, 10, 15, 30 minutes or 1 hour before, or no reminder. New time blocks default to 10 minutes before.

- **Not on the calendar:** the app shows a banner (Done, Snooze 10 min, Dismiss) and a system notification if you allowed them.
- **On the calendar:** the lead time is saved on the Google Calendar event as a popup reminder, and the app stays quiet so you do not get two. Changing the lead time updates the event.

## Rules

- A reminder fires from its lead time until 30 minutes after the start. Opening the app later than that shows nothing for it.
- Each reminder fires once. Changing the time, day or lead creates a new one. Fired and snoozed reminders are remembered across reloads (browser storage).
- Done tasks, tasks without a time, tasks planned for another day and carried-over tasks do not fire. Carried-over tasks need a new time.
- Finishing, moving or deleting a task, or putting it on the calendar, clears its banner.

## Notifications by platform

- **Desktop browsers and Android:** work after you tap **Turn on alerts**.
- **iPhone and iPad:** only after adding Day Ledger to the Home Screen (iOS 16.4 or later). The app tells you this.
- Notifications are shown through the service worker, so they also work where the page cannot create them itself.
- Tapping a system notification does not yet focus the app. Adding that needs a custom service worker.

## Not covered yet

True background push when the app is closed and a task is not on the calendar. That needs a small server job (for example a free Cloudflare Worker on a schedule) and Web Push subscriptions. It would arrive together with Phase 4 sync, which already needs a place to store per-device subscriptions.

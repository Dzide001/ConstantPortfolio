# Google Calendar setup (free)

Day Ledger talks to Google Calendar straight from the browser. You need a free OAuth client ID. No server and no billing are required.

1. Go to https://console.cloud.google.com and create a project (any name, for example "Day Ledger").
2. **APIs & Services → Library**: search for **Google Calendar API** and click **Enable**.
3. **APIs & Services → OAuth consent screen** (Google may label this "Google Auth Platform"):
   - User type: **External**.
   - Fill in the app name and your email.
   - Add the scope `https://www.googleapis.com/auth/calendar.events`.
   - Leave publishing status on **Testing** and add your own Google account under **Test users**.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins**: add every address the app is served from, for example
     `http://localhost:5173` for development and your hosted address (no path, no trailing slash).
   - Leave redirect URIs empty. The browser sign-in flow does not use them.
5. Copy the client ID (it ends in `.apps.googleusercontent.com`) into `day-ledger/.env.local`:

   ```
   VITE_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
   ```

6. Restart `npm run dev` (or rebuild). The schedule pane now shows **Connect Google Calendar**.

For a hosted build, set `VITE_GOOGLE_CLIENT_ID` as a build variable. The client ID is not a secret: it is visible in the shipped JavaScript, and it only works from the origins you authorized.

## Limits while the app is in Testing

- Only the listed test users (up to 100) can sign in.
- Google may ask you to re-approve access roughly every 7 days.
- Publishing the app for anyone to use requires Google's verification for the calendar scope. It is free but slow, and needs a privacy policy page.

## What the app does with your calendar

- Reads today's events from your **primary** calendar and shows them in the schedule.
- Creates, updates and deletes **only** the events it created from your tasks (the "Add to calendar" button in a task's ⋯ menu).
- Keeps the access token in memory only. Disconnect revokes it.
- Edits made while disconnected are not pushed to the calendar afterwards. Reconnect and edit the task again, or use Remove and Add to calendar.

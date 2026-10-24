# Cross-device sync setup (Firebase, free)

Sync is optional. Without these settings Day Ledger works exactly as before, and no sync buttons appear.

Uses the free **Spark** plan: Firebase Authentication (Google) and Cloud Firestore. No billing account, no Cloud Functions.

## 1. Create the project

1. Open https://console.firebase.google.com and **Add project**. Turn Google Analytics off.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.** Pick a support email.
3. **Build → Firestore Database → Create database.** Choose **production mode** and a region near you (it cannot be changed later).
4. **Firestore → Rules:** paste the contents of `firebase/firestore.rules` and **Publish**.
5. **Project settings (gear) → General → Your apps → Web (`</>`).** Register an app. Copy the config values it shows.
6. **Authentication → Settings → Authorized domains:** add the address your app is served from (for example `yourname.github.io`). `localhost` is already allowed.

## 2. Give the app the settings

Put the four values in `day-ledger/.env.local` (for a hosted build, set them as build variables):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
```

These values are not secrets. They identify the project and ship inside the app. The rules in step 1.4 are what keep each person's data private.

Restart `npm run dev` or rebuild. A **Sign in to sync devices** button appears at the top right.

## How it behaves

- Your tasks always live on the device first, so the app works offline and without an account.
- On first sign-in, tasks already on the device are merged with the cloud copy. Nothing is lost, and the same task is never duplicated.
- Each edit is sent a moment later. Other signed-in devices update within a few seconds.
- If two devices edit the same task, the later edit wins. Different tasks never conflict.
- Deleting a task on one device deletes it everywhere. A device that was offline cannot bring it back.
- **Sign out** stops syncing and keeps the tasks on this device.
- **Delete cloud copy** removes your synced tasks from the cloud and signs you out here. Sign out of your other devices first, or they will upload their copy again.
- Importing a backup replaces your list, and that replacement syncs to every device.
- Google Calendar still uses its own connection. Signing in to sync first lets the calendar skip the account chooser.

## Free-plan limits

At the time of writing the Spark plan allows about 50,000 reads and 20,000 writes per day and 1 GiB of storage per project. One person's task list uses a tiny fraction. A shared public deployment with many users would need to check these limits first, and would need one Firebase project for all of them.

## Privacy

Your tasks are stored in your Firestore database, which the project owner can read in the Firebase console. They are not end-to-end encrypted.

## Tests

`npm test` covers the merge rules and a two-device sync simulation.

`npm run test:emulator` starts the Firestore emulator (needs Java) and checks the security rules and the real Firestore code. It downloads the emulator on first run.

# Phase 4 plan: cross-device sync with Firebase (free tier)

Goal: the same task list on a phone, tablet and laptop, updating within seconds, still working offline, at no cost for personal use.

## Stack

- **Firebase Authentication**, Google provider. One sign-in per device.
- **Cloud Firestore** for the data, with its built-in offline cache (`persistentLocalCache`, multi-tab).
- **Firebase Hosting is not needed.** The app stays on GitHub Pages or Cloudflare Pages.
- Spark (free) plan only. No Cloud Functions, because they require the paid plan. Check current free quotas before launch; at the time of writing they are about 50k reads, 20k writes and 20k deletes per day and 1 GiB stored, which is far above one person's use.

## Data model

One document per node, so two devices editing different tasks never collide:

```
users/{uid}/nodes/{nodeId}   same fields as today's Node, plus:
    updatedAt: number        ms epoch, set on every write
    deleted?: true           tombstone instead of hard delete
```

`Node` keeps its current shape; `updatedAt` and `deleted` are added in Phase 4. IndexedDB stays as the local store, so the app works with no account.

## Conflict handling

- Last writer wins per node, decided by `updatedAt`. Good enough for one person on several devices.
- Deletes write a tombstone so an offline device cannot resurrect a deleted task. A tombstone older than 30 days can be purged.
- Completion cascades (tick a task, its subtasks tick) are computed locally and written as several node updates. If two devices disagree after merging, a short repair pass re-applies the "parent is done when all children are done" rule.

## Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Each person can only reach their own data. Limit the document size and field set in rules once the shape is final.

## Sign-in: one prompt for both Firebase and Calendar

Today Calendar uses Google Identity Services directly. In Phase 4, sign in with Firebase's `GoogleAuthProvider`, request the `calendar.events` scope on it, and read the Google access token from the sign-in result. Then one Google prompt covers sync and calendar. Firebase does not refresh Google access tokens, so keep the quiet re-request in `calendar/auth.ts` for the hourly refresh.

## Rollout steps

1. Create a Firebase project on the Spark plan, add a Web app, enable Google sign-in, create Firestore in production mode, publish the rules above.
2. Add `firebase` (modular SDK) and a `sync/` module behind a small interface (`pull`, `push`, `subscribe`) so the app code does not depend on Firebase directly.
3. Add `updatedAt` to every write in `tree.ts` and `useLedger.ts`; migrate existing local nodes by stamping `updatedAt = createdAt`.
4. First sign-in on a device: upload local nodes that the cloud lacks, download the cloud nodes that local lacks, and merge by `updatedAt`. Show a one-time summary ("Uploaded 12 tasks, downloaded 4").
5. Live `onSnapshot` listener updates local state; local edits write through with Firestore's offline queue.
6. Sign-out keeps local data and stops syncing. Add "Delete my cloud data".
7. Tests: merge function (pure), tombstones, first-sign-in merge, using the Firebase emulator in CI.

## Privacy

Tasks stored in Firestore are readable by the project owner in the Firebase console. Say so in the app. A zero-knowledge option (encrypt titles in the browser with a passphrase) is possible later but makes password recovery impossible.

## Open decisions

- Keep "works with no account" as the default and make sync opt-in (recommended).
- Sync Calendar-linked `eventId`s as they are. The id is valid on every device for the same Google account.
- Whether to add a "last synced" indicator and a manual "Sync now" button (recommended).

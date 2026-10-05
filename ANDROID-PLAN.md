# Android kitchen app plan (temporary)

A 4-phase plan to wrap the kitchen screen (`/kitchen`) in an Android app with Capacitor, for the restaurant's Samsung Galaxy Tab A7 Lite. **Do one phase per session.** Each session finishes by filling in its "Notes for the next session" section, so the next session can start fresh without the earlier conversation.

**This file is temporary.** Delete it at the end of Phase 4, once its content has been moved into `HANDOFF.md`, and only after the owner confirms. Until then, **don't edit `HANDOFF.md`**: decisions and progress go in this file's notes sections.

**To start a session:** "Read `ANDROID-PLAN.md`, then do Phase 1." (Use 2, 3 or 4 for later sessions.)

**Which parts of `HANDOFF.md` to read** (don't read the whole file unless a task needs it):

| Phase | Sections |
|---|---|
| All | TL;DR, Working with the owner, Repo & git, Local development, Kitchen screen |
| 3 also | Production setup (Render env vars), Architecture (models, controllers, `require_admin`) |
| 4 | The whole file, since Phase 4 edits it |

---

## Rules for every session

1. **Read first:**
   - The `HANDOFF.md` sections listed in the table at the top for your phase.
   - This whole file, including the notes from earlier phases.
   - Run `git status` and `git log --oneline -10`. Another Claude session also edits this repo, so don't commit changes you didn't make.
2. **Quality comes first; saving tokens comes second.** Use subagents and cheaper models where they save context *without* lowering quality:
   - **Good to hand off:**
     - Finding code: the Explore agent with `model: "haiku"` or `"sonnet"`.
     - Reading long docs or changelogs and summarizing them, e.g. current Capacitor, Firebase or Android API details.
     - Running the test suite, lint or build and reporting only the failures.
     - Mechanical boilerplate (Gradle config, icon generation, `.gitignore` entries).
     - Writing first drafts of specs.
   - **Keep on the main model:**
     - Design decisions.
     - Anything security-related: the device endpoints, who gets pushes, secrets handling.
     - The native Kotlin/Java code: the alarm, notifications, the push service.
     - Changes to existing kitchen code (`KitchenApp.jsx`, `AdminContext.jsx`, `adminUtils.js`).
     - The final review.
   - **Check subagent work before committing.** If a cheaper model's result looks doubtful, redo it properly. Never accept a worse app to save tokens.
   - Look up current docs (Capacitor, Firebase Cloud Messaging, Android 13/14 permissions) instead of relying on memory. Versions and APIs change.
3. **The iPad and browser kitchen must keep working exactly as today.** Every native feature goes behind `isKitchenApp()` (built in Phase 1) and falls back to the current web behavior.
4. **Before finishing a phase:**
   - `bundle exec rspec`, `npm run lint --prefix client` and `npm run build --prefix client` all pass.
   - The phase's checks below are done, on the real tablet where possible.
   - Run `/code-review` on the phase's changes and fix what's real.
5. **Git:** commit freely, including this file. **Push only when the owner says so**, because pushing to `main` deploys to production. Production DB writes are blocked for Claude; migrations run automatically on deploy (`bin/render-build.sh`).
6. **Secrets:**
   - Never print `.env.local`, service account JSON or keystore passwords.
   - The signing keystore and its passwords live **outside the repo**.
   - Add `*.jks`, `*.keystore`, `keystore.properties` and `google-services.json` to `.gitignore` before creating any of them.
7. **The owner** prefers short answers and decisions as multiple choice. Ask when a choice is really theirs; pick sensible defaults otherwise and note them here.

---

## Decisions already made

- **Capacitor app that loads the live site:** `server.url` = `https://mardinismenlopark.com/kitchen`. No bundled copy of the React app.
  - Sign-in keeps using the same `_mardinis_session` cookie, which is `SameSite=Strict` and fine on the same origin.
  - Web deploys update the app automatically. Only native changes need a new APK.
- **The project lives in `kitchen-android/`** at the repo root, with its own `package.json`. It's separate from `client/`.
- **Native code is reached through `window.Capacitor`** (injected by the native app). `client/` doesn't need a Capacitor dependency unless a phase finds a strong reason; if it does, write down why.
- **Installed directly on the tablet, not through the Play Store.**
- **The 10-second polling stays** as the backup to push.
- **The reminders** (3 days and 1 day before pickup) stay as on-screen popups. No push for them.

---

## Phase 1: The app (about 1 day)

**Goal:** an installable "Kitchen" app on the tablet that opens `/kitchen` full-screen, stays signed in and never lets the screen sleep.

### Tasks

1. **Build setup.** Ask the owner which setup to use:
   - **(a)** Command-line Android SDK + JDK inside WSL, installing on the tablet with Windows `adb.exe` (recommended; USB passthrough to WSL is fiddly), or
   - **(b)** Android Studio on Windows.

   Check the current Capacitor docs for the required JDK and Android SDK versions. Write the exact setup steps in the notes below.
2. **Create the project in `kitchen-android/`:**
   - Capacitor core, CLI and Android, at the current major version.
   - `appId`: `com.mardinis.kitchen` (confirm with the owner). `appName`: `Kitchen`.
   - A tiny `www/` folder, since Capacitor requires one.
   - `server.url` set to production by default, with a way to build a **dev** APK that points at an ngrok URL (e.g. an env var read in `capacitor.config.ts`) for testing against the local DB.
   - Gitignore `node_modules`, `android/build`, `.gradle`, `local.properties` and `android/app/release`.
3. **Native shell** (`MainActivity`):
   - Keep the screen on (`FLAG_KEEP_SCREEN_ON`).
   - Immersive full-screen (hide the system bars).
   - Lock the orientation to landscape if the owner wants. Ask; the tablet is used in landscape.
   - Let the WebView play sound without a tap (`setMediaPlaybackRequiresUserGesture(false)`).
   - Flush cookies on pause (`CookieManager.flush()`), so the sign-in survives the app being killed.
   - The Android back button must never leave `/kitchen` or close the app by accident.
4. **Icon and name:**
   - Adaptive launcher icon from `client/public/kitchen-icon-512.png` (e.g. with `@capacitor/assets`).
   - Splash screen in the kitchen's dark color.
   - The app is called "Kitchen".
5. **Web side:**
   - Add `client/src/native.js` with `isKitchenApp()`. It checks `window.Capacitor?.isNativePlatform?.()`, is safe in every browser, and later phases add plugin helpers to it.
   - In `KitchenApp.jsx`, when it's in the app: hide the Install app dialog and menu item, and skip the browser wake lock and the "Screen may sleep" warning (the native flag handles it).
   - Leave everything else alone. Also check that `/kitchen` in a browser is unchanged.
6. **Signing and install:**
   - Create a release keystore **outside the repo** (ask the owner where, e.g. `~/keys/`), with a gitignored `keystore.properties`.
   - Tell the owner to back up the keystore and its passwords. Without them, updates can't be installed over the existing app.
   - Build a signed release APK and install it on the tablet (adb, or copy the APK over and allow "Install unknown apps").
   - Write a script (e.g. `kitchen-android/build-apk.sh`) that rebuilds the signed APK in one command.

### Checks
- [ ] The app opens straight into the kitchen screen. Sign-in works, and the cook stays signed in after the app is force-stopped and the tablet restarts.
- [ ] The screen never sleeps while the app is open (leave it for 15+ minutes).
- [ ] The back button doesn't leave the kitchen or exit the app.
- [ ] A test order shows up and chimes (dev APK against local + ngrok, or production if the owner agrees).
- [ ] The browser `/kitchen` (desktop and iPad) is unchanged: Install app, wake lock and "Tap to start" all still there.

### Notes for the next session
_(Phase 1 session fills this in: build setup steps, app id, where the keystore is, how to build and install, the dev-APK trick, problems hit, anything the owner still has to do.)_

---

## Phase 2: Native alarm (1–2 days)

**Goal:** the kitchen alarm plays through Android's **Alarm** volume at full loudness, even if Media volume is down, with no "Tap to start".

### Tasks

1. **Sound file:**
   - Make a WAV that matches today's alarm: `playKitchenAlarm` in `client/src/admin/adminUtils.js`, three square-wave ding-dongs. Render it from the same frequencies and timings with a small script (keep the script in `kitchen-android/` so the sound can be remade).
   - Also make one for the softer chime if the kitchen uses it (check where `playChime()` is called without `loud`, e.g. reminders).
   - Put them in `res/raw`.
2. **A `KitchenAlarm` Capacitor plugin** inside the Android project:
   - `play({ sound })` and `stop()`.
   - Uses `AudioAttributes.USAGE_ALARM` with audio focus.
   - While it plays, raises the alarm stream to max and puts the previous level back afterwards. Confirm with the owner; it's the default because "too quiet" is the problem.
   - Respects the existing in-app Sound on/off setting (that check stays in JS).
3. **JS:**
   - In `adminUtils.js`, `playChime()` calls the native plugin when `isKitchenApp()` is true; otherwise it uses Web Audio as now.
   - The 20-second repeat (`AdminContext.jsx`) and ⋮ → Test sound need no other changes; check that they do go through it.
4. **Inside the app only**, skip the full-screen "Tap to start" and the "Tap to turn sound back on" prompts (`audioReady` counts as ready). The browser keeps them.

### Checks
- [ ] With Media volume at 0, a new order alarm plays loudly (Alarm stream). Alarm volume goes back to its old level afterwards.
- [ ] The alarm repeats every 20s until the order is acknowledged, then stops.
- [ ] Test sound, reminders and Sound off all behave correctly.
- [ ] No "Tap to start" in the app. The browser and iPad still show it and still sound the same.

### Notes for the next session
_(Phase 2 session fills this in.)_

---

## Phase 3: Push alerts (2–3 days)

**Goal:** a new order rings the tablet within seconds **even when the app is closed or the screen is off.** This is the largest and riskiest phase. Research first, then build.

### Owner setup (guide them step by step)
- **Firebase project:** under which Google account? Ask. Add the Android app with the Phase 1 app id and download `google-services.json` into `kitchen-android/android/app/` (gitignored).
- **Service account key for the server:**
  - Locally it goes in `.env.local` as `FIREBASE_SERVICE_ACCOUNT_JSON` (never print it).
  - In production it's set by the owner in the Render dashboard, and `render.yaml` gets the key with `sync: false`.
  - **The server code must do nothing when the variable is missing**, so deploying before it's set is safe.

### Backend tasks
1. **Migration for `device_tokens`:**
   - Columns: `user_id` (foreign key), `token` (unique), `platform`, `last_seen_at`, timestamps.
   - **Turn RLS on**, like the other migrations do (`execute "ALTER TABLE … ENABLE ROW LEVEL SECURITY"`).
   - `User has_many :device_tokens, dependent: :destroy`.
2. **`Api::Admin::DevicesController`:**
   - `create`: upsert by token, move it to the current user, touch `last_seen_at`.
   - `destroy`: by token, only your own.
   - Kitchen staff are allowed. Follow how the orders controller lets kitchen users past `require_admin`.
   - Add a `rate_limit` with a `name:`; HANDOFF explains why the name matters.
3. **Who gets pushes:** by default, tokens of users who are **currently** kitchen or admin. Ask the owner whether admins' devices should ring, or kitchen users only. Removing someone's role stops their pushes.
4. **`KitchenPush` service:**
   - Sends through FCM HTTP v1. Get the OAuth token through `googleauth` or a maintained FCM gem (check what's current) and cache it.
   - High priority, Android channel `new_orders`, a short TTL (about 10 min; stale alerts are useless), and data `{ order_id }`.
   - Timeouts of about 5s.
   - Deletes tokens that FCM reports as unregistered or invalid.
   - Must **never raise into order placement.**
5. **Trigger:**
   - Fire once when an order becomes `new`. Every path goes through `Order#mark_placed!` (`app/models/order.rb`): pay at pickup, paid card orders and group orders. Use `after_commit` on that change.
   - There's no job system, so send on a background thread wrapped in `Rails.application.executor.wrap`. Run it inline in tests.
   - Orders for a later day (Upcoming) push too, because they chime today.
6. **Specs:**
   - Device endpoint permissions: customer 403, kitchen OK, can't delete someone else's token.
   - A push is sent on `mark_placed!` and on no other status change.
   - No push when the variable isn't configured.
   - FCM errors don't break orders.
   - Unregistered tokens get removed.
   - Stub the HTTP calls.

### App tasks
1. **Push setup and permissions:**
   - Add Firebase and push to the Android project.
   - Ask for notification permission (Android 13+), and for full-screen notifications if Android 14 needs it to be granted.
2. **`new_orders` notification channel:**
   - High importance, the Phase 2 alarm sound with `USAGE_ALARM`, vibration.
   - A **full-screen intent** that opens the app on the kitchen screen, like an alarm clock.
   - **Research note:** the stock Capacitor push plugin may not show full-screen, alarm-loud notifications while the app is killed. A custom `FirebaseMessagingService` handling data messages is probably needed; confirm against current docs before building.
3. **In the foreground:** no notification. Instead, refresh the orders right away so the popup appears in about a second, not up to 10s. The refresh function is in `AdminContext`.
4. **Registering the tablet:**
   - After a kitchen sign-in inside the app, POST the token to `/api/admin/devices`. Re-send it when it changes and on each launch (this keeps `last_seen_at` fresh).
   - DELETE it on sign-out.
5. **Tapping the notification** opens the app on `/kitchen`, with that order selected if that's easy.

### Checks
- [ ] App force-stopped, screen off: place a test order and the tablet wakes and rings loudly within a few seconds.
- [ ] App open: the popup appears almost immediately, with no duplicate notification.
- [ ] Signing out stops pushes. A customer account can't register a device.
- [ ] Production deploy works before the Firebase variable is set (pushes off, nothing breaks). After the owner sets it, a real order rings.

### Notes for the next session
_(Phase 3 session fills this in: Firebase project and account, env var names, what the owner set in Render, which push approach was used and why, problems hit.)_

---

## Phase 4: Reliability, wrap-up, handoff (about 1 day)

**Goal:** the tablet runs the kitchen unattended, and the knowledge moves from this file into `HANDOFF.md`.

### Tasks

1. **Start on boot:** Android 10+ limits opening apps from the background. Research the current approach, then let the owner choose (multiple choice) between:
   - **(a)** A boot receiver plus a full-screen notification that opens the app.
   - **(b)** Making the app the tablet's Home app (kiosk-like; staff can't easily reach other apps).
   - **(c)** No auto-start, just a checklist step.
2. **Offline screen:**
   - If the site can't load, show a local offline page with Retry (Capacitor `server.errorPath` or similar; check the current docs) instead of a raw WebView error.
   - Show a clear "No connection, orders may be missing" banner when order polling keeps failing. This helps the browser kitchen too, so build it for both.
3. **App version check (optional, recommended):**
   - The page reads the native app's version and shows "Update the Kitchen app" when it's below a minimum set in the web code.
   - That way future native changes can't silently be missing on the tablet.
4. **Tablet setup checklist** (it goes in HANDOFF):
   - Samsung "Never sleeping apps".
   - Battery optimization off for the app.
   - App pinning, notification and full-screen permissions.
   - Alarm volume.
   - Installing updates.
5. **Final pass:**
   - Full regression: rspec, lint, build.
   - Browser `/kitchen` on desktop (headless check) still unchanged.
   - Every check from Phases 1–3 still holds on the tablet.
   - Run `/code-review` over the whole Android work (`git diff` from the commit before Phase 1).
6. **Handoff:**
   - Add an "Android kitchen app" section to `HANDOFF.md`, and a dated "Changes on …" entry. Cover:
     - What it is and why (Capacitor shell loading the live `/kitchen`).
     - Build, sign and install steps, and the build script.
     - Where the keystore is and that it must be backed up.
     - The dev APK and ngrok.
     - The native plugins.
     - The push design: backend, the env var, the Firebase project.
     - The tablet checklist and troubleshooting.
     - What's not done.
   - Update the "Kitchen screen" section where it now differs: sound, wake lock, "Not done: real-time push".
   - Update the spec count.
   - Update the memory pointer in `MEMORY.md` if the handoff date changes.
7. **Ask the owner** before deleting `ANDROID-PLAN.md`, then delete it in the final commit. Push only when the owner says so.

### Checks
- [ ] After a tablet reboot, the kitchen comes back as the owner chose.
- [ ] Wi-Fi off shows the banner and the offline screen. Wi-Fi back on recovers without anyone touching it.
- [ ] `HANDOFF.md` alone is enough for a new session to rebuild, re-sign and reinstall the app.
- [ ] `ANDROID-PLAN.md` is deleted, with the owner's OK.

### Notes
_(Phase 4 session: list anything left over for the owner.)_

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
- [x] The app opens straight into the kitchen screen. Sign-in works, and the cook stays signed in after the app is force-stopped and the tablet restarts. (Kitchen Dev, 2026-10-04.)
- [x] The screen never sleeps while the app is open (leave it for 15+ minutes). (Tablet timeout is 30s; awake for 16 min.)
- [x] The back button doesn't leave the kitchen or exit the app.
- [x] A test order shows up and chimes (dev APK against local + ngrok, or production if the owner agrees). (Local order #0048. The WebView played audio; the owner turned Media volume to 0 ten seconds later, which is the Phase 2 problem.)
- [x] The browser `/kitchen` (desktop and iPad) is unchanged: Install app, wake lock and "Tap to start" all still there. (Headless Chrome at desktop and iPad sizes.)

### Notes for the next session

Phase 1 done on 2026-10-04 (commits `3a29942`, `b78bca9` and the notes commit; nothing pushed yet). `/code-review` (high) was run; its fixes are in `b78bca9`. Back closing a dialog was checked on the tablet after reinstalling.

**Owner's choices:** build in WSL + Windows adb; app id `com.mardinis.kitchen`; landscape only (`sensorLandscape`); keystore in `~/keys/`.

**Build setup (all user-local, no sudo):**
- JDK: Temurin 21 unpacked to `~/.local/share/jdk/jdk-21.0.12.1+1` (Adoptium tarball). Capacitor 8 needs AGP 8.13 / Gradle 8.14.3, so JDK 17+; 21 is what Android Studio bundles.
- Android SDK: command-line tools in `~/.local/share/android-sdk/cmdline-tools/latest` (`commandlinetools-linux-16111833_latest.zip`), then `sdkmanager --licenses` and `sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"`. Gradle pulled build-tools 35 by itself.
- Windows adb: `platform-tools-latest-windows.zip` unpacked to `C:\Users\Alfred\AppData\Local\Android\platform-tools` (`/mnt/c/...` from WSL). USB debugging is on, and this PC is authorized on the tablet.
- Nothing was added to `~/.bashrc`; `build-apk.sh` finds JAVA_HOME / ANDROID_HOME / ADB itself (env vars override).

**Project (`kitchen-android/`):**
- Capacitor 8.5 (`@capacitor/core`, `android`, `cli`), plus `@capacitor/assets` for icons. TypeScript pinned to 5 (TS 7 is the Go port; the Capacitor CLI uses the TS JS API to read `capacitor.config.ts`). `sharp`'s install script is approved in `package.json` `allowScripts`.
- `capacitor.config.ts`: `server.url` = `$KITCHEN_URL` or `https://mardinismenlopark.com/kitchen`. `www/` is a placeholder.
- `MainActivity.java`: `FLAG_KEEP_SCREEN_ON`, immersive (bars hidden again on focus), media without a gesture, `CookieManager.flush()` on pause. Back on `/kitchen` sends Escape to the page, which closes a dialog or menu; the new-order and reminder popups ignore Escape. On another page Back goes back, or loads the kitchen URL. `android:allowBackup="false"`, so the session cookie isn't backed up.
- Build types: release = "Kitchen" (`com.mardinis.kitchen`); debug = "Kitchen Dev" (`com.mardinis.kitchen.dev`), which installs next to it. The name comes from `manifestPlaceholders` `appLabel` in `app/build.gradle`, not `strings.xml`.
- `app/build.gradle` refuses a release build unless the synced `capacitor.config.json` loads the production URL. `cap sync` keeps the last URL, so a release built right after a dev build would otherwise ship ngrok.
- Icons: `assets/` (sources made from `client/public/kitchen-icon-512.png` on `#1c1814`); regenerate with `npx capacitor-assets generate --android --iconBackgroundColor '#1c1814' --iconBackgroundColorDark '#1c1814' --splashBackgroundColor '#1c1814' --splashBackgroundColorDark '#1c1814'`. Android 12+ uses the system splash (`windowSplashScreenBackground` in `styles.xml`).

**Signing:** `~/keys/mardinis-kitchen.jks` (PKCS12, alias `kitchen`) and `~/keys/mardinis-kitchen.properties` (passwords + path, mode 600). `app/build.gradle` reads that file (or `$KITCHEN_KEYSTORE_PROPERTIES`). The owner was told to back up `~/keys/`. Cert SHA-256: `86fa3aab…ba01263`.

**Build and install:**
- `kitchen-android/build-apk.sh [--install]`: signed release APK to `dist/kitchen.apk`.
- `KITCHEN_URL=https://<id>.ngrok-free.app/kitchen kitchen-android/build-apk.sh --dev --install`: the dev APK (`bin/dev` + `ngrok http 4000` first). ngrok shows its "Visit Site" page once per tunnel; tap it.
- Tablet driving from WSL: `adb.exe shell input tap X Y` (screen is 1340x800 landscape), `adb.exe exec-out screencap -p > x.png`. Typing: `input text`; use keyevent 61 (Tab) between fields, because the on-screen keyboard shifts the layout.

**Web side:** `client/src/native.js` `isKitchenApp()`; `KitchenApp.jsx`: `isInstalled()` is true in the app (hides Install app and Full screen), and the browser wake lock and "Screen may sleep" are skipped in the app. **These web changes are only on production after a push**; until then the release app still shows Install app (harmless).

**Findings:**
- Tablet: SM-T220, Android 14 (One UI 6.1), WebView 153, 800x1340 @ 213dpi; screen timeout 30s. Android 16's large-screen orientation override doesn't apply to it.
- Capacitor with a remote `server.url` proxies **HTML GETs** through native `HttpURLConnection` to inject `window.Capacitor` (`WebViewLocalServer.handleProxyRequest`); API calls go straight from the WebView. Service-worker requests are routed through it too (`resolveServiceWorkerRequests`), so `window.Capacitor` exists after SW navigations. The bridge is only injected on the app's own host.
- With no `server.errorPath`, an offline launch fails inside `handleProxyRequest` (Phase 4).
- **Samsung has a pending system update** (One UI 6.1, security patch) set to auto-install and restart the tablet on **Mon 2026-10-05 at 4:09 AM**; its screen opened by itself after a reboot. Phase 4 should cover auto-updates and restarts in the tablet checklist.
- The release "Kitchen" app is installed and shows the live sign-in, but **nobody has signed in on it yet** (it needs a real kitchen account).

**Left for the owner:** back up `~/keys/`; say when to push (deploys the `isKitchenApp()` change); sign the real "Kitchen" app in with the kitchen account; decide on the pending Samsung update. Phase 1 stopped the owner's Portfolio Vite server on :3000 (with their OK); restart it when needed.

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

Phase 2 was done in the same session as Phase 1, on 2026-10-04 (commit `6845737`; nothing pushed). App version is now **1.1 (versionCode 2)**. Bump both for every APK with native changes.

**Owner's choice:** raise the Alarm volume to max while the alarm plays, then put it back.

**What was built:**
- `kitchen-android/sounds/render-sounds.mjs` renders `res/raw/kitchen_alarm.wav` (2.0s, band-limited square waves at 0.9, like Web Audio's) and `kitchen_chime.wav` (1.38s sine) from the same notes and timings as `playKitchenAlarm` / `playChime`. A comment in `adminUtils.js` says to re-run it after changing either.
- `KitchenAlarmPlugin.java` (`@CapacitorPlugin(name = "KitchenAlarm")`, registered in `MainActivity` before `super.onCreate`): `play({ sound: "alarm" | "chime" })` and `stop()`. MediaPlayer with `USAGE_ALARM` + `CONTENT_TYPE_SONIFICATION` and transient audio focus. Only `"alarm"` raises the Alarm volume to max. The old level is restored afterwards, unless someone changed the volume during the sound, and it's kept in SharedPreferences so `load()` restores it if the app died mid-sound.
- `client/src/native.js` `nativeAlarm()`: `{ play, stop }` via **`window.Capacitor.nativePromise("KitchenAlarm", …)`**. The injected bridge has **no `registerPlugin`**, which comes from `@capacitor/core`, not bundled here. A first version called it, threw inside `useState`, and blanked the whole kitchen. `nativeAlarm()` now never throws, and returns null in browsers and in older APKs without the plugin (`isPluginAvailable`), so those keep Web Audio.
- `adminUtils.js`: `playChime()` goes native when `nativeAlarm()` exists. `unlockAudio()` returns true there, and the new `audioIsReady()` is used for `audioReady`. `stopChime()` runs when Sound is turned off. `AdminContext` skips the Web Audio unlock listeners in the app. `KitchenApp` starts with `started = true` when the native alarm exists, so there's no Tap to start or "Tap to turn sound back on".

**Checked on the tablet (Kitchen Dev, local + ngrok):**
- Media 0, Alarm 3: Test sound played on the Alarm stream (`dumpsys audio`: `usage=USAGE_ALARM`, 2.3s), Alarm volume 3 → 15 → back to 3.
- Order #0049: 3 alarm plays in 55s (first poll, then every 20s); after "Got it", none in 45s.
- No Tap to start in the app (screenshot).
- Headless Chrome: desktop, iPad, an "old app" without the plugin and a "broken bridge" all keep Tap to start and Web Audio with no page errors; a "new app" mock skips Tap to start and Test sound calls `nativePromise("KitchenAlarm", "play", {sound: "alarm"})`.

**Not yet checked on the tablet:** Sound off (an attempt was invalid because the owner was using the tablet and the screen went off), the review fixes (installed but not re-run: chime doesn't raise the volume; restore-after-kill), and reminders. Reminders only show while the restaurant is open, and they use the same `playChime({ loud: true })` as new orders. **The dev app's Sound setting was left Off**; turn it back on.

**Debugging the app's WebView from WSL:** `adb.exe forward tcp:9229 localabstract:webview_devtools_remote_<pid>` (pid from `adb.exe shell pidof com.mardinis.kitchen.dev`; debug builds only). WSL can't reach Windows' localhost, so talk to it from PowerShell: scripts in `C:\Users\Alfred\AppData\Local\Temp\kcdp\` (`eval.ps1 "<js>"` runs Runtime.evaluate; `logs.ps1` dumps buffered console errors). Don't `pkill -f kcdp`: it kills your own shell.

**Seen on the tablet:** a Chrome-installed "Kitchen" PWA icon sits next to the native "Kitchen" and "Kitchen Dev". The owner may want to remove the PWA once the native app is in use (Phase 4 checklist).

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

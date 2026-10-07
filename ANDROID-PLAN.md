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

**Alarm loudness (added at the owner's request after the first tablet tests):** kitchen ⋮ → **Alarm loudness**: Loud / Medium / Quiet / Off, saved per device (`localStorage` `mardinis.admin.alarmLevel`; Off = the existing Sound off). `ALARM_LEVELS` in `adminUtils.js`: the app sets the Alarm volume to 100% / 60% / 25% of max (`play({ sound: "alarm", volume })`, and the plugin restores the old level afterwards). Browsers scale the Web Audio alarm's gain 1 / 0.4 / 0.12. Loud is the default, so nothing changes until someone picks a level. The Sound button reads "Sound on · Quiet" when the level isn't Loud. Checked in headless Chrome (browser + app mock); on the tablet, only with Quiet: the owner asked for very quiet test beeps that night.

**Checked on the tablet (Kitchen Dev, local + ngrok), before Alarm loudness existed:**
- Media 0, Alarm 3: Test sound played on the Alarm stream (`dumpsys audio`: `usage=USAGE_ALARM`, 2.3s), Alarm volume 3 → 15 → back to 3.
- Order #0049: 3 alarm plays in 55s (first poll, then every 20s); after "Got it", none in 45s.
- No Tap to start in the app (screenshot).
- Headless Chrome: desktop, iPad, an "old app" without the plugin and a "broken bridge" all keep Tap to start and Web Audio with no page errors; a "new app" mock skips Tap to start and Test sound calls `nativePromise("KitchenAlarm", "play", {sound: "alarm"})`.

**Later checks on the tablet (23:30, Kitchen Dev, quiet beeps only):** Sound off: order #0051 popped up and nothing played (no new MediaPlayer in `dumpsys audio`). Alarm loudness → Quiet: one beep, Alarm volume 11 → 4 during it → back to 11, and the button reads "Sound on · Quiet". Still not seen live: reminders (only while open; same `playChime({ loud: true })` path) and restore-after-kill. Medium and Loud with the loudness setting weren't played on the tablet (owner wanted quiet test beeps); Loud = max was checked before the setting existed.

**Reload on deploy (owner's request, after the push):** `useReloadOnDeploy` in `KitchenApp.jsx`, **only in the app with the native alarm**: in a browser a reload brings back Tap to start, so the kitchen would be silent until someone tapped. Every 5 min it fetches `/kitchen` (`Accept: text/html`) and compares the main `<script src="/assets/index-<hash>.js">` with the running one (none in the Vite dev server, so it's off there). When a new version is out, it reloads once the screen has been untouched for 2 min and no popup, dialog, menu or cancelled-order banner is up, and only if a fresh fetch of `/kitchen` succeeds right then (no error page after a Wi-Fi drop; `offline.html` retries by itself anyway). The session cookie survives the reload; the headless test checked it is still signed in afterwards. Tested in headless Chrome against `vite preview` with Playwright's fake clock and a rewritten script hash: reloads when idle; not for the same version, with a dialog open, within 2 min of a touch, or in a browser. Phase 4's "Update the Kitchen app" check can reuse this.

**Pushed 2026-10-04 ~23:35 (`bf60534..d1e8c59`, which also included the docs commit `2bbb890`).** Live check: the deployed admin chunk has the KitchenAlarm code. On the tablet, the real Kitchen app (signed in by the owner, **as an admin account**) shows no Tap to start or Install app, and ⋮ has Alarm loudness (Loud by default on that device). Kitchen Dev was uninstalled again, and the local servers and ngrok were stopped.

**Debugging the app's WebView from WSL:** `adb.exe forward tcp:9229 localabstract:webview_devtools_remote_<pid>` (pid from `adb.exe shell pidof com.mardinis.kitchen.dev`; debug builds only). WSL can't reach Windows' localhost, so talk to it from PowerShell: scripts in `C:\Users\Alfred\AppData\Local\Temp\kcdp\` (`eval.ps1 "<js>"` runs Runtime.evaluate; `logs.ps1` dumps buffered console errors). Don't `pkill -f kcdp`: it kills your own shell.

**Tablet state at the end of 2026-10-04 (owner asked for one app):** only the native **Kitchen 1.1** (release, production URL) is installed, on the main home screen where the old shortcut was. Removed: Kitchen Dev (`adb.exe uninstall com.mardinis.kitchen.dev`; reinstall with `build-apk.sh --dev --install` for testing, then uninstall again), the Chrome kitchen PWA (`org.chromium.webapk.a19eeb1fc8f3489a7_v2`) and a "Mardini's Kitchen" Chrome home-screen shortcut. **Kitchen needs to be signed in with the kitchen account before service.** Until the web changes are pushed, it runs today's production kitchen (Tap to start, Web Audio, Install app button), plus the native screen-on and full screen. The native alarm and Alarm loudness switch on with the push, because the 1.1 APK already has the plugin.

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

**Status (2026-10-05, ~00:45):** code done and committed (`8b4e904` server, `35c89e3` app + web), **not pushed, not yet tested on the tablet**. Waiting for the owner's Firebase files. Server specs: 138 pass (14 in `spec/requests/kitchen_push_spec.rb`).

**Owner's choices:** Firebase project in the owner's **personal** Google account. Devices of users who are **kitchen or admin** right now ring (the tablet is signed in as an admin).

**Owner steps given (console.firebase.google.com):** project "Mardinis Kitchen", Analytics off; Android apps `com.mardinis.kitchen` **and** `com.mardinis.kitchen.dev`; download `google-services.json` (after adding both, so it covers both) → `kitchen-android/android/app/` (gitignored); Project settings → Service accounts → Generate new private key → move to `~/keys/firebase-service-account.json` (600). Then: `.env.local` gets `FIREBASE_SERVICE_ACCOUNT_JSON` (one-line JSON, never printed), and the owner pastes the file's contents into Render as `FIREBASE_SERVICE_ACCOUNT_JSON` (`render.yaml` has it with `sync: false`).

**Research (2026-10-05, from a research subagent; links in its report):** Firebase BoM 34.19.0 (firebase-messaging 25.1.3); google-services plugin 4.4.4 (Capacitor's) is fine. Data-only messages always reach `onMessageReceived`; swiped-away apps still get them, **force-stopped apps don't** until opened again (a fresh install counts as stopped until first launch). High-priority FCM is on Android's list of allowed foreground-service starts from the background; FCM demotes high priority if no notification is shown, so we always show one. Android 14 `USE_FULL_SCREEN_INTENT` is granted by default to non-Play installs (check `canUseFullScreenIntent()`). Full-screen intent: screen off/locked → the activity opens; screen on and in use → heads-up banner. `getToken()`/`onNewToken` are deprecated in firebase-messaging 25.1 (new: Firebase Installation IDs) but still work with no removal date; we use tokens. Samsung: add Kitchen to **Never sleeping apps** and set battery to **Unrestricted** (Phase 4 checklist). FCM v1 errors: delete tokens on `UNREGISTERED` / `SENDER_ID_MISMATCH` only; retry 429/5xx.

**Server:** `device_tokens` (user, unique token, platform, last_seen_at; RLS on). `POST /api/admin/devices {token, platform}` (staff only, upsert, moves the token to the current user, touches last_seen_at; `rate_limit` name "devices") and `DELETE /api/admin/devices?token=` (own only; the token param is log-filtered). `KitchenPush` (`app/services/kitchen_push.rb`): googleauth 1.17 OAuth token (cached, renewed 5 min early) + Net::HTTP to FCM v1, 5s timeouts; data `{type: "new_order", order_id, number}`, `android.priority: "high"`, `ttl: "600s"`, no collapse key. Sent from `Order#ring_kitchen` (`after_commit` when `placed_at` is set, i.e. `mark_placed!`, the same hook as the confirmation email) on a background thread in `Rails.application.executor.wrap` (`KitchenPush.inline = true` in specs). One retry on 401 (fresh OAuth token) / 429 / 5xx / network errors. Per-device errors don't stop the others; nothing raises into ordering; does nothing without the env var. A plain 404 doesn't delete tokens (a wrong project id would otherwise wipe them all).

**App (1.2, versionCode 3):**
- `KitchenMessagingService`: on `new_order` it saves the order id (`PendingOrders`, SharedPreferences). If the kitchen is on screen (`MainActivity` resumed) it fires window event `kitchenpushorder`; otherwise it starts `AlarmService`.
- `AlarmService`: a `mediaPlayback` foreground service with a partial wake lock. Rings `AlarmPlayer` every 20s at the page's loudness (silent if Sound is off). Its notification (`OrderNotifications`, channel `new_orders`, silent, IMPORTANCE_HIGH, category alarm, full-screen intent → `MainActivity` with `EXTRA_ALARM`) wakes and opens the kitchen. Stops when `MainActivity` resumes, when the page takes the orders, or after 10 min. If Android refuses the service, it falls back to a notification on channel `new_orders_backup` (the alarm as its sound, `FLAG_INSISTENT`, 10-min timeout).
- `MainActivity`: registers `KitchenPushPlugin`, creates the channels, asks for POST_NOTIFICATIONS (Android 13+). For `EXTRA_ALARM` it sets `setShowWhenLocked` / `setTurnScreenOn` / `requestDismissKeyguard` (these stay on for that activity instance afterwards). `onResume` stops the alarm and fires `kitchenpushpending` if orders are waiting. Static `sendToPage` / `sendToVisiblePage` → `bridge.triggerWindowJSEvent` (data becomes event properties).
- `KitchenPushPlugin` ("KitchenPush"): `getToken` (rejects `NOT_CONFIGURED` without google-services.json), `takePendingOrders` (also stops the alarm), `status` → `{notifications, fullScreen, battery}`, `openSettings({which})`. `KitchenAlarmPlugin` gained `setSound({on, volume})`; `AlarmPlayer` now holds the player, volume save/restore and the mirrored sound settings for both.
- Web: `native.js` `bridgePlugin()` builds `nativeAlarm()` / `nativePush()`. `kitchenPush.jsx` `useKitchenPush(level)` registers the token (each launch + `kitchenpushtoken`), takes pending orders on mount and on `kitchenpushorder` / `kitchenpushpending` → `AdminContext.alertOrders(ids)` (loads orders, pops up the ones still "new", one chime, no duplicates via `unackedRef`), mirrors Sound/loudness, and returns `unregister()`, which Log out calls first. `PushStatusBanner`: an amber bar with a "Turn on" button when status shows something off (checked every 30s and on visibilitychange).
- Headless Chrome with a fake bridge (`push.mjs` in the scratchpad, dev and production builds): registration, sign-out DELETE, popup on fresh load with a pending order, on a push while on screen, none for a non-new order, banner + openSettings, and nothing in a browser. Fixed: React's double mount dropped taken orders.

**Update 2026-10-05/06 (Firebase done, tested live, pushed):**
- Firebase project id **`mardinis`** (owner's personal Google account). `google-services.json` (in `kitchen-android/android/app/`, gitignored) now has **both `com.mardinis.kitchen` and `com.mardinis.kitchen.dev`** (the owner added the dev app on 2026-10-06; the real app's entry was unchanged, so the installed 1.2 didn't need rebuilding). Dev and release builds both work. Key: `~/keys/firebase-service-account.json` (600) and `.env.local` `FIREBASE_SERVICE_ACCOUNT_JSON` (single-quoted compact JSON). The owner set the same in Render (I piped it to the Windows clipboard with `clip.exe`, never printed). Local `bin/rails runner` confirmed an OAuth token.
- Release **1.2 (versionCode 3)** was installed over USB, after the review fixes too. The owner allowed notifications, set battery to unrestricted (the PushStatusBanner "Turn on" flow worked), and Sound on · Quiet. `USE_FULL_SCREEN_INTENT` was granted by default (sideloaded).
- **Live tests passed:** (1) Kitchen swiped away + screen off → pay-at-pickup order from the owner's phone → the tablet woke, Kitchen opened, and the alarm played (`dumpsys audio`: AlarmService's USAGE_ALARM player at 21:53:22, the page's popup alarm at :25). (2) Kitchen open → popup about 2 s after placing the order. (3) After the review fixes (`onStop` clearing show-when-locked): screen-off test passed again (owner confirmed 2026-10-06). The owner cancelled all TEST orders.
- `/code-review` (high) on Phase 3, fixed: `build-apk.sh` requires google-services.json with the package being built; `alertOrders` retries when a racing mutation made `loadOrders` skip its result; show-when-locked/turn-screen-on cleared in `onStop`; the kitchen page reports itself via `KitchenPush.setKitchenOpen` (reset on page load), so pushes ring natively on other in-app pages. Not changed: FCM may demote high-priority pushes handled silently while the kitchen is open; watch for slow alerts.
- **Kitchen screen redesign (owner's request, pushed 2026-10-06 `a034e89`):** no New/Preparing/Ready tabs. Upcoming + one **"Being made"** list (all of today's active orders, NEW tag on unstarted ones). The popup has one **Got it** (→ preparing; later-day orders still get "Got it · it's in Upcoming"). The big **Ready** under the selected order marks it **completed** directly (`useAdvanceOrder` takes a target status; "Picked up" for orders already marked ready elsewhere). **No toasts on /kitchen** (`useAdvanceOrder({ quiet: true })` + CSS hides `.Toastify` under `.adm-kitchen`), so there's no Undo; a manager reopens an order from Admin → History. Server: `advance_to!("completed")` sets `ready_at` if missing; moving a completed pay-at-pickup order back un-marks the payment and clears `completed_at` (spec in security_spec). The admin Live Orders board is unchanged. **HANDOFF's "Kitchen screen" section must be updated for this in Phase 4.**

**Still to do:** owner's Firebase files → dev APK with google-services.json → tablet tests (app open; app in background; screen off; swiped away; Sound off) → release APK 1.2 over USB (the owner said not to update **the web** over the cable; a native change has to be installed over USB or by copying the APK) → `/code-review` → deploy (migration runs on deploy) → owner sets the Render env var → real order test. Also check that the deprecated `getToken` keeps working.

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

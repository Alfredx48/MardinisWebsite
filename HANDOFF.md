# Handoff: Mardini's Deli Cafe website

Context for a new Claude Code session picking up this project. Last updated 2026-10-06. Nothing in here is secret; real secrets live only in Render, Supabase and the gitignored `.env.supabase` / `.env.local`.

## TL;DR

- Family restaurant website + online ordering + admin/kitchen portal for **Mardini's Deli Cafe**, 408 Willow Rd, Menlo Park, CA (a real business run by the owner's family).
- **Live:** https://mardinismenlopark.com (also https://mardinis.onrender.com). Auto-deploys from `main` on GitHub `Alfredx48/MardinisWebsite`.
- **Stack:** Ruby 3.4.10 / Rails 8.1.4 API + React 18 SPA built with **Vite**, Postgres on Supabase, photos in Supabase Storage, hosted on Render.
- **State:** menu photos, sizes and options, refunds and customer cancellation, password resets and order confirmation emails, per-item names, **group orders**, **catering ordering** and the kitchen's **Upcoming** list with reminders are all live, and (2026-10-04..06) the **Android Kitchen app** with **push alerts** and a simpler kitchen screen. 140 RSpec specs pass.
- **Kitchen screen (`/kitchen`) + Kitchen role: live since 2026-09-27.** The restaurant's **Samsung Galaxy Tab A7 Lite** runs it in the native **Kitchen** Android app (`kitchen-android/`), which loads the live page. The owner tests in a browser on their own iPad, so both must keep working. See "Kitchen screen" and "Android Kitchen app" below.

## Changes on 2026-10-04 to 2026-10-06 (all pushed and live)

Commits `3a29942` and later, up to the commit that deleted the temporary `ANDROID-PLAN.md` (pushed 2026-10-06). Kitchen app 1.3 is installed on the tablet.
- **Android Kitchen app** (`kitchen-android/`, Capacitor 8): a full-screen shell that loads the live `/kitchen`. It keeps the screen on, plays the alarm on Android's **Alarm** volume with no "Tap to start", rings for **push alerts** even when closed or asleep, reopens itself after a restart, shows an offline page with automatic retry, and reloads itself after a web deploy. See "Android Kitchen app".
- **Push alerts:** every new order is pushed through Firebase Cloud Messaging to the devices of kitchen staff and admins (`device_tokens`, `KitchenPush`, `FIREBASE_SERVICE_ACCOUNT_JSON`). The 10-second polling stays as the backup.
- **Kitchen screen redesign:** one "Being made" list instead of New / Preparing / Ready tabs, **Got it** on the new-order popup, **Ready** marks an order picked up, and no toasts on /kitchen. See "Kitchen screen".
- **Alarm loudness** (kitchen ⋮): Loud / Medium / Quiet / Off per device.
- **Offline banner** wording: "Can't reach the server, so new orders may be missing", now also when orders never loaded.

## Changes on 2026-10-03 (all pushed and live)

Commits `e8ea2b5`..`bf60534`.
- **Show/Hide password:** every password box (sign in, create account, reset password, change password, kitchen sign-in) has a Show / Hide button inside it (`PasswordInput` in `components/ui.jsx`). Shown passwords don't autocapitalize or autocorrect.
- **Cloudflare Web Analytics** on customer pages only. See "Production setup".

## Changes on 2026-10-02 (all pushed and live)

Commits `bd5a2e5`..`f83cf61`. Details are in the sections linked.
- **Prices:** lamb kabob upcharge (+$1.50 as a combo pick, $7.50 as a plate "Add Extra") and odd prices rounded (bottled drinks, snacks, California Burger), applied by the owner's script. See "Menu status".
- **Option prices** show on their own line under each option name in the item dialog.
- **Louder kitchen alarm** for the Tab A7 Lite, plus ⋮ → Test sound. See "Kitchen screen".
- **Names on items** (`order_items.label`): one name box per item in the item dialog and the cart; staff screens group identical items with name tags. See `OrderItem` under "Architecture".
- **Group orders** with I'm done, per-person limits and deadlines, promoted across the site. See "Group orders".
- **Catering ordering** at `/catering` from the owner's new catering menu (5 sections, 21 items, added by the owner's script). See "Catering orders".
- **Typeable quantities:** the number in every quantity stepper can be typed (up to 50 per line, 200 for catering items).
- **Kitchen Upcoming list + reminders** 3 days and 1 day before pickup. See "Kitchen screen".
- Fixed: Rails `rate_limit`s without a `name:` shared one counter per controller (group orders and password resets).

## Working with the owner

- **Pushing to `main` deploys to production immediately** (a deploy now takes ~2 minutes). Commit freely, but push only when the owner says so.
- **Production database writes are blocked for Claude** by a permission rule. The pattern that works: write a one-off Rails runner script that's idempotent, checks each row (id + name + expected current value) and supports `--dry-run`; dry-run it against the local DB; then give the owner a wrapper to run: `bash <script>.sh --dry-run`, then without the flag. See "Applying data changes" below.
- Reading the public site (`curl https://mardinismenlopark.com/api/menu`) is fine and is how to verify a data change landed.
- **Another Claude session ("Family restaurant website overhaul") has also edited this repo.** Before committing, run `git status` and look for changes you didn't make; don't commit someone else's half-finished work without asking.
- The owner prefers short answers, decisions via multiple choice, and to approve anything customer-facing (photos, prices, descriptions) before it goes live.

## Repo & git

- Path: `~/projects/MardinisWebsite` (WSL Ubuntu on Windows). Remote: `https://github.com/Alfredx48/MardinisWebsite.git`.
- `main` = deployed = `origin/main` (pushed 2026-10-06 with the Android app's Phase 4). Old remote branches (`alfred`, `dev`, `stripe`, `style`) are from the 2023 bootcamp version.
- `Mardinis Menus/` at the repo root is the owner's untracked folder (printed-menu PDFs, `Price Changes.csv`); don't commit it. Their newest menu files live on Windows in `C:\Users\Alfred\Documents\Mardinis Menus\6 - Original (Enhanced)` (`/mnt/c/...` from WSL).
- Leftover junk the owner may delete: two empty SQLite files at repo root, `react_rails_api_project_template_development` and `..._test` (tracked, unused).

## Local development

- Ruby via **rbenv** (`~/.rbenv`). Shell PATH needs `export PATH="$HOME/.rbenv/shims:$PATH"`. `.ruby-version` = 3.4.10 (3.4.11 is also installed; don't switch, Render compatibility).
- Node 24 locally (nvm), Node 22 on Render (`.node-version`). Vite 8 needs Node ≥ 22.12. Local Postgres is running (WSL).
- Local DBs (names kept from the bootcamp template): `react_rails_api_project_template_development` / `_test`. Dev data includes a dev-only admin `admin@example.com` / `password123`, a couple of test orders, and the imported menu. Local item ids for items added after the original seed **don't match production ids**, and item 18 is misspelled "Lam Kabob Plate" locally. The local DB **doesn't** have the 2026-10-02 price changes (e.g. Add Extra lamb is still $7.00 locally), but it does have the catering menu (added through the local admin API) and a few test catering/group orders. Pay at pickup is off locally, so local checkout needs Stripe's test card 4242 4242 4242 4242.
- Writing to the local DB with `bin/rails runner` (even non-production) was blocked once by the permission classifier; changing local data through the local admin API (`POST /api/login` as the dev admin, then `/api/admin/...`) works.
- `bin/dev` runs Rails on :3000 + the Vite dev server on :4000 (open http://localhost:4000; Vite proxies `/api` to :3000). Stop them by port (`ss -ltnp`), not `pkill -f`, which can match your own shell. Started as a Claude background task, they stop when the task's timeout runs out (default 30 min; pass a long one). If a page says "Can't reach the server", check they're still up. **Port 3000 clash:** the owner's other project (`~/projects/Portfolio`, a Vite server started with `--port 3000 --strictPort`) may be holding :3000, and then Rails can't start while Vite on :4000 forwards `/api` to the wrong app (logins 404). Check `ss -ltnp`; don't kill the Portfolio server without asking.
- **Phone/tablet testing via ngrok:** `ngrok http 4000`. Vite already allows ngrok hosts (`client/vite.config.js`) and so does Rails dev (`config/environments/development.rb`).
- Tests: `bundle exec rspec` (140 examples). Frontend: `npm run lint --prefix client` and `npm run build --prefix client`. Running the root `npm run build` (what Render runs) rewrites `public/`; restore with `git checkout public && git clean -fq public`.
- `.env.local` (gitignored) holds local secrets, including `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, and dotenv loads it in development. **Never print it.**
- **Headless browser testing** isn't installed permanently. To recreate: `npm i playwright-core@latest` in a scratch dir, and use the cached Chromium headless shell at `~/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`. It needs `libnspr4 libnss3 libasound2t64`: `apt-get download` them (no sudo), `dpkg-deb -x` them into a dir, and set `LD_LIBRARY_PATH=<dir>/usr/lib/x86_64-linux-gnu`. Log in by POSTing to `/api/login` with `page.request` (it shares the page's cookies). Pillow/ImageMagick aren't installed; crop images with a canvas in that browser. `dig` isn't installed; use `https://dns.google/resolve?name=...&type=A`. Stripe's card fields can be filled with `page.frameLocator("iframe[title*='Secure payment input']")`. Vite 8 doesn't ship esbuild; to run a client module in plain Node, copy it with its imports shimmed (they're extensionless).

## Production setup

**Render** (web service "Mardinis", id `srv-ceucbikgqg40d6hgobe0`, **Starter plan**, ~$7/mo per the owner on 2026-09-27: always on, no cold starts; outbound SMTP isn't blocked, unlike the free plan)
- Build `./bin/render-build.sh`: bundle install → root `npm run build` (`npm ci` + `vite build` into `client/build`, copied to `public/`) → `rails db:migrate` → `rails db:seed` (idempotent).
- Start `bundle exec puma -C config/puma.rb`, health check `/up`. A failed build keeps the previous version live.
- Env vars set in Render: `FIREBASE_SERVICE_ACCOUNT_JSON` (push alerts, see "Android Kitchen app"; `render.yaml` lists it with `sync: false`), `DATABASE_URL`, `RAILS_ENV=production`, `BUNDLE_WITHOUT=development:test`, `NODE_VERSION=22`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `RAILS_MASTER_KEY` (unused 2023 leftover), a secret-key var, and for photo uploads `SUPABASE_URL` + `SUPABASE_SECRET_KEY` (the owner was asked to add these two; confirm by trying an upload in Admin → Menu).
- **Caching** (`config/environments/production.rb`, `lib/middleware/immutable_assets.rb`): `/` and every page go through `FallbackController` and always revalidate; Vite's hashed `/assets/*` are cached a year (`immutable`); other public files (icons, manifest) an hour. Keep the page shell uncached: it names the current asset files, and each deploy deletes the old ones.
- Custom domain: `mardinismenlopark.com` + `www` (www redirects to the root). TLS by Render.

**Cloudflare Web Analytics** (added 2026-10-03; the owner's Cloudflare account; no cookies, so no cookie banner needed)
- The beacon (`static.cloudflareinsights.com/beacon.min.js`, token `b2de88a9d44c4dd49ceee50403c4da26`, which is public by design) is added by a small inline script at the end of `client/index.html`, **only when the page isn't under `/admin` or `/kitchen`**, so staff screens aren't counted.
- Because the beacon follows in-app page changes, links from the public site into staff pages do a **full page load**: the header's Admin/Kitchen links are plain `<a href>`, and sign-in / password-reset redirects use `goAfterSignIn` (`client/src/staffPages.js`). Keep that for any new link into `/admin` or `/kitchen`.
- There's no content security policy; if one is added, allow `static.cloudflareinsights.com` (script) and `cloudflareinsights.com` (beacon requests).

**Firebase** (push alerts; added 2026-10-05; project "Mardinis Kitchen", id **`mardinis`**, in the owner's **personal** Google account, Analytics off)
- Two Android apps: `com.mardinis.kitchen` (the real app) and `com.mardinis.kitchen.dev` (Kitchen Dev). Their config is `kitchen-android/android/app/google-services.json` (gitignored; download again from Project settings → Your apps if it's lost; it isn't secret, but it stays out of git).
- The server's key: Project settings → Service accounts → Generate new private key. Kept in `~/keys/firebase-service-account.json` (mode 600), in `.env.local` as `FIREBASE_SERVICE_ACCOUNT_JSON` (single-quoted, one-line JSON) and in Render. **Never print it**; to paste it into Render, pipe the file to `clip.exe`.

**GoDaddy DNS**: `A @ 216.24.57.1`, `CNAME www mardinis.onrender.com`. Leave the `CNAME pay` and `_domainconnect` records alone. No domain forwarding; it would break Render.

**Supabase** (project ref `jyazfpwyxwqpkbjkengj`, region us-west-2)
- Postgres: Render's `DATABASE_URL` = the **Session pooler** string (port 5432). Not the transaction pooler (6543) or the direct connection (IPv6). A local copy is in `.env.supabase` as `SUPABASE_DATABASE_URL`; never print it.
- RLS is on for every table and the `anon`/`authenticated` roles are revoked (migration `20260925000001`; the refunds migration enables RLS on its own table). **Any new table must `ENABLE ROW LEVEL SECURITY` in its migration.** The app doesn't use Supabase's Data API; keep it that way.
- Storage: public bucket **`menu-photos`** (JPG/PNG/WebP, 5 MB max). `app/services/photo_storage.rb` uploads with the secret key; `rails photos:setup_bucket` creates the bucket (already done). All 28 menu photos live under `menu-photos/items/`.
- Free tier pauses after ~1 week idle; restore from the Supabase dashboard if the site starts erroring.

**Stripe**
- The owner's Stripe dashboard showed a real $1.76 charge + refund (balance −$0.35, the fee Stripe keeps on refunds), so **live keys may now be in Render**. Confirm with the owner before assuming test mode.
- The owner wanted pay-at-pickup only at one point; Card payments were on as of 2026-10-02. Catering orders are card-only, so turning card payments off stops online catering.
- Every refunded card order costs the restaurant Stripe's fee (~2.9% + $0.30). Customers can cancel their own orders until the kitchen starts them; the owner hasn't decided whether to absorb that fee.
- **Apple Pay / Google Pay** show as tabs in the Payment Element once `mardinismenlopark.com` (and `www.`) are registered under Stripe → Settings → Payment method domains, and Apple Pay / Google Pay are on under Payment methods. They only show in Safari with a card in Apple Wallet, or Chrome with a saved Google Pay card. On 2026-09-28 the owner reported they weren't showing; asked them to register the domains.
- **Link "$5 back" (Instant Bank Payments):** Stripe funds it and the restaurant gets the full amount. It confirms instantly. The owner wanted the offer hidden (Stripe → Settings → Link). **Keep ACH Direct Debit off**: it takes days to confirm, and those orders would stay `awaiting_payment`, hidden from the kitchen.
- Checkout starts downloading Stripe.js when the page opens (`getStripe` in `CheckoutPage`), and shows a loading state until the Payment Element is ready. A faster option is Stripe's deferred-intent flow (render the Payment Element before the order exists), which hasn't been built.
- Local `.env.local` has **test** Stripe keys (confirmed by the owner 2026-10-02).
- Webhook (optional): `STRIPE_WEBHOOK_SECRET` + endpoint `https://mardinismenlopark.com/api/stripe/webhook`.

## Architecture

**Backend** (`app/`)
- `services/checkout.rb`: builds orders from the browser cart. **All prices, tax and tip are computed server-side**; the client sends item ids, sizes and quantities only. It validates availability, open/closed and pickup slots, and catering rules. `priced_lines` is public (group orders use it). `services/order_placement.rb` (`OrderPlacement.start!`) saves the order and either sends it to the kitchen (pay at pickup) or creates the Stripe PaymentIntent; used by normal and group checkout.
- `services/payments.rb`: Stripe wrapper (PaymentIntent, confirm/sync, refund, cancel intent). Card orders stay `awaiting_payment` until Stripe confirms the full amount.
- `services/order_cancellation.rb`: cancels + refunds in full; used by customers (`POST /api/orders/:token/cancel`, only while `awaiting_payment`/`new`) and by staff ("Refund & cancel").
- `services/photo_storage.rb`: Supabase Storage uploads (checks file signatures, not the declared type).
- `services/kitchen_push.rb`: push alerts to the kitchen devices through FCM. See "Android Kitchen app".
- `services/email_sender.rb`, `order_confirmation.rb`, `group_order_email.rb`: see "Email".
- `presenters/presenters.rb`: explicit JSON shapes for every response; no serializers, so nothing leaks through associations.
- Models:
  - `Restaurant`: settings; `hours` jsonb keyed `sun..sat` `{open, close, closed}`; tax, prep time, open-now, pickup slots (up to 2 days ahead), catering pickup rules (`CATERING_NOTICE`, `CATERING_DAYS_AHEAD`); `hero_image` (home banner URL); timezone Pacific.
  - `Category` (`active` = visible, `catering` = on the catering menu instead of the regular one), `MenuItem`: `available` = "sold out" switch; `featured`, `vegetarian`, `spicy`, `position`, `image` (URL), and **`sizes`** (jsonb `[{name, price}]`; when present the customer must pick one, and `price` is kept at the lowest size price).
  - `Order`: `awaiting_payment → new → preparing → ready → completed`, plus `cancelled` (`Order::KITCHEN_FLOW`); `refunded_amount`; `catering`; `reminder_3_days_seen_at` / `reminder_1_day_seen_at`; a random `token` powers public tracking at `/order/:token`.
  - `ModifierGroup` (+ `MenuItemModifierGroup` join): reusable option groups such as "Bread Choice" (`min_select`/`max_select`, nil max = no limit, `options` jsonb `[{name, price}]`), attached to items in order via `MenuItem#assign_modifier_groups!`. Checkout validates every group's limits and adds option prices to the line.
  - `OrderItem`: optional `label` (up to 40 chars): a name to write on the item for group/office orders. In the browser a cart line keeps one name per unit (`labels`, in `client/src/itemNames.js`), set in the item dialog ("+ Add names", one box per item) or in the cart ("+ Add a name" / "Edit names"); checkout sends one order line per distinct name. Staff screens (kitchen, live orders, printed ticket) and the order page merge lines that differ only by name back together (`groupByName`): "3 Falafel Wrap · For: [Sarah] [Mike] [Ana]". Order detail (refunds) and the confirmation email stay per line. Snapshots `item_name` (including the size, e.g. "Hummus (Pint)"), `size`, `unit_price` (including options) and `modifiers` (jsonb `[{group_id, group, option, price}]`, shown on tickets under the item).
  - `GroupOrder`, `GroupOrderParticipant`, `GroupOrderItem`: see "Group orders".
  - `Refund`, `CateringInquiry`, `User` (`admin` and `kitchen` booleans; `role` = customer / kitchen / admin; `staff?` = either).
  - `DeviceToken` (user, unique FCM `token`, `platform` "android", `last_seen_at`; RLS on): the Kitchen app installs that get pushes. `for_kitchen` = devices whose user is kitchen staff or an admin **right now**.
- Controllers: public `api/restaurant` (`/api/restaurant`, `/api/menu`, active categories only), `api/orders`, `api/users`/`api/sessions` (cookie session `_mardinis_session`, `SameSite=Strict`), `api/catering_inquiries`, `api/group_orders`, `api/stripe_webhooks`. Admin, all behind `require_admin` (orders and `devices` also allow kitchen staff): `api/admin/*` (orders + refund + reminder, **devices** (the app's push token), categories, menu_items + reorder, **photos** upload, **modifier_groups**, restaurant settings, users, catering, stats). `FallbackController` serves the SPA for `/` and every non-API route.

**Frontend** (`client/`, Vite; JSX files use `.jsx`; entry `client/index.html` → `src/index.jsx`)
- `context/`: `AuthContext`, `RestaurantContext` (restaurant + menu, refreshed every 5 min; split into `menu`, `cateringMenu` and `fullMenu`), `CartContext` (localStorage cart `mardinis-cart-v1`; lines keyed by item + size + options + request, each with `labels` (one name per unit) and `catering`; `quantityLimit()` = 50, or 200 for catering). `CartContext` is exported so group orders can swap in their own cart.
- `native.js`: `isKitchenApp()` and the Android app's native plugins (`nativeAlarm()`, `nativePush()`, `nativeApp()`), each null in browsers and in older app versions. See "Android Kitchen app".
- `modifiers.js`: option helpers shared by the menu dialog, cart and order displays (`picksProblem`, `picksTotal`, `modifierText`...). `itemNames.js`: per-item name helpers (`fitNames`, `splitByName`, `groupByName`, `namesText`). `groupOrder.js`: group order keys, pricing for display, invite `mailto:`. `catering.js`: catering pickup days/times.
- `pages/`: Home, Menu (the ordering page at `/menu`, item dialog with size and option pickers), MenuView (`/our-menu`, a read-only menu styled like the printed dine-in menu, built from live data; the PDF it links to is `client/public/menus/mardinis-menu.pdf`), Checkout (Stripe Payment Element via `@stripe/stripe-js/pure`; also runs group checkout through an optional `checkout` object on the cart, and catering pickup/payment rules), OrderStatus (customer cancel), About, Catering (orderable catering menu + message form), GroupStart / GroupOrder / GroupCheckout, Policy, Login, Account, NotFound. `MenuPage` takes `hero`, `menu`, `after` and `hideFloatingCart` props, which the catering and group pages use.
- `components/ui.jsx`: `DishImage` (gradient + initials placeholder when a photo is missing or fails), `Modal`, `QuantityStepper` (the number can be typed), `PasswordInput` (Show/Hide), `Switch`. `components/ItemNames.jsx` (name boxes, cart name editor), `components/GroupOrderPromo.jsx`. `format.js`: `money`, `priceLabel` ("from $X" for sized items).
- `styles/base.css` holds design tokens (cream/terracotta/olive; Fraunces + DM Sans); `styles/site.css` the public site.
- `admin/`: lazy-loaded bundle at `/admin/*` (`AdminApp.jsx` routes: `/admin`, `/admin/orders` = Live Orders, `/admin/history`, `/admin/menu`, `/admin/catering`, `/admin/users`, `/admin/settings`).
  - `AdminLayout` (sidebar; top bar under 900px), `Dashboard`, `LiveOrders`, `OrderDetail` (refunds), `PrintTicket`, `OrderHistory`, `MenuManager` (sizes editor, photo upload, option groups per item), `OptionsManager` (`/admin/options`, edit option groups), `CateringInbox`, `Customers`, `Settings`.
  - `AdminContext` owns order polling and the new-order chime, so the chime rings on every admin page. `alertOrders(ids)` pops up orders pushed to the Android app.
  - `KitchenApp.jsx` (kitchen shell), `KitchenOrders.jsx` (its orders), `kitchenPush.jsx` (`useKitchenPush`, `PushStatusBanner`), `upcoming.js`.
  - `adminUi.jsx`: shared UI + `usePolling`, `PaymentBadge`, `CateringBadge`. `adminUtils.js`: prefs in `localStorage` under `mardinis.admin.*`, Web Audio chime, CSV export, `shrinkPhoto`.
  - `admin.css`: all admin classes are prefixed `adm-`.
  - `MenuManager` category editor has a "Catering menu" checkbox.
- Conventions: tabs, double quotes, semicolons; function components + hooks; API calls go through `api.js` (throws `ApiError`; `api.upload` for FormData; toast `e.message`). Keep new admin CSS `adm-`-prefixed and use the base.css tokens.

## Kitchen screen (`/kitchen`)

A full-screen order screen for a kitchen tablet, laid out like the DoorDash / Uber Eats merchant tablets. The restaurant's tablet runs it in the **Android Kitchen app** (next section); browsers (the owner's iPad, a desktop) can still open it or install it as a home-screen app. Code: `client/src/admin/KitchenApp.jsx` (shell: top bar, sound, wake lock, install, login, banners, reload on deploy) + `KitchenOrders.jsx` (Upcoming, the "Being made" list, order panel, new-order and reminder popups) + `kitchenPush.jsx` + `upcoming.js` + `kitchen.css`, using `AdminProvider kitchen`, and `useAdvanceOrder` / `urgency` / `PickupInfo` from `LiveOrders.jsx`.

- **Access:** admins and users with `kitchen: true`. Kitchen users can list active orders, view and move orders, edit staff notes, cancel pay-at-pickup orders and register their device for push alerts. They **can't** refund, cancel orders paid online (403, and the UI says "ask a manager"), browse order history, or reach any other `/api/admin/*` endpoint. They're sent from `/admin` to `/kitchen`. Specs are in `spec/requests/security_spec.rb` ("kitchen staff").
- **Setting up a cook:** they sign up as a customer, then Admin → Customers → Access → Kitchen (`PATCH /api/admin/users/:id {role}`). The tablet is currently signed in **as an admin account** (the owner's choice).
- **Login:** `/kitchen` has its own sign-in screen, so the installed app never leaves the page. Sessions have `expire_after: 30.days`, renewed on every request (`config/application.rb`, applies to everyone), so the tablet stays signed in across restarts.
- **Layout (redesigned 2026-10-06 at the owner's request):** left: the blue **Upcoming** button, then one **"Being made"** list with all of today's active orders (a NEW tag on ones nobody has started). Right: the selected order large: order note, then each item with a quantity box (dark when > 1), names as name tags (identical items grouped), options grouped by group (`modifierGroups` in `client/src/modifiers.js`; "No …" options in red), special requests, and one big **Ready** button. **Ready marks the order picked up** (`completed`, and paid if paying at pickup; the server also sets `ready_at`); an order already marked ready on the admin board shows "Picked up" instead. When an order is done, the next one opens. Elapsed-time colors: green < 5 min, yellow < 10, orange < 15, red after (scheduled orders go by how soon they're due; upcoming orders say "Tomorrow" / "In N days"). Catering orders carry a dark red Catering badge. Phones: the list becomes a swipeable row above the order. The admin Live Orders board still has New / Preparing / Ready.
- **New orders:** a full-screen popup (one at a time, "+N more") showing the whole order with one **Got it** button, which moves it to Preparing. An order for a later day gets "Got it · it's in Upcoming" instead. The screen frame flashes until every popup is acknowledged.
- **No toasts on /kitchen** (`useAdvanceOrder({ quiet: true })`, and CSS hides `.Toastify` under `.adm-kitchen`), so there's no Undo. A manager reopens an order marked done by mistake from Admin → History; moving a completed pay-at-pickup order back un-marks the payment and clears `completed_at`.
- **Sound:** the kitchen alarm (`playKitchenAlarm` in `adminUtils.js`) is three square-wave ding-dongs held near full volume. It **repeats every 20s** while any new order hasn't been acknowledged (admin pages keep the softer sine chime). ⋮ → **Test sound** plays it; ⋮ → **Alarm loudness**: Loud / Medium / Quiet / Off per device (`localStorage` `mardinis.admin.alarmLevel`; Off = Sound off; `ALARM_LEVELS` in `adminUtils.js`); the Sound button reads "Sound on · Quiet" when it isn't Loud. In the Android app the same sounds play natively on the Alarm volume (see next section). In browsers: Web Audio, a full-screen "Tap to start" on launch, "Tap to turn sound back on" when iOS suspends audio, and `navigator.audioSession.type = "playback"` so iOS plays even on silent.
- **Screen:** the Android app keeps the screen on by itself. Browsers use the Screen Wake Lock (re-requested on `visibilitychange`); if it isn't available (e.g. iOS home-screen apps before iOS 18.4), the bar shows "Screen may sleep" and the Install app dialog says to set Auto-Lock / Screen timeout to Never.
- **Reliability:** a "Live · Ns ago" pill, and a red bar ("Can't reach the server, so new orders may be missing") when the last successful poll is > 35s old, the first poll failed, or the device is offline. Polling every 10s carries on while offline, so everything recovers by itself. In the app, push alerts make new orders pop up within about 2 seconds.
- **Banners in the Android app only:** amber "Update the Kitchen app" when the app is older than `MIN_APP_VERSION` (`KitchenApp.jsx`); amber `PushStatusBanner` with a **Turn on** button when notifications, full-screen alerts, unrestricted battery or "Appear on top" are off.
- **PWA (browsers):** `client/public/kitchen-manifest.json` (`id`/`start_url` `/kitchen`, `display_override: fullscreen`) is swapped into `<head>` by `useKitchenHead`, together with the kitchen apple-touch-icon. It's `.json` because Rack serves `.webmanifest` as octet-stream. `client/public/sw.js` is registered **only from /kitchen**: it caches nothing but `offline.html` and only handles navigations (network first, offline page on failure). It never touches `/api` or the app shell. The Android app hides Install app and Full screen.
- **Upcoming + reminders:** "new" orders for a later day (catering, scheduled ahead) sit under the blue **Upcoming** button, grouped by day, and move into "Being made" on their pickup day (`client/src/admin/upcoming.js`, all client-side). They still chime and pop up when they arrive. Reminders pop up (blue, with a chime) 3 days and 1 day before pickup, only while the restaurant is open; a missed 3-day reminder still shows 2 days before; orders placed on or after a reminder's day skip it. "Got it" calls `POST /api/admin/orders/:id/reminder {days}` (kitchen staff allowed), stored in `orders.reminder_3_days_seen_at` / `reminder_1_day_seen_at`, so it doesn't show again on any device. Kitchen screen only; no emails, no pushes.
- **Not done / ideas:** Kitchen users can't pause online ordering (that needs settings access).
- **Testing on a tablet:** `bin/dev`, then `ngrok http 4000` and open `https://<id>.ngrok-free.app/kitchen` (local DB; dev kitchen user `cook@example.com` / `password123`), or the Kitchen Dev APK (next section). Wake lock and the service worker need HTTPS.

## Android Kitchen app (`kitchen-android/`)

Built 2026-10-04..06. A **Capacitor 8** Android app ("Kitchen", `com.mardinis.kitchen`) whose WebView loads the live **https://mardinismenlopark.com/kitchen** (`server.url` in `capacitor.config.ts`); there's no bundled copy of the React app, so **web deploys reach the tablet by themselves** and only native changes need a new APK. It's installed directly on the tablet (sideloaded, not the Play Store). Current version: **1.3 (versionCode 4)**, installed on the tablet 2026-10-06.

**Why native:** Chrome on the Tab A7 Lite was too quiet (Media volume), needed "Tap to start" after every launch, could let the screen sleep, and could only poll. The app plays the alarm on the Alarm volume, rings for pushed orders while closed or asleep, keeps the screen on and reopens itself after a restart.

**What the app does** (`android/app/src/main/java/com/mardinis/kitchen/`)
- `MainActivity`: `FLAG_KEEP_SCREEN_ON`; immersive full screen; landscape only (`sensorLandscape`); media without a tap; `CookieManager.flush()` on pause, so the sign-in survives a kill; **Back** never leaves the kitchen (on `/kitchen` it sends Escape, which closes a dialog or menu but never the new-order popup; on other pages it goes back towards the kitchen). Opened by an alert or after a restart (`EXTRA_WAKE`), it shows over the lock screen and turns the screen on. Registers the plugins and creates the notification channels. `android:allowBackup="false"`.
- **Native plugins**, reached from the page through the injected `window.Capacitor` bridge (`client/src/native.js`; `client/` has no Capacitor dependency, and the bridge has no `registerPlugin`, so it calls `nativePromise`). Capacitor injects the bridge by fetching HTML pages of the app's own host natively (`WebViewLocalServer.handleProxyRequest`), so it's there on every page of mardinismenlopark.com but not on other sites; API calls go straight from the WebView. Each helper returns null in browsers and in app versions without that plugin, and never throws:
  - `KitchenAlarm` (`KitchenAlarmPlugin` + `AlarmPlayer`): `play({ sound: "alarm" | "chime", volume })`, `stop()`, `setSound({ on, volume })`. MediaPlayer on `USAGE_ALARM` with audio focus; for the alarm it sets the Alarm volume to the Alarm loudness share of max (Loud = max) and puts it back afterwards (unless someone changed it meanwhile; saved in SharedPreferences, so a kill mid-sound still restores it). The WAVs in `res/raw` are rendered by `kitchen-android/sounds/render-sounds.mjs` from the same notes as `adminUtils.js`; **after changing either sound in `adminUtils.js`, re-run it and ship a new APK.**
  - `KitchenPush` (`KitchenPushPlugin`): `getToken`, `takePendingOrders`, `setKitchenOpen`, `status` → `{ notifications, fullScreen, battery, overlay }`, `openSettings({ which })`.
  - `KitchenApp` (`KitchenAppPlugin`, 1.3+): `info()` → `{ versionCode, versionName }`.
- **Restart (1.3):** `BootReceiver` gets `BOOT_COMPLETED` (on this tablet about **80 seconds** after startup), posts a "The tablet restarted" notification whose full-screen intent opens the kitchen, and with **"Appear on top"** allowed also opens it directly. The kitchen clears the notification once open. Tested 2026-10-06 with and without Appear on top. Pushes work after a restart even before the app opens (only Force stop blocks them).
- **Offline page (1.3):** `KitchenWebViewClient` replaces the WebView's error page (main-frame network errors and 5xx) with `res/raw/kitchen_offline.html` ("No connection", "new orders won't show up here"). It runs as the failed page's origin, checks `/up` every 5 seconds and on `online`, then loads the failed page again. Tested 2026-10-06: Wi-Fi off → launch → offline page; Wi-Fi on → kitchen back within seconds, still signed in.
- **Reload on deploy:** `useReloadOnDeploy` in `KitchenApp.jsx`, only in the app (a browser would need "Tap to start" again). Every 5 min it fetches `/kitchen` and compares the main `/assets/index-<hash>.js` with the running one; when they differ it reloads once the screen has been untouched for 2 min, with no popup, dialog, menu or cancelled banner up, and only if a fresh fetch of `/kitchen` succeeds right then.
- **Update banner:** the page asks for an update while the app's versionCode is below `MIN_APP_VERSION` in `KitchenApp.jsx` (4 = 1.3; apps from before 1.3 count as 0). **Raise it when web code starts relying on new native code.**

**Push alerts**
- **Server:** `Order#ring_kitchen` (`after_commit` when `placed_at` is set, i.e. `mark_placed!`: pay at pickup, paid card orders, group orders; the same hook as the confirmation email) → `KitchenPush.new_order` (`app/services/kitchen_push.rb`) on a background thread in `Rails.application.executor.wrap` (`KitchenPush.inline = true` in specs). It sends an FCM HTTP v1 **data-only, high-priority** message `{type: "new_order", order_id, number}` (`ttl` 600s) to every `DeviceToken.for_kitchen`. OAuth token from the **`googleauth`** gem (cached, renewed 5 min early); 5s timeouts; one retry on 401/429/5xx/network errors; tokens deleted only on `UNREGISTERED` / `SENDER_ID_MISMATCH` (a plain 404 could be a wrong project id). Never raises into ordering, and **does nothing without `FIREBASE_SERVICE_ACCOUNT_JSON`**. Later-day orders push too. Reminders don't push.
- **Devices:** `POST /api/admin/devices {token, platform}` (staff only; upsert; moves the token to whoever is signed in; touches `last_seen_at`; `rate_limit` name "devices") and `DELETE /api/admin/devices?token=` (your own only). The page registers on each launch and when Firebase changes the token, and unregisters in Log out. Specs: `spec/requests/kitchen_push_spec.rb`.
- **App:** `KitchenMessagingService` saves the order id (`PendingOrders`). If the kitchen page is on screen it fires a window event and the page pops the order up right away (`useKitchenPush` → `AdminContext.alertOrders`). Otherwise `AlarmService` (a `mediaPlayback` foreground service with a wake lock) rings the alarm every 20s at the page's loudness (silent if Sound is off) and shows an alarm-style notification (`OrderNotifications`, channel `new_orders`) whose **full-screen intent** wakes the tablet and opens the kitchen. It stops when the kitchen opens, or after 10 min. If Android refuses the service, a backup notification on `new_orders_backup` rings with the alarm as its sound.
- Tested live 2026-10-05/06: app swiped away + screen off → the tablet woke and rang within seconds; app open → popup in about 2 s.

**Build, sign, install** (all in WSL, no Android Studio)
- Tools (user-local, nothing in `~/.bashrc`): JDK 21 (Temurin) in `~/.local/share/jdk/jdk-21*`; Android SDK command-line tools in `~/.local/share/android-sdk` (`platform-tools`, `platforms;android-36`, `build-tools;36.0.0`); **Windows** adb at `C:\Users\Alfred\AppData\Local\Android\platform-tools` (`/mnt/c/...` from WSL), because USB passthrough to WSL is fiddly. The tablet has USB debugging on and this PC is authorized. To set up a new machine, unpack the same, run `sdkmanager --licenses`, and `sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"`.
- `kitchen-android/build-apk.sh [--install]`: `npm ci` if needed, `cap sync`, Gradle → signed release APK at `kitchen-android/dist/kitchen.apk`; `--install` runs `adb.exe install -r` (keeps the sign-in and settings). It refuses to build without `google-services.json` listing the package, and Gradle refuses a release that doesn't load the production URL.
- **Signing keystore:** `~/keys/mardinis-kitchen.jks` (PKCS12, alias `kitchen`) + `~/keys/mardinis-kitchen.properties` (passwords and path, mode 600; `$KITCHEN_KEYSTORE_PROPERTIES` overrides). **Encrypted backup:** `C:\Users\Alfred\Documents\mardinis-kitchen-keys.tar.gz.gpg`. **Without the keystore, updates can't be installed over the existing app** (it would have to be uninstalled, losing its sign-in and settings). Cert SHA-256 starts `86fa3aab`. Never print the passwords; `*.jks`, `*.keystore`, `keystore.properties` and `google-services.json` are gitignored.
- **New version:** bump `versionCode` and `versionName` in `android/app/build.gradle` for every APK with native changes (1.1 alarm, 1.2 push, 1.3 restart/offline/version), build, install over USB with the owner's OK (or copy the APK to the tablet and open it; allow "Install unknown apps" for the Files app), then open Kitchen once. Raise `MIN_APP_VERSION` if the web side needs it, and push the web side only after the tablet has the APK.
- **Kitchen Dev** (testing against the local DB): `bin/dev`, `ngrok http 4000`, then `KITCHEN_URL=https://<id>.ngrok-free.app/kitchen kitchen-android/build-apk.sh --dev --install`. It installs next to the real app as "Kitchen Dev" (`com.mardinis.kitchen.dev`, a debug build). ngrok shows its "Visit Site" page once per tunnel. Uninstall it afterwards (`adb.exe uninstall com.mardinis.kitchen.dev`); the owner wants only one app on the tablet.
- Icons: `kitchen-android/assets/`; regenerate with `npx capacitor-assets generate --android --iconBackgroundColor '#1c1814' --iconBackgroundColorDark '#1c1814' --splashBackgroundColor '#1c1814' --splashBackgroundColorDark '#1c1814'`. TypeScript is pinned to 5 (the Capacitor CLI reads `capacitor.config.ts` with the TS JS API).
- **Driving the tablet from WSL:** `adb.exe shell input tap X Y` (1340x800 landscape), `adb.exe exec-out screencap -p > x.png`, `adb.exe shell svc wifi disable|enable`. Restart with `adb.exe shell svc power reboot` (a clean shutdown; plain `adb reboot` skips it, and a setting changed in the last minutes may not be saved). Logs: `adb.exe logcat -d | grep -i mardinis`. Debugging the WebView needs a debug build (Kitchen Dev): `adb.exe forward tcp:9229 localabstract:webview_devtools_remote_<pid>`, then talk to it from PowerShell (WSL can't reach Windows' localhost). While USB is connected, Samsung may show an "Allow access to phone data?" popup over everything; dismiss it or unplug.

**Tablet setup checklist** (Samsung Galaxy Tab A7 Lite SM-T220, Android 14 / One UI 6.1)
1. Only the **Kitchen** app (no Chrome kitchen PWA or shortcut), on the home screen. Signed in (kitchen or admin account).
2. **Notifications** allowed (asked on first launch).
3. **Full-screen notifications** allowed (granted by default for sideloaded apps; Settings → Apps → Kitchen → notifications / special access).
4. **Battery: Unrestricted** (Settings → Apps → Kitchen → Battery), and add Kitchen to **Never sleeping apps** (Settings → Battery → Background usage limits; "Never auto sleeping apps" on some versions). Unrestricted was set on 2026-10-05; Never sleeping apps hasn't been checked.
5. **Appear on top** on for Kitchen (Settings → Apps → ⋮ → Special access → Appear on top; Samsung shows the whole list, so find Kitchen), so it reopens directly after a restart.
6. **Lock screen: None or Swipe**, never a PIN or pattern. With a PIN, Android doesn't start apps or deliver pushes after a restart until someone unlocks.
7. In Kitchen: **Sound on** and the Alarm loudness wanted (⋮ → Alarm loudness, then Test sound). Do Not Disturb off.
8. Plugged in, on the restaurant Wi-Fi.
9. Optional: **App pinning** (Settings → Security and privacy → More security settings → Pin app; then Recents → Kitchen icon → Pin) keeps staff in the kitchen. Not set up; unpinning needs Back + Recents held.
10. Samsung system updates install at night and restart the tablet (one seems to have run on 2026-10-05 around 4 AM); Kitchen reopens by itself since 1.3.

The amber banner on the kitchen screen points out 2–5 when they're off.

**Troubleshooting**
- *No ring while the app was closed:* check the amber banner and Sound on. **Force stop** (Settings → Apps → Kitchen) turns pushes off until Kitchen is opened again; swiping it away is fine.
- *Slow alerts:* FCM may demote high-priority pushes that the open kitchen handles without a notification. Not seen yet; polling catches anything within 10s.
- *"No connection" page or red bar:* Wi-Fi. Both recover by themselves.
- *Didn't come back after a restart:* wait 1–2 min (BOOT_COMPLETED comes late); then check Appear on top, or tap the "The tablet restarted" notification.
- *"Update the Kitchen app":* install the newer APK (see "New version").
- *Signed out:* sign in again. A signed-out tablet still rings for pushes (its token stays registered until Log out), and then shows the sign-in screen.

**Not done / known limits:** reminders on the native alarm and a full day's service haven't been seen live yet. No iOS app (the iPad uses the browser page, which polls). APK updates are manual (no Play Store). A signed-out device keeps ringing until it logs out properly.

## Group orders (`/group/new`, `/group/:token`)

Added 2026-10-02. An organizer starts a group order (name, email, optional phone, note, deadline, per-person limit; no account), shares a link, coworkers join with their name and add items from the normal menu, and the organizer checks out and pays once. Each person's name becomes the item `label`, so the kitchen sees name tags.

- **Backend:** `GroupOrder` (share `token`, private `host_token`, `open`, `deadline_at`, `per_person_limit`, `order` once checked out), `GroupOrderParticipant` (name unique per group, private `key`, `host` flag) and `GroupOrderItem` (cart-line fields). All three tables have RLS on. `Api::GroupOrdersController`: browsers send `X-Group-Key` (participant) and/or `X-Group-Host` (organizer). People can change only their own items, and only while `accepting_items?` (open, before the deadline, not placed, under 7 days old); the organizer can change anything until it's placed. Items are priced with `Checkout#priced_lines` (now public) and held to the per-person limit (the organizer has none). `checkout` builds one order from everyone's items (up to `GroupOrder::MAX_LINES`), via `OrderPlacement.start!` (shared with normal checkout), then closes ordering.
- **Email:** `GroupOrderEmail` sends the organizer their share + organizer links once (kind `group_order`, counts toward the daily email budget; skipped if over it). Invites go out from the organizer's own email app (`mailto:` "Email it" button), not from the site.
- **Frontend:** `GroupStartPage`, `GroupOrderPage` (renders `MenuPage` with a `CartContext.Provider` that adds to the group; the organizer's `?host=` link key is saved to localStorage and stripped from the address bar), `GroupCheckoutPage` (renders `CheckoutPage` with a group cart; `CheckoutPage` reads an optional `checkout` object from the cart). Keys live in localStorage under `mardinis.group.<token>`; helpers in `client/src/groupOrder.js`. Entry points: see "Promotion" below, plus the footer.
- **I'm done:** people tap I'm done (`POST /api/group_orders/:token/done`, `done_at`); they then see a "You're all set" summary instead of the menu. Changing their own items clears it; the organizer changing them doesn't. The organizer sees Done / Still choosing per person, "2 of 3 done", and an "Everyone's done" notice with a checkout link.
- **Promotion** (`components/GroupOrderPromo.jsx`, hidden while online ordering is paused): "Group Orders" in the header nav, a home page section with a sample group order, a strip at the top of /menu, a card in the cart drawer and on the catering page, and a hint in the item dialog when naming several items.
- Rate limits must each have a `name:`, or all limits in a controller share one counter (fixed here and in `PasswordsController`).
- Tested end to end locally with pay at pickup; card payment for a group order and a live group order haven't been tried yet.

## Catering orders (`/catering`)

Added 2026-10-02, replacing the request form as the main thing on the page. The catering menu (from the owner's "Mardinis Catering Menu - Original Enhanced.pdf", also at `client/public/menus/mardinis-catering-menu.pdf`) is ordinary categories with `catering: true` (Admin → Menu → edit category → "Catering menu"): Party Trays (Shallow/Half/Full Tray sizes), Kabobs (per skewer), Platters, Salads (Small/Medium/Large), By the Piece.

- **Front end:** `RestaurantContext` splits `/api/menu` into `menu` (regular) and `cateringMenu`; `fullMenu` (both) feeds the cart. `CateringPage` renders `MenuPage` with the catering menu, a catering hero and, below, the old message form (still goes to Admin → Catering). Catering sections never show on /menu, /our-menu or the home page.
- **Rules:** any catering item in the bag makes it a catering order (`orders.catering`): pickup at least 24 hours ahead and up to 30 days (`Restaurant::CATERING_NOTICE`, `CATERING_DAYS_AHEAD`), any 15-minute slot during opening hours (`client/src/catering.js` lists them; `Restaurant#valid_catering_pickup_time?` checks), and card payment only. Up to 200 of a catering item per line (`Checkout::CATERING_MAX_QUANTITY`; regular items 50). If card payments are off, catering can't be ordered online (the page says to call). Pickup only; delivery is by phone. Catering items can't go in group orders.
- **Staff:** a dark red "Catering" badge on kitchen cards/panels, live orders and order detail; "** CATERING **" on printed tickets. Catering orders (like any order for a later day) wait in the kitchen's Upcoming list until their pickup day, with reminders 3 days and 1 day before.
- **Item dialog:** catering sections' descriptions (e.g. "Shallow tray feeds 10–15 · …") show under the size choices; catering items have no "Add a name" option.
- **Production data:** added by the owner on 2026-10-02 with `bash tmp/catering_menu_2026_10_02.sh` (idempotent; `--dry-run` first) and verified through `/api/menu`: 5 sections, 21 items, prices as in the PDF. Edit them in Admin → Menu from now on.
- Tested end to end locally with Stripe's test card; no live catering order has been placed yet. Checkout suggests a 15% tip on catering too (the owner hasn't asked to change it).

## Passwords

- **Change:** My account (`/account`) → Change password; it needs the current password. Linked from the admin sidebar ("Change password") and the kitchen ⋮ menu.
- **Forgot:** `/forgot-password` (linked from both sign-in screens) emails a link to `/reset-password?token=…` that works for **30 minutes**, via `has_secure_password reset_token:`. The answer is the same whether or not the email has an account. Rate limited (5 per 15 min per IP).
- **Admin reset link:** Admin → Customers → key icon makes a link that lasts **24 hours** (`generates_token_for :staff_password_reset`) for the owner to text to someone. Works even without email.
- Every reset link stops working once the password changes, so each works once. A dead link says whether it expired or was already used (`invalid_link_message` reads the token's expiry). A new password (reset or change) **signs the account out on every other device**: the session stores `session[:auth]` = the last 10 chars of the bcrypt salt, which `current_user` checks. Sessions from before this was added get stamped on their next request.
- **Email:** Resend has been set up since 2026-09-27 (see "Email"), so "Forgot password?" emails work. Links always use `https://mardinismenlopark.com` in production (`APP_URL` overrides it), never the request's Host.
- **Development:** without a Resend key, emails (including reset links) are written to `log/development.log`. The Vite proxy forwards the original host, so links point at :4000 or the ngrok URL.

## Email

- **Provider:** Resend, set up 2026-09-27 (domain verified, DKIM + DMARC `p=none` in GoDaddy). Render has `RESEND_API_KEY` and `MAIL_FROM`. `EmailSender.deliver!(kind:, …)` posts to Resend's API; in development without a key it logs instead.
- **Order confirmations** (`OrderConfirmation`, templates in `app/views/emails/`): sent once per order when it reaches the kitchen, via `Order` `after_commit` on `placed_at`. Pay-at-pickup orders send at checkout; card orders send after Stripe confirms. `orders.confirmation_sent_at` is claimed atomically, so the webhook and the browser can't both send. Only sent if the customer entered an email. Failures are logged and never affect the order. Group orders also send the organizer their links once (`GroupOrderEmail`, kind `group_order`, non-essential budget).
- **Daily budget:** Resend's free plan allows 100 emails a day. `sent_emails` (kind + time, no content) counts the last 24 hours. Order confirmations stop at 80, and password resets can use the last 20. `EMAIL_DAILY_LIMIT` in Render overrides the 100 (`0` = no limit, e.g. after upgrading to Resend Pro, $20/mo for 50,000/month).

## Applying data changes to production

Menu and settings data live in the production DB, not in the seeds (never hand-edit the seeds for this; production is already seeded). Options:
- The owner uses Admin → Menu / Settings.
- For bulk changes, write a one-off script (see "Working with the owner"). Wrapper pattern:
  ```bash
  set -euo pipefail
  cd ~/projects/MardinisWebsite
  export PATH="$HOME/.rbenv/shims:$PATH"
  set -a; . ./.env.supabase; set +a
  export DATABASE_URL="$SUPABASE_DATABASE_URL"
  bin/rails runner /path/to/script.rb "$@" 2>&1 | sed -E 's#postgres(ql)?://[^ ]*#<url hidden>#g'
  ```
  Development env + `DATABASE_URL` connects to production; dotenv still loads `.env.local`.
- Uploading to Supabase Storage from local works for Claude (`PhotoStorage.upload!` in a `rails runner`, using `.env.local`); only DB writes need the owner.

## Menu status (2026-10-02)

- **Pricing rules (2026-10-02):** prices end in .00, .50 or .99. To round an odd price: cents under .30 → .00, .30–.70 → .50, over .70 → next dollar. Lamb Kabob costs $1.50 more than other meats: +$1.50 as a combo pick ("Choose Two", "Choose Two Kabobs"), $7.50 in plates' "Add Extra" (others $6.00). Applied by the owner with `tmp/price_update_2026_10_02.sh` and verified live. Every change is logged in the owner's `Mardinis Menus/Price Changes.csv` (untracked; the earlier dine-in price changes in it were already live).
- Catering menu: see "Catering orders".
- Still open from earlier: "Combo Kabob Plate" and "Combo Plate" are both live at $20.99 (likely duplicates); spelling mix "Chicken Shawerma Plate" / "Fatoush" / "Kufta" vs "Kafta"; the plates' option group is named "Select One", so the dialog button reads "Choose Select One" (renaming it in Admin → Options, e.g. to "Side", fixes that).

Earlier status (2026-09-25):

- 13 sections, ~118 visible items (the 71 items from the owner's online-ordering site were imported; sides and soup use sizes; prices match `https://www.mardinisdelicafeca.com/…/menu`). Removed: grilled Veggie Sandwich, Honey Pineapple Chicken Sandwich, Club Sandwich.
- **Appetizers section is hidden** (the import reused an existing inactive category; still hidden on 2026-10-02). The owner needs to turn it on in Admin → Menu.
- Photos: 28 items have one, all in the Supabase bucket, mostly from the restaurant's own old SpotHopper site (professional shoot). About 95 items have none; the owner plans to photograph them and use Admin → Menu → Upload photo.
- 6 dead DoorDash photo links (4 wraps, Beef Kabob and Kufta Kabob plates) may still be set if the owner hasn't run the clearing script yet; the placeholder shows either way.
- Unused photos in the bucket (owner may want them): catering spread (suggested home banner: `https://jyazfpwyxwqpkbjkengj.supabase.co/storage/v1/object/public/menu-photos/items/20260925-13fdad5aadd568e8.jpg`), two storefront shots, mujadara, and extra combo-kabob / garlic-sauce shots. The home banner, logo and Catering page photos were moved from imgur to the bucket on 2026-09-25 (code in the "Host the home banner, logo and catering photos on Supabase" commit; the two settings via an owner-run script).

## Open items

- **Kitchen tablet (2026-10-06):** Sound was **off** on the tablet (left as is; turn it on in the kitchen if it should ring). Orders #0023 and #0024 ("Admin", pay at pickup, 9:15 AM) were still NEW on the board; if they're tests, cancel them. Check Samsung's "Never sleeping apps" (tablet checklist step 4). Place one test order with Kitchen swiped away to re-check push on app 1.3.

- Confirm `SECRET_KEY_BASE` is spelled right in Render (a screenshot once showed `SECRETE_KEY_BASE`).
- Confirm Stripe mode (live vs test); Card payments are on (checked 2026-10-02, and catering needs them). Decide on the refund-fee question for customer cancellations.
- Check the tax rate in Admin → Settings: still **9.5%**, a legacy value; Menlo Park's actual rate is unverified. Also the prep time (20 min). Hours (Mon–Sat 9am–9pm, Sun 10am–8pm) were confirmed by the owner on 2026-09-27.
- Admin login = `ADMIN_EMAIL`/`ADMIN_PASSWORD` from Render (first seed). Forgotten passwords: see "Passwords" below.
- Unclear item names copied from the ordering site: "Mexican" and "Izee" (Bottled Drinks), "Turkish" (Snacks).
- Returning visitors who loaded the home page before 2026-09-25 may have the old page cached for a year (the bug fixed in `cce50a8`); a refresh fixes it.
- Transactional email: password resets, order confirmations (including catering and group orders) and the group organizer email (`EmailSender`, Resend; see "Email" above). Catering **messages** (the form on /catering) still don't notify anyone; check Admin → Catering. Stripe also sends its own receipt for card payments.
- Ideas the owner may want later: customer reminder emails for future orders (the owner chose kitchen-screen-only reminders for now); catering delivery (pickup only for now).

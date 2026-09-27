# Handoff: Mardini's Deli Cafe website

Context for a new Claude Code session picking up this project. Last updated 2026-09-25. Nothing in here is secret; real secrets live only in Render, Supabase and the gitignored `.env.supabase` / `.env.local`.

## TL;DR

- Family restaurant website + online ordering + admin/kitchen portal for **Mardini's Deli Cafe**, 408 Willow Rd, Menlo Park, CA (a real business run by the owner's family).
- **Live:** https://mardinismenlopark.com (also https://mardinis.onrender.com). Auto-deploys from `main` on GitHub `Alfredx48/MardinisWebsite`.
- **Stack:** Ruby 3.4.10 / Rails 8.1.4 API + React 18 SPA built with **Vite**, Postgres on Supabase, photos in Supabase Storage, hosted on Render.
- **State:** menu photos, menu item sizes, the full ordering-site menu import, refunds and customer cancellation are all done and live. 74 RSpec specs pass.
- **Kitchen screen (`/kitchen`) + Kitchen role: built and committed locally 2026-09-25, not pushed yet.** The owner is testing on their own iPad; the restaurant's tablet may be iPad or Android, so both must keep working. See "Kitchen screen" below.

## Working with the owner

- **Pushing to `main` deploys to production immediately** (a deploy now takes ~2 minutes). Commit freely, but push only when the owner says so.
- **Production database writes are blocked for Claude** by a permission rule. The pattern that works: write a one-off Rails runner script that's idempotent, checks each row (id + name + expected current value) and supports `--dry-run`; dry-run it against the local DB; then give the owner a wrapper to run: `bash <script>.sh --dry-run`, then without the flag. See "Applying data changes" below.
- Reading the public site (`curl https://mardinismenlopark.com/api/menu`) is fine and is how to verify a data change landed.
- **Another Claude session ("Family restaurant website overhaul") has also edited this repo.** Before committing, run `git status` and look for changes you didn't make; don't commit someone else's half-finished work without asking.
- The owner prefers short answers, decisions via multiple choice, and to approve anything customer-facing (photos, prices, descriptions) before it goes live.

## Repo & git

- Path: `~/projects/MardinisWebsite` (WSL Ubuntu on Windows). Remote: `https://github.com/Alfredx48/MardinisWebsite.git`.
- `main` = deployed = `origin/main` (HEAD `cce50a8`, the Vite switch). Old remote branches (`alfred`, `dev`, `stripe`, `style`) are from the 2023 bootcamp version.
- Leftover junk the owner may delete: two empty SQLite files at repo root, `react_rails_api_project_template_development` and `..._test` (tracked, unused).

## Local development

- Ruby via **rbenv** (`~/.rbenv`). Shell PATH needs `export PATH="$HOME/.rbenv/shims:$PATH"`. `.ruby-version` = 3.4.10 (3.4.11 is also installed; don't switch, Render compatibility).
- Node 24 locally (nvm), Node 22 on Render (`.node-version`). Vite 8 needs Node ≥ 22.12. Local Postgres is running (WSL).
- Local DBs (names kept from the bootcamp template): `react_rails_api_project_template_development` / `_test`. Dev data includes a dev-only admin `admin@example.com` / `password123`, a couple of test orders, and the imported menu. Local item ids for items added after the original seed **don't match production ids**, and item 18 is misspelled "Lam Kabob Plate" locally.
- `bin/dev` runs Rails on :3000 + the Vite dev server on :4000 (open http://localhost:4000; Vite proxies `/api` to :3000). Stop them by port (`ss -ltnp`), not `pkill -f`, which can match your own shell.
- **Phone/tablet testing via ngrok:** `ngrok http 4000`. Vite already allows ngrok hosts (`client/vite.config.js`) and so does Rails dev (`config/environments/development.rb`).
- Tests: `bundle exec rspec` (74 examples). Frontend: `npm run lint --prefix client` and `npm run build --prefix client`. Running the root `npm run build` (what Render runs) rewrites `public/`; restore with `git checkout public && git clean -fq public`.
- `.env.local` (gitignored) holds local secrets, including `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, and dotenv loads it in development. **Never print it.**
- **Headless browser testing** isn't installed permanently. To recreate: `npm i playwright-core` in a scratch dir, and use the cached Chromium headless shell at `~/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`. It needs `libnspr4 libnss3 libasound2t64`: `apt-get download` them (no sudo), `dpkg-deb -x` them into a dir, and set `LD_LIBRARY_PATH=<dir>/usr/lib/x86_64-linux-gnu`. Log in by POSTing to `/api/login` with `page.request` (it shares the page's cookies). Pillow/ImageMagick aren't installed; crop images with a canvas in that browser. `dig` isn't installed; use `https://dns.google/resolve?name=...&type=A`.

## Production setup

**Render** (web service "Mardinis", id `srv-ceucbikgqg40d6hgobe0`, **Free plan**: sleeps after ~15 min idle, and the first request then takes ~50s)
- Build `./bin/render-build.sh`: bundle install → root `npm run build` (`npm ci` + `vite build` into `client/build`, copied to `public/`) → `rails db:migrate` → `rails db:seed` (idempotent).
- Start `bundle exec puma -C config/puma.rb`, health check `/up`. A failed build keeps the previous version live.
- Env vars set in Render: `DATABASE_URL`, `RAILS_ENV=production`, `BUNDLE_WITHOUT=development:test`, `NODE_VERSION=22`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `RAILS_MASTER_KEY` (unused 2023 leftover), a secret-key var, and for photo uploads `SUPABASE_URL` + `SUPABASE_SECRET_KEY` (the owner was asked to add these two; confirm by trying an upload in Admin → Menu).
- **Caching** (`config/environments/production.rb`, `lib/middleware/immutable_assets.rb`): `/` and every page go through `FallbackController` and always revalidate; Vite's hashed `/assets/*` are cached a year (`immutable`); other public files (icons, manifest) an hour. Keep the page shell uncached: it names the current asset files, and each deploy deletes the old ones.
- Custom domain: `mardinismenlopark.com` + `www` (www redirects to the root). TLS by Render.

**GoDaddy DNS**: `A @ 216.24.57.1`, `CNAME www mardinis.onrender.com`. Leave the `CNAME pay` and `_domainconnect` records alone. No domain forwarding; it would break Render.

**Supabase** (project ref `jyazfpwyxwqpkbjkengj`, region us-west-2)
- Postgres: Render's `DATABASE_URL` = the **Session pooler** string (port 5432). Not the transaction pooler (6543) or the direct connection (IPv6). A local copy is in `.env.supabase` as `SUPABASE_DATABASE_URL`; never print it.
- RLS is on for every table and the `anon`/`authenticated` roles are revoked (migration `20260925000001`; the refunds migration enables RLS on its own table). **Any new table must `ENABLE ROW LEVEL SECURITY` in its migration.** The app doesn't use Supabase's Data API; keep it that way.
- Storage: public bucket **`menu-photos`** (JPG/PNG/WebP, 5 MB max). `app/services/photo_storage.rb` uploads with the secret key; `rails photos:setup_bucket` creates the bucket (already done). All 28 menu photos live under `menu-photos/items/`.
- Free tier pauses after ~1 week idle; restore from the Supabase dashboard if the site starts erroring.

**Stripe**
- The owner's Stripe dashboard showed a real $1.76 charge + refund (balance −$0.35, the fee Stripe keeps on refunds), so **live keys may now be in Render**. Confirm with the owner before assuming test mode.
- The owner wanted pay-at-pickup only at one point: check Admin → Settings → Card payments.
- Every refunded card order costs the restaurant Stripe's fee (~2.9% + $0.30). Customers can cancel their own orders until the kitchen starts them; the owner hasn't decided whether to absorb that fee.
- Webhook (optional): `STRIPE_WEBHOOK_SECRET` + endpoint `https://mardinismenlopark.com/api/stripe/webhook`.

## Architecture

**Backend** (`app/`)
- `services/checkout.rb`: builds orders from the browser cart. **All prices, tax and tip are computed server-side**; the client sends item ids, sizes and quantities only. It validates availability, open/closed and pickup slots.
- `services/payments.rb`: Stripe wrapper (PaymentIntent, confirm/sync, refund, cancel intent). Card orders stay `awaiting_payment` until Stripe confirms the full amount.
- `services/order_cancellation.rb`: cancels + refunds in full; used by customers (`POST /api/orders/:token/cancel`, only while `awaiting_payment`/`new`) and by staff ("Refund & cancel").
- `services/photo_storage.rb`: Supabase Storage uploads (checks file signatures, not the declared type).
- `presenters/presenters.rb`: explicit JSON shapes for every response; no serializers, so nothing leaks through associations.
- Models:
  - `Restaurant`: settings; `hours` jsonb keyed `sun..sat` `{open, close, closed}`; tax, prep time, open-now, pickup slots; `hero_image` (home banner URL); timezone Pacific.
  - `Category` (`active` = visible), `MenuItem`: `available` = "sold out" switch; `featured`, `vegetarian`, `spicy`, `position`, `image` (URL), and **`sizes`** (jsonb `[{name, price}]`; when present the customer must pick one, and `price` is kept at the lowest size price).
  - `Order`: `awaiting_payment → new → preparing → ready → completed`, plus `cancelled` (`Order::KITCHEN_FLOW`); `refunded_amount`; a random `token` powers public tracking at `/order/:token`.
  - `ModifierGroup` (+ `MenuItemModifierGroup` join): reusable option groups such as "Bread Choice" (`min_select`/`max_select`, nil max = no limit, `options` jsonb `[{name, price}]`), attached to items in order via `MenuItem#assign_modifier_groups!`. Checkout validates every group's limits and adds option prices to the line.
  - `OrderItem`: snapshots `item_name` (including the size, e.g. "Hummus (Pint)"), `size`, `unit_price` (including options) and `modifiers` (jsonb `[{group_id, group, option, price}]`, shown on tickets under the item).
  - `Refund`, `CateringInquiry`, `User` (`admin` and `kitchen` booleans; `role` = customer / kitchen / admin; `staff?` = either).
- Controllers: public `api/restaurant` (`/api/restaurant`, `/api/menu`, active categories only), `api/orders`, `api/users`/`api/sessions` (cookie session `_mardinis_session`, `SameSite=Strict`), `api/catering_inquiries`, `api/stripe_webhooks`. Admin, all behind `require_admin`: `api/admin/*` (orders + refund, categories, menu_items + reorder, **photos** upload, **modifier_groups**, restaurant settings, users, catering, stats). `FallbackController` serves the SPA for `/` and every non-API route.

**Frontend** (`client/`, Vite; JSX files use `.jsx`; entry `client/index.html` → `src/index.jsx`)
- `context/`: `AuthContext`, `RestaurantContext` (restaurant + menu, refreshed every 5 min), `CartContext` (localStorage cart; lines keyed by item + size + options + request).
- `modifiers.js`: option helpers shared by the menu dialog, cart and order displays (`picksProblem`, `picksTotal`, `modifierText`...).
- `pages/`: Home, Menu (item dialog with size picker), Checkout (Stripe Payment Element via `@stripe/stripe-js/pure`), OrderStatus (customer cancel), About, Catering, Policy, Login, Account, NotFound.
- `components/ui.jsx`: `DishImage` (gradient + initials placeholder when a photo is missing or fails), `Modal`, `QuantityStepper`, `Switch`. `format.js`: `money`, `priceLabel` ("from $X" for sized items).
- `styles/base.css` holds design tokens (cream/terracotta/olive; Fraunces + DM Sans); `styles/site.css` the public site.
- `admin/`: lazy-loaded bundle at `/admin/*` (`AdminApp.jsx` routes: `/admin`, `/admin/orders` = Live Orders, `/admin/history`, `/admin/menu`, `/admin/catering`, `/admin/users`, `/admin/settings`).
  - `AdminLayout` (sidebar; top bar under 900px), `Dashboard`, `LiveOrders`, `OrderDetail` (refunds), `PrintTicket`, `OrderHistory`, `MenuManager` (sizes editor, photo upload, option groups per item), `OptionsManager` (`/admin/options`, edit option groups), `CateringInbox`, `Customers`, `Settings`.
  - `AdminContext` owns order polling and the new-order chime, so the chime rings on every admin page.
  - `adminUi.jsx`: shared UI + `usePolling`. `adminUtils.js`: prefs in `localStorage` under `mardinis.admin.*`, Web Audio chime, CSV export, `shrinkPhoto`.
  - `admin.css`: all admin classes are prefixed `adm-`.
- Conventions: tabs, double quotes, semicolons; function components + hooks; API calls go through `api.js` (throws `ApiError`; `api.upload` for FormData; toast `e.message`). Keep new admin CSS `adm-`-prefixed and use the base.css tokens.

## Kitchen screen (`/kitchen`)

A full-screen Live Orders board for a kitchen tablet, installable as its own app ("Kitchen", dark "M" icon). Code: `client/src/admin/KitchenApp.jsx` + `kitchen.css`, reusing `OrderBoard`/`Ticket` from `LiveOrders.jsx` and `AdminProvider kitchen` from `AdminContext.jsx`.

- **Access:** admins and users with `kitchen: true`. Kitchen users can list active orders, view and move orders, edit staff notes, and cancel pay-at-pickup orders. They **can't** refund, cancel orders paid online (403, and the UI says "ask a manager"), browse order history, or reach any other `/api/admin/*` endpoint. They're sent from `/admin` to `/kitchen`. Specs are in `spec/requests/security_spec.rb` ("kitchen staff").
- **Setting up a cook:** they sign up as a customer, then Admin → Customers → Access → Kitchen (`PATCH /api/admin/users/:id {role}`).
- **Login:** `/kitchen` has its own sign-in screen, so the installed app never leaves the page. Sessions now have `expire_after: 30.days`, renewed on every request (`config/application.rb`, applies to everyone), so the tablet stays signed in across restarts.
- **Sound:** a full-screen "Tap to start" on launch, and "Tap to turn sound back on" when iOS suspends audio after the app was in the background. `navigator.audioSession.type = "playback"` makes iOS play even when the device is set to silent. The kitchen chime is louder (triangle wave) and **repeats every 20s** with a flashing banner and screen frame until someone taps "Got it" or starts the order.
- **Screen:** Screen Wake Lock (re-requested on `visibilitychange`). If it isn't available (e.g. iOS home-screen apps before iOS 18.4), the bar shows "Screen may sleep"; the Install app dialog tells staff to set Auto-Lock / Screen timeout to Never.
- **Layout:** 3 columns at ≥ 640px wide (portrait and landscape), each scrolling on its own; tabs on phones. Tickets show an elapsed-time color (green < 5 min, yellow < 10, orange < 15, red after), or for scheduled orders how soon they're due.
- **Reliability:** a "Live · Ns ago" pill; a red banner when the last successful poll is > 35s old or the device is offline.
- **PWA:** `client/public/kitchen-manifest.json` (`id`/`start_url` `/kitchen`, `display_override: fullscreen`) is swapped into `<head>` by `useKitchenHead`, together with the kitchen apple-touch-icon. It's `.json` because Rack serves `.webmanifest` as octet-stream. `client/public/sw.js` is registered **only from /kitchen**: it caches nothing but `offline.html` and only handles navigations (network first, offline page on failure). It never touches `/api` or the app shell. The main site's `manifest.json` and favicons now use the terracotta "M" icon (CRA logos removed).
- **Not done / ideas:** Render Free plan cold starts (~50s after 15 min idle; a tablet with the board open keeps it awake; Starter ~$7/mo removes them). Real-time push instead of 10s polling. Kitchen users can't pause online ordering (that needs settings access).
- **Testing on a tablet:** `bin/dev`, then `ngrok http 4000` and open `https://<id>.ngrok-free.app/kitchen` (local DB; dev kitchen user `cook@example.com` / `password123`). Or push and use https://mardinismenlopark.com/kitchen. Wake lock and the service worker need HTTPS.

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

## Menu status (2026-09-25)

- 13 sections, ~118 visible items (the 71 items from the owner's online-ordering site were imported; sides and soup use sizes; prices match `https://www.mardinisdelicafeca.com/…/menu`). Removed: grilled Veggie Sandwich, Honey Pineapple Chicken Sandwich, Club Sandwich.
- **Appetizers section is hidden** (the import reused an existing inactive category). The owner needs to turn it on in Admin → Menu.
- Photos: 28 items have one, all in the Supabase bucket, mostly from the restaurant's own old SpotHopper site (professional shoot). About 95 items have none; the owner plans to photograph them and use Admin → Menu → Upload photo.
- 6 dead DoorDash photo links (4 wraps, Beef Kabob and Kufta Kabob plates) may still be set if the owner hasn't run the clearing script yet; the placeholder shows either way.
- Unused photos in the bucket (owner may want them): catering spread (suggested home banner: `https://jyazfpwyxwqpkbjkengj.supabase.co/storage/v1/object/public/menu-photos/items/20260925-13fdad5aadd568e8.jpg`), two storefront shots, mujadara, and extra combo-kabob / garlic-sauce shots. The home banner, logo and Catering page photos were moved from imgur to the bucket on 2026-09-25 (code in the "Host the home banner, logo and catering photos on Supabase" commit; the two settings via an owner-run script).

## Open items

- Confirm `SECRET_KEY_BASE` is spelled right in Render (a screenshot once showed `SECRETE_KEY_BASE`).
- Confirm Stripe mode (live vs test) and the Card payments setting; decide on the refund-fee question for customer cancellations.
- Check the tax rate in Admin → Settings: still **9.5%**, a legacy value; Menlo Park's actual rate is unverified. Also hours (Mon–Sat 9–9, Sun 10–8 by default) and prep time (20 min).
- Admin login = `ADMIN_EMAIL`/`ADMIN_PASSWORD` from Render (first seed). No password-reset flow; an admin can't be recovered without console or DB access.
- Unclear item names copied from the ordering site: "Mexican" and "Izee" (Bottled Drinks), "Turkish" (Snacks).
- Returning visitors who loaded the home page before 2026-09-25 may have the old page cached for a year (the bug fixed in `cce50a8`); a refresh fixes it.
- No transactional email (order confirmation, catering notifications). Stripe sends receipts for card payments only.

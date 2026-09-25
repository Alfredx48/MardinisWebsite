# Handoff: Mardini's Deli Cafe website

Context for a new Claude Code session picking up this project. Written 2026-09-25. Nothing in here is secret; real secrets live only in Render, Supabase and the gitignored `.env.supabase`.

## TL;DR

- Family restaurant website + online ordering + admin/kitchen portal for **Mardini's Deli Cafe**, 408 Willow Rd, Menlo Park, CA (a real business run by the owner's family).
- **Live:** https://mardinismenlopark.com (also https://mardinis.onrender.com). Auto-deploys from `main` on GitHub `Alfredx48/MardinisWebsite`.
- **Stack:** Ruby 3.4.10 / Rails 8.1.4 API + React 18 (Create React App) SPA, Postgres on Supabase, hosted on Render.
- **State:** a full overhaul was completed, tested, merged and deployed. All 46 RSpec specs pass.
- **Next tasks (owner's priorities):**
  1. Find working food photos for the menu (6 broken links, 36 items with no photo).
  2. Make the admin **Live Orders** view work seamlessly on a kitchen tablet, installable as an app (PWA) or in the browser. This is how cooks and staff will see incoming orders.

## Repo & git

- Path: `~/projects/MardinisWebsite` (WSL Ubuntu on Windows). Remote: `https://github.com/Alfredx48/MardinisWebsite.git`.
- `main` is the deployed branch and is in sync with `origin/main` (HEAD `704e066`). Local branch `overhaul` is fully merged and can be deleted. Old remote branches (`alfred`, `dev`, `stripe`, `style`) are from the 2023 bootcamp version.
- Recent commits: `254a8a9` overhaul (design, secure checkout, admin, Rails 8.1) → `d5de836` pin Ruby 3.4.10 → `e6a2bed` Supabase instead of Render Postgres → `9a3fb1c` ignore `.env.supabase` → `704e066` Supabase RLS lockdown.
- **Pushing to `main` deploys to production immediately.** Commit and push only when the owner asks.
- Leftover junk the owner may delete: two empty SQLite files at repo root, `react_rails_api_project_template_development` and `..._test` (tracked, unused).

## Local development

- Ruby via **rbenv** (`~/.rbenv`). Shell PATH needs `export PATH="$HOME/.rbenv/shims:$PATH"`. `.ruby-version` = 3.4.10 (3.4.11 is also installed; don't switch, Render compatibility).
- Node 24 locally (nvm), Node 22 on Render (`.node-version`). Local Postgres is running (WSL).
- Local DBs (names kept from the bootcamp template): `react_rails_api_project_template_development` / `_test`. Dev data includes a dev-only admin `admin@example.com` / `password123` and a couple of test orders.
- `bin/dev` runs Rails on :3000 + React dev server on :4000 (open http://localhost:4000; the React dev server proxies `/api` to :3000).
- **Phone testing via ngrok:** `ngrok http 4000`, and start React with `DANGEROUSLY_DISABLE_HOST_CHECK=true`. Rails dev already allows `*.ngrok-free.app` / `*.ngrok.app` / `*.ngrok.io` (`config/environments/development.rb`).
- Tests: `bundle exec rspec` (46 examples: checkout pricing, Stripe flow (mocked), access control, admin API, hours/pickup slots). Frontend: `cd client && npx eslint --max-warnings=0 src` and `npm run build`.
- **Headless browser testing** worked last session but isn't installed permanently. To recreate: `npm i playwright-core` in a scratch dir, and use the cached Chromium headless shell at `~/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`. It needs `libnspr4 libnss3 libasound2t64`: `apt-get download` them (no sudo), `dpkg-deb -x` them into a dir, and set `LD_LIBRARY_PATH=<dir>/usr/lib/x86_64-linux-gnu`. `dig` isn't installed; use `https://dns.google/resolve?name=...&type=A` for DNS checks.

## Production setup

**Render** (web service "Mardinis", id `srv-ceucbikgqg40d6hgobe0`, **Free plan**: sleeps after ~15 min idle, and the first request then takes ~50s)
- Build `./bin/render-build.sh`: bundle install → `npm run build` (builds React into `public/`) → `rails db:migrate` → `rails db:seed`. Seeds are idempotent.
- Start `bundle exec puma -C config/puma.rb`, health check `/up`. `render.yaml` Blueprint exists (web service only, no DB), but the live service was configured by hand.
- Env var names set in Render: `DATABASE_URL`, `RAILS_ENV=production`, `BUNDLE_WITHOUT=development:test`, `NODE_VERSION=22`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `RAILS_MASTER_KEY` (unused 2023 leftover), and a secret-key var.
  - **Unverified:** in a screenshot this was misspelled `SECRETE_KEY_BASE`. The owner was told to rename it to `SECRET_KEY_BASE`; confirm it's fixed. The site boots either way, possibly falling back to `RAILS_MASTER_KEY` credentials.
- Custom domain: `mardinismenlopark.com` + `www` (www redirects to the root), both verified. TLS by Render (Google Trust Services, auto-renewing).

**GoDaddy DNS** for `mardinismenlopark.com`: `A @ 216.24.57.1`, `CNAME www mardinis.onrender.com`. Leave the `CNAME pay` (GoDaddy paylinks) and `_domainconnect` records alone. **No domain forwarding**; it would break Render.

**Supabase** (Postgres only; project ref `jyazfpwyxwqpkbjkengj`, region us-west-2)
- Render's `DATABASE_URL` = the Supabase **Session pooler** string (port 5432). Don't use the transaction pooler (6543) or the direct connection (IPv6).
- A local copy of the string is in `.env.supabase` (gitignored) as `SUPABASE_DATABASE_URL=...`. Load it with `set -a; . ./.env.supabase; set +a` and **never print it**; pipe output through `sed -E 's#postgres(ql)?://[^ ]*#<url hidden>#g'`.
- Migration `20260925000001_lock_down_supabase_api_access` enables RLS on all tables and revokes the `anon`/`authenticated` roles. Verified: the anon role gets "permission denied" and Rails (the table owner) is unaffected. Supabase's Data API isn't used by the app; keep it that way.
- Free tier pauses after ~1 week idle; restore from the Supabase dashboard if the site starts erroring.

**Stripe**: Render has **test-mode keys** (`pk_test_`/`sk_test_`), so checkout currently offers "Pay now" (test mode) **and** "Pay at pickup". Real cards get declined, and the public test card 4242… would create an order marked "Paid online" that isn't really paid. The owner wants pay-at-pickup only for now and was told to switch **Admin → Settings → Card payments** off; confirm. Going live means live keys (`pk_live_`/`sk_live_`), both in the same mode, and optionally `STRIPE_WEBHOOK_SECRET` with a webhook at `https://mardinismenlopark.com/api/stripe/webhook`.

## Architecture

**Backend** (`app/`)
- `services/checkout.rb`: builds orders from the browser cart. **All prices, tax and tip are computed server-side**; the client only sends item ids and quantities. It validates availability, the open/closed state and pickup slots.
- `services/payments.rb`: the Stripe wrapper (PaymentIntent, confirm/sync, refund). Card orders stay `awaiting_payment` until Stripe confirms the full amount.
- `presenters/presenters.rb`: explicit JSON shapes for every response. There are no ActiveModelSerializers, and customer data never leaks through associations.
- Models:
  - `Restaurant`: settings; `hours` is jsonb keyed `sun..sat` with `{open, close, closed}`; tax, prep time, open-now and pickup-slot logic, timezone Pacific.
  - `Category`, `MenuItem`: `available` is the "sold out" switch; also `featured`, `vegetarian`, `spicy`, `position`, and `image` (a **URL string**).
  - `Order`: statuses `awaiting_payment → new → preparing → ready → completed`, plus `cancelled`; a random `token` powers public tracking at `/order/:token`.
  - `OrderItem`: snapshots the item name and unit price.
  - `CateringInquiry`, `User`: `admin` boolean; there's no staff/kitchen role yet.
- Controllers:
  - Public: `api/restaurant` (`/api/restaurant`, `/api/menu`), `api/orders`, `api/users`/`api/sessions` (cookie-session auth), `api/catering_inquiries`, `api/stripe_webhooks`.
  - Admin: everything under `api/admin/*` (orders + refund, categories, menu_items + reorder, restaurant settings, users, catering, stats), all behind `require_admin`.
  - `FallbackController` serves the SPA's `index.html` for non-API routes.

**Frontend** (`client/src/`)
- `context/`: `AuthContext`, `RestaurantContext` (restaurant + menu, refreshed every 5 min), `CartContext` (localStorage cart).
- `pages/`: Home, Menu, Checkout (Stripe Payment Element via `@stripe/stripe-js/pure`), OrderStatus, About, Catering, Login, Account, NotFound.
- `components/ui.js`:
  - `DishImage` falls back to a gradient + initials placeholder when a photo is missing **or fails to load**.
  - Also: `Modal`, `QuantityStepper`, `Switch`.
- `styles/base.css` holds design tokens (cream/terracotta/olive palette; Fraunces + DM Sans fonts); `styles/site.css` holds the public site's styles.
- `admin/`: lazy-loaded bundle at `/admin/*`:
  - `AdminLayout` (sidebar; top bar under 900px), `Dashboard`, `LiveOrders`, `OrderDetail`, `PrintTicket`, `OrderHistory`, `MenuManager`, `CateringInbox`, `Customers`, `Settings`.
  - `AdminContext` owns order polling and the new-order chime, so the chime rings on every admin page.
  - `adminUi.js`: shared UI plus the `usePolling` hook. `adminUtils.js`: prefs in `localStorage` under `mardinis.admin.*`, the Web Audio chime, CSV export.
  - `admin.css`: all admin classes are prefixed `adm-`.
- Conventions: tabs, double quotes, semicolons; function components + hooks; API calls go through `api.js` (it throws `ApiError`; toast `e.message`). Keep new admin CSS `adm-`-prefixed and use the base.css tokens.

## Task 1: menu photos

The current image status (checked 2026-09-25 against the live `/api/menu`; item ids are production ids):
- **Working (12):**
  - `i.imgur.com`: item 1.
  - Yelp CDN: items 3, 7, 13, 15, 18.
  - `popmenucloud.com`: item 6.
  - `img.cdn4dd.com`: items 9, 10, 11, 12, 14. This is DoorDash's CDN, and it blocks some of these links already, so the rest could stop working any time.
- **Broken, HTTP 403 from DoorDash's `img.cdn4dd.com` (6):**
  - 2 Falafel Wrap
  - 4 Chicken Gyro Wrap
  - 5 Falafel Deluxe Wrap
  - 8 Dolmas Wrap
  - 16 Beef Kabob Plate
  - 17 Kufta Kabob Plate
- **No image at all (36):** every Salad (19–23), Burger (24–33), Grilled Sandwich (34–45) and Cold Sandwich (46–54).

**Things to settle with the owner before scraping:**
- **Copyright.** Photos on Yelp, DoorDash, Google Maps and competitors' sites belong to their photographers or those platforms. Using them on a business website is risky, and hotlinking them is exactly why links break. Safer sources, best first:
  1. The owner's own photos, including ones the business itself posted on its Google Business Profile or Yelp page.
  2. Free commercial-use stock (Unsplash, Pexels; check each license), clearly generic, e.g. "a Greek salad".
  3. AI-generated images.

  Present candidates for the owner to approve rather than silently swapping in scraped images.
- **Hosting.** `menu_items.image` is only a URL, and the admin item editor has a URL field. Hotlinking is fragile. Better options:
  - Download approved images and host them: a public Supabase Storage bucket is free and already in use, or Cloudinary.
  - Add a real upload button to the admin item editor. The UI is in `client/src/admin/MenuManager.js`; images are set via `PATCH /api/admin/menu_items/:id {image}`.
- **Applying changes:** update images through the admin API or UI, or with a one-off data script against production using `.env.supabase`. Never hand-edit the seeds for this, since production is already seeded.
- The seeded descriptions for many burgers/sandwiches are empty; the owner may want those filled in too.

## Task 2: kitchen tablet / installable Live Orders

**How Live Orders works today** (`client/src/admin/LiveOrders.js` + `AdminContext.js`):
- It polls `GET /api/admin/orders?scope=active` every **10s** (`ORDER_POLL_MS`), pausing while the tab is hidden and refetching when it becomes visible.
- Tickets sit in New / Preparing / Ready columns; each has one big "advance" button plus a ⋮ menu (details, print, cancel).
- New orders trigger a Web Audio chime (browsers need one tap on "Enable sound" first), a toast, and a `(N)` prefix on the tab title.
- On phones the board shows one column at a time. Moves are optimistic with an Undo toast.

**Gaps to address:**
- **PWA install.**
  - `client/public/manifest.json` exists (`display: standalone`, `start_url: "."`), but its icons are **CRA's default React logo** (verified for `logo192.png`; `logo512.png` and `favicon.ico` are almost certainly the same CRA defaults). An installed app would show the React atom, so replace them with Mardini's icons.
  - There's no service worker. Chrome's install prompt may require one, so add a minimal one or use a `workbox`-style setup; don't cache `/api` responses.
  - Consider a separate kitchen manifest/`start_url` (e.g. `/admin/orders` or a new `/kitchen` route) so the installed app opens straight to the board.
- **iPad/iOS specifics:**
  - "Add to Home Screen" apps have their **own cookie jar**, so staff log in once inside the app.
  - The session cookie is `SameSite=Strict`, `secure`, and has no explicit expiry. Check whether sessions survive restarts, and consider a long-lived "remember this device" session for the kitchen.
  - Audio needs a user gesture after every app launch. Make "tap to start" obvious, and re-unlock audio on resume.
- **Keep the screen awake** with the Screen Wake Lock API (`navigator.wakeLock.request("screen")`, re-requested on `visibilitychange`). Some platforms may need a fallback.
- **Kitchen-friendly mode:**
  - Full screen, landscape layout with all three columns visible on a tablet, big touch targets, and larger ticket text.
  - An elapsed-time color scale. Hide the admin sidebar; leave only a way back.
  - Consider a louder or repeating alert until someone acknowledges the new order.
- **Reliability:**
  - Show a clear offline/"reconnecting" banner and a "last updated Xs ago" indicator.
  - Handle the free Render instance sleeping. A tablet polling every 10s actually keeps it awake while the board is open, but the first load after idle takes ~50s.
  - Upgrading to Render Starter (~$7/mo) removes cold starts entirely.
- **Staff accounts:** only `admin` exists today, so giving cooks a login gives them refunds, settings and user management. Add a limited `staff`/`kitchen` role that can only see and advance orders:
  - Backend: new column + authorization in `Api::Admin::OrdersController`.
  - Frontend: hide the other admin nav for that role.
- **Optional:** real-time push instead of polling (Action Cable, or Supabase Realtime). This adds complexity; polling at 10s is fine for one restaurant.
- Test on the actual tablet: use ngrok (see Local development) or the live site.

## Open items (not yet done)

- Confirm `SECRET_KEY_BASE` is spelled right in Render, and that Card payments is off (or live Stripe keys are in).
- Check the tax rate in Admin → Settings: it's still **9.5%**, a legacy value, and Menlo Park's actual rate is unverified. Also check the hours (Mon–Sat 9–9, Sun 10–8 by default) and the prep time (20 min).
- The owner's admin login is whatever `ADMIN_EMAIL`/`ADMIN_PASSWORD` were set in Render (created by the first seed). There's no password-reset flow yet; an admin can't be recovered without console or DB access.
- CRA (`react-scripts` 5) is deprecated. It builds fine, but migrating to Vite is a worthwhile later task.
- `client/.env` (tracked) holds an old `pk_test_` publishable key. The server-provided key takes precedence, so this is harmless, but it can be cleaned up.
- No transactional email (order confirmation, catering notifications). Stripe sends receipts for card payments only.

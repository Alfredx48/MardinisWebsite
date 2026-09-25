# Mardini's Deli Cafe

Website and online ordering for Mardini's Deli Cafe, 408 Willow Rd, Menlo Park, CA.

- **Customers** browse the menu, order ahead for pickup (ASAP or scheduled), pay online with Stripe or at the counter, and follow their order's status live.
- **Staff** run everything from `/admin`: a live kitchen board with new-order chimes, order history and refunds, menu editing (including a one-tap "sold out" switch), hours, tax, announcements, catering requests, and customer accounts.

Ruby 3.4 / Rails 8.1 API (`app/`) + React 18 single-page app (`client/`), PostgreSQL, deployed on Render.

## Running locally

Requirements: Ruby 3.4.11 (see `.ruby-version`), Node 22, PostgreSQL.

```bash
bundle install
npm install --prefix client
bin/rails db:setup   # creates the DB, loads the schema and seeds the menu
bin/dev              # API on :3000 + React on http://localhost:4000
```

To test on a phone through ngrok, run `ngrok http 4000` and start the React server with
`DANGEROUSLY_DISABLE_HOST_CHECK=true` (development only).

In development the seeds create an admin login `admin@example.com` / `password123` if no admin exists yet.

Run the backend tests with `bundle exec rspec`.

## Configuration

Set these in Render (or a local `.env`; see `.env.example`):

| Variable | Needed for |
| --- | --- |
| `DATABASE_URL` | Production database (Render sets this) |
| `STRIPE_SECRET_KEY` | Card payments. Without it, only pay-at-pickup is offered |
| `STRIPE_PUBLISHABLE_KEY` | Card payments (sent to the browser by the API) |
| `STRIPE_WEBHOOK_SECRET` | Optional backup that marks orders paid if a customer closes the tab mid-payment. Point a Stripe webhook for `payment_intent.succeeded` at `/api/stripe/webhook` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Creates the first admin on a fresh production database |

Everything else (hours, tax rate, prep time, payment options, tips, the announcement banner, restaurant info and photos) is edited in **Admin → Settings**.

## How ordering works

1. The cart lives in the browser. At checkout the browser sends only item ids and quantities.
2. `Checkout` (`app/services/checkout.rb`) re-prices everything from the database, adds tax and tip, checks that items aren't sold out, and checks that the pickup time falls within opening hours.
3. **Pay at pickup** orders go straight to the kitchen board. **Card** orders are held as `awaiting_payment` until Stripe confirms the full amount (`app/services/payments.rb`). They never reach the kitchen unpaid.
4. The kitchen moves orders through New → Preparing → Ready → Picked up. Customers see each step on their tracking page (`/order/:token`).

Order lines store the item name and price at the time of ordering, so editing the menu never changes past orders.

## Deploying to Render

`render.yaml` is a Render Blueprint describing the web service and its database.

**New setup:** Render dashboard → **New → Blueprint** → choose this repo. Render creates the `mardinis` web service and `mardinis-db` Postgres database, generates `SECRET_KEY_BASE`, and asks for the Stripe keys and first admin login.

**Existing Render service:** keep it (and its database) and update its settings to match `render.yaml`:
- Build command `./bin/render-build.sh`, start command `bundle exec puma -C config/puma.rb`, health check path `/up`
- Environment: `RAILS_ENV=production`, `BUNDLE_WITHOUT=development:test`, `NODE_VERSION=22`, a `SECRET_KEY_BASE` (`openssl rand -hex 64`), plus the Stripe variables

Every deploy runs `bin/render-build.sh`: install gems, build React into `public/`, run migrations, run seeds. Seeds are safe to run on every deploy: they only fill an empty database and never delete anything.

To use a Supabase database instead of Render's, delete the `databases:` section and the `fromDatabase` block from `render.yaml`, and set `DATABASE_URL` to Supabase's connection string.

# Ember & Oak: shop with checkout, Supabase, Google auth, Mailgun

Next.js 14 (App Router). Flow: browse, cart, sign in with Google, checkout, order saved in Postgres, confirmation email via Mailgun.

Payment is not included. Checkout records the order; add Stripe or Paystack later at `app/api/checkout/route.js`.

## 0. Install

```bash
npm install
cp .env.example .env.local
```

## 1. Supabase (database + auth)

```bash
npx supabase login
npx supabase orgs list                      # note your org id
npx supabase projects create shop --org-id <ORG_ID> --db-password '<STRONG_PASSWORD>' --region eu-west-1
npx supabase projects list                  # note the REF
npx supabase projects api-keys --project-ref <REF>
```

Put into `.env.local`: `NEXT_PUBLIC_SUPABASE_URL=https://<REF>.supabase.co`, the `anon` key, and the `service_role` key.

Create the tables and seed products (copy the connection string from Dashboard > Connect; use the pooler string if your network is IPv4 only):

```bash
psql "postgresql://postgres:<STRONG_PASSWORD>@db.<REF>.supabase.co:5432/postgres" -f supabase/schema.sql
```

## 2. Google auth (Google Cloud Console)

The project and APIs can be done in the terminal. **Creating the OAuth client ID must be done in the Console**; `gcloud` has no command for standard web OAuth clients.

```bash
gcloud auth login
gcloud projects create ember-oak-shop-<RANDOM>
gcloud config set project ember-oak-shop-<RANDOM>
```

Then open https://console.cloud.google.com/apis/credentials:

1. Configure the OAuth consent screen (External, add your email as a test user).
2. Create credentials > OAuth client ID > Web application.
3. Authorized redirect URI: `https://<REF>.supabase.co/auth/v1/callback`
4. Copy the Client ID and Client Secret.

Enable the provider in Supabase from the terminal:

```bash
export SUPABASE_ACCESS_TOKEN=<token from https://supabase.com/dashboard/account/tokens>
curl -X PATCH "https://api.supabase.com/v1/projects/<REF>/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_google_enabled": true,
    "external_google_client_id": "<CLIENT_ID>",
    "external_google_secret": "<CLIENT_SECRET>",
    "site_url": "http://localhost:3000",
    "uri_allow_list": "http://localhost:3000/**"
  }'
```

When you deploy, add your production URL to `site_url` / `uri_allow_list` the same way.

## 3. Mailgun (confirmation emails)

```bash
export MAILGUN_API_KEY=<key from Mailgun > Settings > API keys>

# add a sending domain (EU accounts: api.eu.mailgun.net)
curl -s --user "api:$MAILGUN_API_KEY" https://api.mailgun.net/v4/domains -F name=mg.yourdomain.com
```

The response lists DNS records (SPF, DKIM, MX). Add them at your DNS host, then:

```bash
curl -s --user "api:$MAILGUN_API_KEY" -X PUT https://api.mailgun.net/v4/domains/mg.yourdomain.com/verify
```

Fill `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM`, `MAILGUN_API_URL` in `.env.local`.

No domain yet? Use the Mailgun sandbox domain for testing. It only delivers to recipients you authorize in the Mailgun dashboard.

## 4. Run

```bash
npm run dev
```

Open http://localhost:3000, add items, check out, then check the `orders` table and your inbox.

## Notes

- Prices are always re-read from the database on the server; the browser cart is never trusted.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_`.
- If email fails, the order is still saved and `orders.email_sent` stays `false` (check server logs).
- Rows in `orders` / `order_items` are readable only by their owner via RLS.

## Lesson 3: cart sync across web and mobile
The cart now lives in the Supabase `cart_items` table (see `supabase/cart_items.sql`), keyed to the signed-in user with row-level security.
The website and the mobile app read and write the same rows, and Supabase Realtime pushes changes to whichever one is open.

- Mobile app (Expo): https://github.com/Zaamaar/ember-oak-mobile
- Guests keep a local cart. It merges into their account cart when they sign in.
- Mailgun runs on a sandbox domain, so receipts only reach authorized recipients.

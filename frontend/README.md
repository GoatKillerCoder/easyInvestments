# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Neon database

Manually registered account records, portfolio holdings, and transactions are read from and written to Neon using the server-side `@neondatabase/serverless` driver. Create the `users`, `portfolio_holdings`, and `transactions` tables using the SQL schema provided for the app before saving accounts.

Set `DATABASE_URL` to your Neon pooled connection string, `ADMIN_PIN` to a private administrator PIN, and `ADMIN_SESSION_SECRET` to a random secret of at least 32 bytes. For local development, configure them in `.env` or copy `.dev.vars.example` to `.dev.vars` and replace its placeholders. For deployment, configure all values in the hosting platform's server/Worker environment. Never expose these values as `VITE_*` variables or commit them to the repository.

### Yoco deposits

The Deposit button on `/finances` starts a server-side Checkout API session. Configure `YOCO_SECRET_KEY` with the Yoco Checkout API secret key, `YOCO_WEBHOOK_SECRET` with the signing secret returned when registering the webhook, and `APP_BASE_URL` with the site's canonical origin (for local development, `http://localhost:8080`; production must use HTTPS). Do not use a `VITE_` prefix for either secret.

Register a Yoco Checkout webhook pointing to `https://<your-domain>/api/yoco/webhook` (use a public HTTPS tunnel when testing locally). The handler verifies Yoco's timestamped HMAC signature over the raw request body and processes `payment.succeeded` notifications only after matching the payment reference, amount, and ZAR currency.

The integration uses the existing `payment_attempts`, `transactions`, and `users` tables; it does not create or migrate tables. `payment_attempts.id` must be database-generated, `public_id` must be a unique UUID, and `user_id` must reference `users.id`. The table must already have `amount`, `status`, `provider_checkout_id`, `provider_payment_id`, `transaction_id`, `updated_at`, and `paid_at` columns; `transaction_id` must reference `transactions.id`. The existing `transactions` table must have its current `user_id`, `transaction_date`, `type`, `method`, `status`, and `amount` columns, and `users.balance` must be a numeric balance. `portfolio_holdings` and `portfolio_value_snapshots` are not changed by this deposit flow. A verified payment atomically transitions the attempt to `Paid`, creates its `Completed` Yoco deposit transaction, links it, and credits the user's balance once; webhook retries do not credit it again.

Passwords are hashed server-side; only the salt and hash are stored in the database. Admin sign-in validates the PIN server-side and issues an expiring signed session token; admin account-list and account-creation requests require that token.

### Client communications

The authenticated client inbox is available at `/communication`; the administrator inbox and individual conversations are at `/admin/communications` and `/admin/communications/:id`. These pages use the existing `chat_conversations` and `chat_messages` PostgreSQL tables through authenticated TanStack Start server functions. Client identity comes from the signed user session, and administrator requests require the existing signed admin session. The admin PIN system has no administrator user ID, so configure `ADMIN_USER_ID` with the UUID of an active support identity in `users`; the server uses that configured identity for admin message foreign keys and never accepts a sender ID or role from the browser. No messaging tables or triggers are created. Active conversations poll for updates every 10 seconds; the inbox polls every 15–20 seconds. Resolved and closed conversations are read-only for clients and can be reopened by an administrator.

### Withdrawal requests

Withdrawals on `/finances` are requests for manual review; no payout provider is configured and submission does not transfer money. The server creates `withdrawal_requests` on first use, with an idempotency key per user, a unique reference, status, fee, destination summary, and encrypted destination details. Destination encryption uses a purpose-separated key derived from `ADMIN_SESSION_SECRET`, so keep that secret stable and private. The server atomically reserves the requested cash from `users.balance`; the request remains `Pending` and is included in the signed-in user's finance history. Rejected requests are not treated as completed payouts. The request-time fee is zero; any later payout fee and processing time must be disclosed and confirmed before arranging a transfer. PayPal and bank details are accepted for review only and are not evidence of an enabled transfer integration.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

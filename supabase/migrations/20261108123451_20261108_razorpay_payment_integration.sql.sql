/*
# Razorpay Payment Integration

## Purpose
Add Razorpay-specific columns to the transactions and user_subscriptions tables
to support real payment processing through the Razorpay gateway. Razorpay is
the chosen gateway for this Indian JEE practice platform (supports UPI, cards,
net banking, wallets — all common Indian payment methods).

## Changes

### 1. transactions table — new columns
- `razorpay_order_id` (text, nullable) — the order ID returned by Razorpay when
  an order is created on the server. Used to match the payment to our transaction.
- `razorpay_payment_id` (text, nullable) — the payment ID returned by Razorpay
  after the student completes payment. Used for refunds and record-keeping.
- `razorpay_signature` (text, nullable) — the signature sent by Razorpay to the
  webhook, used to verify the payment is genuine (HMAC-SHA256).

### 2. user_subscriptions table — new column
- `razorpay_payment_id` (text, nullable) — links a subscription to the Razorpay
  payment that activated it, for audit and refund tracking.

### 3. Security
- No new tables. No RLS policy changes (existing policies already cover these columns).
- All three new columns are nullable so existing rows are unaffected.
- The razorpay_signature column is never exposed to the client — it is only used
  by the webhook edge function for server-side verification.
- No grants changes needed: existing CRUD grants on transactions and
  user_subscriptions already cover the new columns.

### 4. Index for webhook lookups
- Index on transactions.razorpay_order_id for fast webhook payment matching.
- Index on transactions.razorpay_payment_id for refund lookups.

## Important notes
1. The migration is idempotent — uses IF NOT EXISTS for all new columns.
2. No data is lost or changed — only new nullable columns are added.
3. The existing stripe_session_id columns remain for backward compatibility but
   are no longer used; Razorpay columns are the active payment reference.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'razorpay_order_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN razorpay_order_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'razorpay_payment_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN razorpay_payment_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'razorpay_signature'
  ) THEN
    ALTER TABLE transactions ADD COLUMN razorpay_signature text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'razorpay_payment_id'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN razorpay_payment_id text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_razorpay_order_id
  ON transactions (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_razorpay_payment_id
  ON transactions (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

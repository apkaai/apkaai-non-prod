-- ============================================================
-- ApkaAI PostgreSQL Schema
-- Run once: psql -h HOST -U USER -d apkaai -f schema.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── categories ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  slug        VARCHAR(100) PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  emoji       VARCHAR(10)  NOT NULL,
  description TEXT,
  tool_count  INTEGER      DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ── tools ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tools (
  id              VARCHAR(50)  PRIMARY KEY,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  name            VARCHAR(200) NOT NULL,
  tagline         VARCHAR(300),
  description     TEXT,
  category        VARCHAR(200),
  category_slug   VARCHAR(100) REFERENCES categories(slug),
  logo            VARCHAR(10),
  website         VARCHAR(500),
  pricing         VARCHAR(50)  CHECK (pricing IN ('Free','Freemium','Paid','Free Trial')),
  starting_price  VARCHAR(100),
  monthly_price   INTEGER      DEFAULT 0,
  rating          NUMERIC(3,1) DEFAULT 0,
  reviews         INTEGER      DEFAULT 0,
  tags            TEXT[],
  featured        BOOLEAN      DEFAULT FALSE,
  is_new          BOOLEAN      DEFAULT FALSE,
  badge           VARCHAR(100),
  pricing_plans   JSONB,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tools_category_slug ON tools(category_slug);
CREATE INDEX IF NOT EXISTS idx_tools_pricing       ON tools(pricing);
CREATE INDEX IF NOT EXISTS idx_tools_featured      ON tools(featured);
CREATE INDEX IF NOT EXISTS idx_tools_rating        ON tools(rating DESC);

-- ── contacts ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(200) NOT NULL,
  subject    VARCHAR(200),
  message    TEXT         NOT NULL,
  sent_to    VARCHAR(200) DEFAULT 'ashutoshkumarpandey@apkaai.com',
  status     VARCHAR(50)  DEFAULT 'new',
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ── users ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 VARCHAR(200) UNIQUE NOT NULL,
  name                  VARCHAR(200) NOT NULL,
  password              VARCHAR(500) NOT NULL,
  role                  VARCHAR(50)  DEFAULT 'user',
  reset_token           VARCHAR(64),           -- SHA-256 hex hash of the raw reset token
  reset_token_expires   TIMESTAMPTZ,           -- 30-minute expiry timestamp
  created_at            TIMESTAMPTZ  DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- ── trigger: update updated_at automatically ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tools_updated_at
  BEFORE UPDATE ON tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── cloud_estimates ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cloud_estimates (
  id            VARCHAR(50)  PRIMARY KEY,
  user_id       UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  provider      VARCHAR(20)  NOT NULL,
  currency      VARCHAR(5)   DEFAULT 'USD',
  tax           BOOLEAN      DEFAULT FALSE,
  tax_rate      NUMERIC(5,2) DEFAULT 0,
  monthly_cost  NUMERIC(12,4) NOT NULL,
  items         JSONB        DEFAULT '[]',
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cloud_estimates_user ON cloud_estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_estimates_created ON cloud_estimates(created_at DESC);

CREATE OR REPLACE TRIGGER cloud_estimates_updated_at
  BEFORE UPDATE ON cloud_estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── user_history ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_history (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_type    VARCHAR(30)  NOT NULL CHECK (event_type IN ('view','search','compare','cart_add','cart_remove')),
  tool_id       VARCHAR(50),
  tool_slug     VARCHAR(100),
  tool_name     VARCHAR(200),
  tool_logo     VARCHAR(10),
  tool_category VARCHAR(200),
  search_query  VARCHAR(300),
  extra         JSONB        DEFAULT '{}',
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_user_id    ON user_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON user_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_event_type ON user_history(event_type);

-- ── orders ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  order_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status        VARCHAR(30)  NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','confirmed','processing','completed','cancelled','refunded')),
  subtotal      NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax           NUMERIC(12,2) NOT NULL DEFAULT 0,
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  coupon_code   VARCHAR(50),
  payment_method VARCHAR(50) DEFAULT 'pending',
  payment_id    VARCHAR(200),
  notes         TEXT,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ── order_items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID         NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  tool_id       VARCHAR(50)  NOT NULL,
  tool_name     VARCHAR(200) NOT NULL,
  tool_slug     VARCHAR(100) NOT NULL,
  tool_logo     VARCHAR(10),
  tool_category VARCHAR(200),
  plan_name     VARCHAR(100) NOT NULL,
  plan_price    VARCHAR(100) NOT NULL,
  plan_monthly  NUMERIC(12,2) NOT NULL DEFAULT 0,
  billing_cycle VARCHAR(20)  NOT NULL DEFAULT 'monthly',
  quantity      INTEGER      NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE OR REPLACE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── user_wishlist ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_wishlist (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  tool_id       VARCHAR(50)  NOT NULL,
  tool_slug     VARCHAR(100) NOT NULL,
  tool_name     VARCHAR(200) NOT NULL,
  tool_logo     VARCHAR(10),
  tool_category VARCHAR(200),
  tool_pricing  VARCHAR(50),
  tool_rating   NUMERIC(3,1) DEFAULT 0,
  tool_tagline  VARCHAR(300),
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON user_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_tool_id ON user_wishlist(tool_id);

-- ── tool_reviews ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tool_reviews (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id     VARCHAR(50)  NOT NULL,
  tool_slug   VARCHAR(100) NOT NULL,
  user_id     UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  rating      INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       VARCHAR(200),
  body        TEXT,
  helpful     INTEGER      DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(tool_id, user_id)   -- one review per tool per user
);

CREATE INDEX IF NOT EXISTS idx_reviews_tool_id ON tool_reviews(tool_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON tool_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON tool_reviews(created_at DESC);

CREATE OR REPLACE TRIGGER tool_reviews_updated_at
  BEFORE UPDATE ON tool_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── referrals ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  referred_id     UUID         REFERENCES users(user_id) ON DELETE SET NULL,
  code            VARCHAR(20)  UNIQUE NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','signed_up','rewarded')),
  reward_applied  BOOLEAN      DEFAULT FALSE,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  converted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code     ON referrals(code);

-- Store referral code on user for easy lookup
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by   UUID REFERENCES users(user_id) ON DELETE SET NULL;

-- ── newsletter_subscribers ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(200) UNIQUE NOT NULL,
  name         VARCHAR(200),
  source       VARCHAR(50)  DEFAULT 'website',
  status       VARCHAR(20)  DEFAULT 'active' CHECK (status IN ('active','unsubscribed')),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email  ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers(status);

-- ── aws_price_cache ───────────────────────────────────────────────────────────
-- Caches live AWS pricing API results for 24 hours to avoid hammering the API
CREATE TABLE IF NOT EXISTS aws_price_cache (
  cache_key    VARCHAR(200) PRIMARY KEY,  -- e.g. "ec2:t3.medium:ap-south-1:linux"
  service_code VARCHAR(50)  NOT NULL,     -- AmazonEC2, AmazonRDS, AmazonS3
  region       VARCHAR(50)  NOT NULL,     -- ap-south-1
  price_usd    NUMERIC(12,6) NOT NULL,    -- on-demand hourly price in USD
  unit         VARCHAR(50)  DEFAULT 'Hrs',
  description  TEXT,
  raw_json     JSONB,                     -- full AWS response for debugging
  fetched_at   TIMESTAMPTZ  DEFAULT NOW(),
  expires_at   TIMESTAMPTZ  DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_price_cache_expires  ON aws_price_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_price_cache_service  ON aws_price_cache(service_code, region);

-- ── invoices ──────────────────────────────────────────────────────────────────
-- Tracks generated PDF invoices uploaded to S3
CREATE TABLE IF NOT EXISTS invoices (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID         UNIQUE NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  user_id     UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  invoice_no  VARCHAR(50)  NOT NULL,
  email       VARCHAR(200),
  amount      NUMERIC(12,2),
  s3_key      VARCHAR(500),          -- e.g. invoices/2026/INV-XXXXXXXX.pdf
  email_sent  BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id  ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);

-- ── demo_bookings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demo_bookings (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(200) NOT NULL,
  email            VARCHAR(200) NOT NULL,
  company          VARCHAR(200),
  phone            VARCHAR(30),
  use_case         TEXT,
  slot_date        DATE         NOT NULL,               -- e.g. 2026-10-15
  slot_time        TIME         NOT NULL,               -- e.g. 14:30:00
  slot_timezone    VARCHAR(80)  DEFAULT 'Asia/Kolkata',
  duration_minutes INTEGER      DEFAULT 30,
  status           VARCHAR(20)  DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  calendar_type    VARCHAR(20)  DEFAULT 'google'
                   CHECK (calendar_type IN ('google','outlook','teams','none')),
  meeting_link     TEXT,                                -- Google Meet / Teams link
  google_event_id  VARCHAR(200),                        -- Google Calendar event id
  ms_event_id      VARCHAR(200),                        -- Microsoft Graph event id
  reminder_24h_sent BOOLEAN     DEFAULT FALSE,
  reminder_1h_sent  BOOLEAN     DEFAULT FALSE,
  cancellation_reason TEXT,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_email       ON demo_bookings(email);
CREATE INDEX IF NOT EXISTS idx_demo_slot_date   ON demo_bookings(slot_date);
CREATE INDEX IF NOT EXISTS idx_demo_status      ON demo_bookings(status);

CREATE OR REPLACE TRIGGER demo_bookings_updated_at
  BEFORE UPDATE ON demo_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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

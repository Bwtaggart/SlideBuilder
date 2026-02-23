-- ═══════════════════════════════════════════════════════════════════
-- SlideBuilder Database Schema (Supabase/Postgres)
-- ═══════════════════════════════════════════════════════════════════

-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage logs for cost tracking
CREATE TABLE IF NOT EXISTS usage_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  service_type TEXT CHECK (service_type IN ('nano_banana_image', 'gemini_text')) NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0
);

CREATE INDEX idx_usage_logs_user_timestamp ON usage_logs(user_id, timestamp);

-- Presentations
CREATE TABLE IF NOT EXISTS presentations (
  presentation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  global_prompt TEXT NOT NULL DEFAULT '',
  negative_prompt TEXT NOT NULL DEFAULT '',
  base_template_url TEXT,
  aspect_ratio TEXT CHECK (aspect_ratio IN ('16:9', '4:3', '9:16')) DEFAULT '16:9',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slides
CREATE TABLE IF NOT EXISTS slides (
  slide_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID REFERENCES presentations(presentation_id) ON DELETE CASCADE,
  slide_index INTEGER NOT NULL DEFAULT 0,
  local_prompt TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  bullets JSONB DEFAULT '[]'::jsonb,
  rendered_text_payload TEXT,
  image_url TEXT,
  speaker_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_slides_presentation ON slides(presentation_id, slide_index);

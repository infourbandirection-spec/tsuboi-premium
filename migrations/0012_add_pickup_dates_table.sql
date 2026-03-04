-- Add pickup_dates table for admin management
-- Migration: 0012_add_pickup_dates_table

-- 購入日マスタテーブル
CREATE TABLE IF NOT EXISTS pickup_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pickup_date TEXT NOT NULL UNIQUE,           -- 購入日（YYYY-MM-DD形式）
  display_label TEXT NOT NULL,                -- 表示ラベル（例：3月16日（月））
  phase INTEGER NOT NULL DEFAULT 1,           -- フェーズ（1 or 2）
  is_active INTEGER NOT NULL DEFAULT 1,       -- 有効/無効（1=有効, 0=無効）
  display_order INTEGER NOT NULL DEFAULT 0,   -- 表示順序
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_pickup_dates_phase ON pickup_dates(phase);
CREATE INDEX IF NOT EXISTS idx_pickup_dates_active ON pickup_dates(is_active);
CREATE INDEX IF NOT EXISTS idx_pickup_dates_order ON pickup_dates(display_order);

-- 初期データ挿入（Phase 1の購入日）
INSERT OR IGNORE INTO pickup_dates (pickup_date, display_label, phase, is_active, display_order) VALUES
  ('2026-03-16', '3月16日（月）', 1, 1, 1),
  ('2026-03-17', '3月17日（火）', 1, 1, 2),
  ('2026-03-18', '3月18日（水）', 1, 1, 3);

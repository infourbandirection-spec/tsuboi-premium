-- tsuboi-premium-production データベース用マイグレーションSQL
-- Cloudflare D1 Console で実行してください
-- 実行時間: 約10-20秒

-- 予約情報テーブル
CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id TEXT UNIQUE NOT NULL,
    birth_date TEXT NOT NULL,
    full_name TEXT NOT NULL,
    kana TEXT,
    phone_number TEXT NOT NULL,
    email TEXT,
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 3),
    store_location TEXT NOT NULL,
    pickup_date TEXT NOT NULL,
    pickup_time_slot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'completed', 'canceled', 'winner', 'loser', 'picked_up')),
    lottery_status TEXT DEFAULT 'pending',
    reservation_phase INTEGER DEFAULT 1,
    lottery_executed_at TEXT,
    picked_up_at TEXT,
    picked_up_by TEXT,
    excluded_from_lottery INTEGER DEFAULT 0,
    excluded_reason TEXT,
    excluded_at TEXT,
    excluded_by TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_reservation_id ON reservations(reservation_id);
CREATE INDEX IF NOT EXISTS idx_phone_number ON reservations(phone_number);
CREATE INDEX IF NOT EXISTS idx_email ON reservations(email);
CREATE INDEX IF NOT EXISTS idx_kana ON reservations(kana);
CREATE INDEX IF NOT EXISTS idx_pickup_date ON reservations(pickup_date);
CREATE INDEX IF NOT EXISTS idx_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_lottery_status ON reservations(lottery_status);
CREATE INDEX IF NOT EXISTS idx_phase ON reservations(reservation_phase);
CREATE INDEX IF NOT EXISTS idx_excluded ON reservations(excluded_from_lottery);
CREATE INDEX IF NOT EXISTS idx_created_at ON reservations(created_at);

-- システム設定テーブル
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 店舗マスターテーブル
CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    business_hours TEXT,
    is_active INTEGER DEFAULT 1
);

-- 管理者ユーザーテーブル
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- セッショントークンテーブル
CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (username) REFERENCES admin_users(username)
);

-- メール送信履歴テーブル
CREATE TABLE IF NOT EXISTS email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL,
  message_id TEXT,
  error_message TEXT,
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);

CREATE INDEX IF NOT EXISTS idx_email_logs_reservation_id ON email_logs(reservation_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- 抽選結果履歴テーブル
CREATE TABLE IF NOT EXISTS lottery_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_applications INTEGER NOT NULL,
  total_quantity_requested INTEGER NOT NULL,
  winners_count INTEGER NOT NULL,
  winners_quantity INTEGER NOT NULL,
  losers_count INTEGER NOT NULL,
  losers_quantity INTEGER NOT NULL,
  notes TEXT
);

-- 購入日マスタテーブル
CREATE TABLE IF NOT EXISTS pickup_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pickup_date TEXT NOT NULL UNIQUE,
  display_label TEXT NOT NULL,
  phase INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pickup_dates_phase ON pickup_dates(phase);
CREATE INDEX IF NOT EXISTS idx_pickup_dates_active ON pickup_dates(is_active);
CREATE INDEX IF NOT EXISTS idx_pickup_dates_order ON pickup_dates(display_order);

-- 購入時間帯マスタテーブル
CREATE TABLE IF NOT EXISTS pickup_time_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  time_slot TEXT NOT NULL UNIQUE,
  display_label TEXT NOT NULL,
  phase INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pickup_time_slots_phase ON pickup_time_slots(phase);
CREATE INDEX IF NOT EXISTS idx_pickup_time_slots_active ON pickup_time_slots(is_active);
CREATE INDEX IF NOT EXISTS idx_pickup_time_slots_order ON pickup_time_slots(display_order);

-- 初期データ挿入
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('max_total_books', '1000', '総発行上限冊数'),
('reservation_enabled', 'true', '予約受付中フラグ'),
('lottery_executed', 'false', '抽選実行済みフラグ'),
('lottery_executed_at', '', '抽選実行日時'),
('current_phase', '1', '現在のフェーズ'),
('max_total_quantity', '1000', '最大予約冊数');

-- 店舗データ挿入
INSERT OR IGNORE INTO stores (store_name, address, phone, business_hours, is_active) VALUES
('一畳屋ショールーム', '熊本県熊本市中央区坪井5丁目2-27', '096-XXX-XXXX', '営業時間はお問い合わせください', 1);

-- 初期管理者アカウント
INSERT OR IGNORE INTO admin_users (username, password_hash) VALUES 
  ('urbandirection', 'urbandirection');

-- Phase 1の購入日
INSERT OR IGNORE INTO pickup_dates (pickup_date, display_label, phase, is_active, display_order) VALUES
  ('2026-03-16', '3月16日（月）', 1, 1, 1),
  ('2026-03-17', '3月17日（火）', 1, 1, 2),
  ('2026-03-18', '3月18日（水）', 1, 1, 3);

-- Phase 1の時間帯
INSERT OR IGNORE INTO pickup_time_slots (time_slot, display_label, phase, is_active, display_order) VALUES
  ('10:00～11:00', '10:00～11:00', 1, 1, 1),
  ('11:00～12:00', '11:00～12:00', 1, 1, 2),
  ('12:00～13:00', '12:00～13:00', 1, 1, 3),
  ('13:00～14:00', '13:00～14:00', 1, 1, 4),
  ('14:00～15:00', '14:00～15:00', 1, 1, 5),
  ('15:00～16:00', '15:00～16:00', 1, 1, 6),
  ('16:00～17:00', '16:00～17:00', 1, 1, 7),
  ('17:00～18:00', '17:00～18:00', 1, 1, 8),
  ('18:00～19:00', '18:00～19:00', 1, 1, 9),
  ('19:00～20:00', '19:00～20:00', 1, 1, 10);

-- トリガー作成
CREATE TRIGGER IF NOT EXISTS update_reservations_timestamp 
AFTER UPDATE ON reservations
BEGIN
    UPDATE reservations SET updated_at = datetime('now', 'localtime') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_system_settings_timestamp 
AFTER UPDATE ON system_settings
BEGIN
    UPDATE system_settings SET updated_at = datetime('now', 'localtime') WHERE id = NEW.id;
END;

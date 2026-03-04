-- プレミアム商品券予約システム - 初期スキーマ

-- 予約情報テーブル
CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id TEXT UNIQUE NOT NULL,
    birth_date TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 3),
    store_location TEXT NOT NULL,
    pickup_date TEXT NOT NULL,
    pickup_time_slot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'completed', 'canceled')),
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_reservation_id ON reservations(reservation_id);
CREATE INDEX IF NOT EXISTS idx_phone_number ON reservations(phone_number);
CREATE INDEX IF NOT EXISTS idx_pickup_date ON reservations(pickup_date);
CREATE INDEX IF NOT EXISTS idx_status ON reservations(status);
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

-- 初期データ挿入
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('max_total_books', '1000', '総発行上限冊数'),
('is_accepting_reservations', 'true', '予約受付中フラグ');

-- 店舗データ挿入
INSERT INTO stores (store_name, address, phone, business_hours, is_active) VALUES
('一畳屋ショールーム', '熊本県熊本市中央区坪井5丁目2-27', '096-XXX-XXXX', '営業時間はお問い合わせください', 1);

-- 更新日時自動更新トリガー（reservations）
CREATE TRIGGER IF NOT EXISTS update_reservations_timestamp 
AFTER UPDATE ON reservations
BEGIN
    UPDATE reservations SET updated_at = datetime('now', 'localtime') WHERE id = NEW.id;
END;

-- 更新日時自動更新トリガー（system_settings）
CREATE TRIGGER IF NOT EXISTS update_system_settings_timestamp 
AFTER UPDATE ON system_settings
BEGIN
    UPDATE system_settings SET updated_at = datetime('now', 'localtime') WHERE id = NEW.id;
END;

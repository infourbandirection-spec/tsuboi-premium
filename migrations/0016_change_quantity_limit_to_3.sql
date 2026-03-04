-- 冊数制限を6冊から3冊に変更
-- Change quantity limit from 6 to 3

-- 既存の制約を削除して新しい制約を追加
-- SQLiteでは制約の直接変更ができないため、テーブルを再作成

-- 1. 一時テーブルを作成（全カラムを含む）
CREATE TABLE reservations_temp (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id TEXT UNIQUE NOT NULL,
  birth_date TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 3),
  store_location TEXT NOT NULL,
  pickup_date TEXT NOT NULL,
  pickup_time_slot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'winner', 'loser', 'canceled', 'completed', 'picked_up')),
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime')),
  email TEXT,
  kana TEXT,
  lottery_status TEXT DEFAULT 'pending',
  reservation_phase INTEGER DEFAULT 1,
  lottery_executed_at TEXT,
  picked_up_at TEXT,
  picked_up_by TEXT,
  excluded_from_lottery INTEGER DEFAULT 0,
  excluded_reason TEXT,
  excluded_at TEXT,
  excluded_by TEXT
);

-- 2. 既存データをコピー（3冊以下のみ）
INSERT INTO reservations_temp 
SELECT * FROM reservations WHERE quantity <= 3;

-- 3. 元のテーブルを削除
DROP TABLE reservations;

-- 4. 一時テーブルを本テーブルにリネーム
ALTER TABLE reservations_temp RENAME TO reservations;

-- 5. インデックスを再作成
CREATE INDEX idx_reservation_id ON reservations(reservation_id);
CREATE INDEX idx_phone_number ON reservations(phone_number);
CREATE INDEX idx_pickup_date ON reservations(pickup_date);
CREATE INDEX idx_status ON reservations(status);
CREATE INDEX idx_created_at ON reservations(created_at);

-- 6. トリガーを再作成
CREATE TRIGGER update_reservations_timestamp 
AFTER UPDATE ON reservations
FOR EACH ROW
BEGIN
  UPDATE reservations SET updated_at = datetime('now', 'localtime') WHERE id = NEW.id;
END;

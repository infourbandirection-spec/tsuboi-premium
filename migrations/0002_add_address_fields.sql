-- 住所フィールド追加マイグレーション

-- 予約テーブルに住所関連フィールドを追加
ALTER TABLE reservations ADD COLUMN address TEXT;
ALTER TABLE reservations ADD COLUMN address_type TEXT CHECK (address_type IN ('workplace', 'home'));

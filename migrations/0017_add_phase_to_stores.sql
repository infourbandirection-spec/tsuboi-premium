-- フェーズ別店舗管理
-- storesテーブルにphase列を追加

ALTER TABLE stores ADD COLUMN phase INTEGER NOT NULL DEFAULT 1;

-- 既存の一畳屋ショールームをフェーズ1に設定
UPDATE stores SET phase = 1 WHERE id = 2;

-- フェーズ2用にlittle vintageを追加
INSERT INTO stores (store_name, address, phone, business_hours, is_active, phase) VALUES
('little vintage', '熊本県熊本市中央区坪井5丁目1-49', '096-XXX-XXXX', '営業時間はお問い合わせください', 1, 2);

-- フェーズ別インデックス作成
CREATE INDEX IF NOT EXISTS idx_stores_phase ON stores(phase);

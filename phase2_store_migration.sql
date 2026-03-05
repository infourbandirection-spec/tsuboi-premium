-- フェーズ2店舗設定マイグレーション
-- Cloudflare D1コンソールで実行してください

-- 1. storesテーブルにphase列を追加（存在しない場合のみ）
ALTER TABLE stores ADD COLUMN phase INTEGER NOT NULL DEFAULT 1;

-- 2. 既存の一畳屋ショールームをフェーズ1に設定
UPDATE stores SET phase = 1 WHERE store_name = '一畳屋ショールーム';

-- 3. フェーズ2用にlittle vintageを追加（重複チェック付き）
INSERT INTO stores (store_name, address, phone, business_hours, is_active, phase) 
SELECT 'little vintage', '熊本県熊本市中央区坪井5丁目1-49', '096-XXX-XXXX', '営業時間はお問い合わせください', 1, 2
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE store_name = 'little vintage' AND phase = 2);

-- 4. インデックス作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_stores_phase ON stores(phase);

-- 5. 確認クエリ
SELECT * FROM stores ORDER BY phase, id;

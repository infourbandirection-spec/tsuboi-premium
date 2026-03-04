-- 販売店舗を一畳屋ショールームに変更

-- 既存店舗を全て削除
DELETE FROM stores;

-- 新しい販売店舗情報を挿入
INSERT INTO stores (store_name, address, phone, business_hours, is_active) VALUES
('一畳屋ショールーム', '熊本県熊本市中央区坪井5丁目2-27', '096-XXX-XXXX', '営業時間はお問い合わせください', 1);

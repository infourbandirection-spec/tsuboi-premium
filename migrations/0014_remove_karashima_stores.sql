-- 辛島関連店舗の削除
-- 坪井繁栄会辛島公園と熊本市辛島公園地下駐車場を除外

DELETE FROM stores WHERE store_name = '坪井繁栄会辛島公園';
DELETE FROM stores WHERE store_name = '熊本市辛島公園地下駐車場';

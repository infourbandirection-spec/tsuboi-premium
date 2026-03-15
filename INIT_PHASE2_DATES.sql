-- ================================================
-- Phase 2 購入日の初期データ投入
-- ================================================
-- 
-- 目的: 3月16日～3月22日の7日間を初期データとして登録
-- 
-- 実行日: 2026-03-15（本日）
-- 
-- 以降は毎日午前0時（JST）に自動ローテーション:
--   - 前日の日付を無効化
--   - 1週間後の日付を追加/有効化
-- 
-- ================================================

-- Phase 2 購入日の初期データ（3月16日～3月22日）
INSERT INTO pickup_dates (pickup_date, display_label, phase, is_active, display_order, created_at, updated_at) VALUES 
('2026-03-16', '3月16日（月）', 2, 1, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-17', '3月17日（火）', 2, 1, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-18', '3月18日（水）', 2, 1, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-19', '3月19日（木）', 2, 1, 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-20', '3月20日（金）', 2, 1, 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-21', '3月21日（土）', 2, 1, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-22', '3月22日（日）', 2, 1, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 確認クエリ
SELECT * FROM pickup_dates WHERE phase = 2 ORDER BY display_order, pickup_date;

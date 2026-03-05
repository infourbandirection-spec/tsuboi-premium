-- ========================================
-- 本番環境リセット - 簡易版SQL（全ステップ）
-- ========================================
-- 実行場所: Cloudflare D1 Console
-- URL: https://dash.cloudflare.com/e74e780cd3e5705ede60a66c07a3d2bb/workers-and-pages
--      → D1 → tsuboi-premium-production → Console
-- 
-- 注意: 各SQLを1つずつ実行し、結果を確認してから次に進んでください
-- ========================================

-- ステップ1: 実行前の状態確認
SELECT 
  (SELECT COUNT(*) FROM reservations) as total_reservations,
  (SELECT COUNT(*) FROM reservations WHERE lottery_status = 'won') as total_winners,
  (SELECT COUNT(*) FROM email_logs) as total_email_logs,
  (SELECT setting_value FROM system_settings WHERE setting_key = 'current_phase') as current_phase,
  (SELECT setting_value FROM system_settings WHERE setting_key = 'lottery_executed') as lottery_executed;

-- ステップ2: テストデータ削除
DELETE FROM reservations;
DELETE FROM email_logs;

-- ステップ3: システム設定リセット
UPDATE system_settings SET setting_value = '1', updated_at = datetime('now', 'localtime') WHERE setting_key = 'current_phase';
UPDATE system_settings SET setting_value = 'false', updated_at = datetime('now', 'localtime') WHERE setting_key = 'lottery_executed';
UPDATE system_settings SET setting_value = '0', updated_at = datetime('now', 'localtime') WHERE setting_key = 'winners_count';
UPDATE system_settings SET setting_value = 'true', updated_at = datetime('now', 'localtime') WHERE setting_key = 'reservation_enabled';

-- ステップ4: リセット後の確認
SELECT 
  (SELECT COUNT(*) FROM reservations) as remaining_reservations,
  (SELECT COUNT(*) FROM email_logs) as remaining_email_logs;

SELECT setting_key, setting_value, updated_at 
FROM system_settings 
WHERE setting_key IN ('current_phase', 'lottery_executed', 'winners_count', 'reservation_enabled', 'max_total_books')
ORDER BY setting_key;

-- ステップ5: 店舗設定確認
SELECT id, store_name, address, phase, is_active FROM stores ORDER BY phase, id;

-- ステップ6: 購入日時確認（フェーズ1）
SELECT phase, pickup_date, is_active FROM pickup_dates WHERE phase = 1 ORDER BY pickup_date;
SELECT phase, time_slot, is_active FROM pickup_time_slots WHERE phase = 1 ORDER BY time_slot;

-- ========================================
-- 期待される結果
-- ========================================
-- ステップ1: 現在のデータを確認（削除前のバックアップ用）
-- ステップ2: データ削除成功
-- ステップ3: システム設定更新成功
-- ステップ4:
--   remaining_reservations = 0
--   remaining_email_logs = 0
--   current_phase = '1'
--   lottery_executed = 'false'
--   winners_count = '0'
--   reservation_enabled = 'true'
--   max_total_books = '1490'
-- ステップ5:
--   Phase 1: 一畳屋ショールーム
--   Phase 2: little vintage
-- ステップ6: 購入日と時間帯が正しく設定されている
-- ========================================

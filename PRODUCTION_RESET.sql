-- ========================================
-- 本番環境リセットSQL
-- ========================================
-- 目的: テストデータを削除し、本番運用開始の初期状態にする
-- 実行タイミング: 本番運用開始前（テストデータ削除後）
-- 実行場所: Cloudflare D1 Console
--          https://dash.cloudflare.com/e74e780cd3e5705ede60a66c07a3d2bb/workers-and-pages
--          → D1 → tsuboi-premium-production → Console
-- ========================================

-- ----------------------------------------
-- ステップ1: 現在の状態確認（実行前）
-- ----------------------------------------
-- 実行前に必ず現在の状態を確認してください
SELECT 
  (SELECT COUNT(*) FROM reservations) as total_reservations,
  (SELECT COUNT(*) FROM reservations WHERE lottery_status = 'won') as total_winners,
  (SELECT COUNT(*) FROM email_logs) as total_email_logs,
  (SELECT setting_value FROM system_settings WHERE setting_key = 'current_phase') as current_phase,
  (SELECT setting_value FROM system_settings WHERE setting_key = 'lottery_executed') as lottery_executed;

-- ----------------------------------------
-- ステップ2: バックアップ確認（推奨）
-- ----------------------------------------
-- 削除前に重要なデータがある場合は、以下のクエリで内容を確認してください
-- SELECT * FROM reservations LIMIT 10;
-- SELECT * FROM email_logs LIMIT 10;

-- ----------------------------------------
-- ステップ3: テストデータ削除
-- ----------------------------------------

-- 3-1. 応募データをすべて削除
DELETE FROM reservations;

-- 3-2. メール送信ログを削除
DELETE FROM email_logs;

-- ----------------------------------------
-- ステップ4: システム設定を初期状態にリセット
-- ----------------------------------------

-- 4-1. フェーズを1に戻す
UPDATE system_settings 
SET setting_value = '1', updated_at = datetime('now', 'localtime')
WHERE setting_key = 'current_phase';

-- 4-2. 抽選未実行状態にする
UPDATE system_settings 
SET setting_value = 'false', updated_at = datetime('now', 'localtime')
WHERE setting_key = 'lottery_executed';

-- 4-3. 当選者数をリセット
UPDATE system_settings 
SET setting_value = '0', updated_at = datetime('now', 'localtime')
WHERE setting_key = 'winners_count';

-- 4-4. 応募受付を有効にする（念のため確認）
UPDATE system_settings 
SET setting_value = 'true', updated_at = datetime('now', 'localtime')
WHERE setting_key = 'reservation_enabled';

-- 4-5. 総発行上限を確認（必要に応じて変更）
-- UPDATE system_settings 
-- SET setting_value = '1490', updated_at = datetime('now', 'localtime')
-- WHERE setting_key = 'max_total_books';

-- ----------------------------------------
-- ステップ5: リセット後の状態確認
-- ----------------------------------------

-- 5-1. データが削除されたことを確認
SELECT 
  (SELECT COUNT(*) FROM reservations) as remaining_reservations,
  (SELECT COUNT(*) FROM email_logs) as remaining_email_logs;

-- 5-2. システム設定が正しくリセットされたことを確認
SELECT setting_key, setting_value, updated_at 
FROM system_settings 
WHERE setting_key IN (
  'current_phase', 
  'lottery_executed', 
  'winners_count', 
  'reservation_enabled',
  'max_total_books'
)
ORDER BY setting_key;

-- ----------------------------------------
-- ステップ6: 店舗・購入日時設定の確認
-- ----------------------------------------

-- 6-1. フェーズ別店舗が正しく設定されているか確認
SELECT id, store_name, address, phase, is_active 
FROM stores 
ORDER BY phase, id;

-- 6-2. 購入日が設定されているか確認
SELECT phase, pickup_date, is_active 
FROM pickup_dates 
ORDER BY phase, pickup_date;

-- 6-3. 購入時間帯が設定されているか確認
SELECT phase, time_slot, is_active 
FROM pickup_time_slots 
WHERE phase = 1
ORDER BY time_slot;

-- ----------------------------------------
-- 期待される結果
-- ----------------------------------------
-- ステップ5-1: 
--   remaining_reservations = 0
--   remaining_email_logs = 0
--
-- ステップ5-2:
--   current_phase = '1'
--   lottery_executed = 'false'
--   winners_count = '0'
--   reservation_enabled = 'true'
--   max_total_books = '1490'
--
-- ステップ6-1:
--   Phase 1: 一畳屋ショールーム（熊本県熊本市中央区坪井5丁目2-27）
--   Phase 2: little vintage（熊本県熊本市中央区坪井5丁目1-49）
--
-- ステップ6-2 & 6-3:
--   購入日と時間帯が適切に設定されていることを確認
-- ========================================
-- 本番運用開始チェックリスト
-- ========================================
-- ✅ テストデータが完全に削除されている
-- ✅ システム設定がフェーズ1、抽選未実行になっている
-- ✅ 応募受付が有効になっている
-- ✅ 店舗情報が正しく設定されている
-- ✅ 購入日時が正しく設定されている
-- ✅ ADMIN_PASSWORD が強力なパスワードに変更されている
-- ✅ 本番URLでアクセステストが完了している
--
-- 完了後、https://tsuboi-premium.pages.dev/ にアクセスして
-- フロントエンドの表示が正しいことを確認してください。
-- ========================================

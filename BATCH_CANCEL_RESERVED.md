# 購入期限切れ応募の一括キャンセル処理

## 概要
購入期限（〆切）が過ぎたため、現時点で購入完了になっていない応募（`status = 'reserved'`）を一括でキャンセル処理します。

**重要**: データは削除せず、ステータスのみを `'canceled'` に変更します。

## 実行手順

### Step 1 - 対象レコードの確認

キャンセル対象の応募を確認します：

```sql
-- 現在 reserved 状態の応募を確認
SELECT 
  COUNT(*) as reserved_count,
  SUM(quantity) as reserved_books
FROM reservations
WHERE status = 'reserved';

-- 詳細確認（最初の10件）
SELECT 
  reservation_id,
  full_name,
  phone_number,
  quantity,
  pickup_date,
  status,
  created_at
FROM reservations
WHERE status = 'reserved'
ORDER BY created_at DESC
LIMIT 10;
```

**期待結果**: 
- `reserved_count`: キャンセル対象の応募件数
- `reserved_books`: キャンセル対象の総冊数

### Step 2 - 一括キャンセル処理

以下のSQLを実行して、reserved 状態の応募を canceled に変更します：

```sql
-- 購入期限切れのため reserved を canceled に一括変更
UPDATE reservations
SET 
  status = 'canceled',
  updated_at = CURRENT_TIMESTAMP
WHERE status = 'reserved';
```

### Step 3 - 処理結果の確認

キャンセル処理が正しく実行されたか確認します：

```sql
-- 全体のステータス別集計
SELECT 
  status,
  COUNT(*) as count,
  SUM(quantity) as total_books
FROM reservations
GROUP BY status
ORDER BY status;

-- reserved 状態が残っていないか確認（0件であるべき）
SELECT COUNT(*) as remaining_reserved
FROM reservations
WHERE status = 'reserved';

-- picked_up（購入完了）の件数・冊数確認
SELECT 
  COUNT(*) as picked_up_count,
  SUM(quantity) as picked_up_books
FROM reservations
WHERE status = 'picked_up';
```

**期待結果**:
- `remaining_reserved`: 0件（reserved が残っていない）
- `picked_up_books`: 277冊（購入完了冊数は変わらない）
- `canceled` の件数・冊数が増加

### Step 4 - 管理画面で確認

1. Cloudflare D1 Console で上記SQLを実行
2. 管理画面を開く: https://tsuboi-premium.pages.dev/admin
3. キャッシュをクリア: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
4. ダッシュボードで以下を確認：
   - **応募済み冊数**: 0冊になる
   - **購入完了冊数**: 277冊（変わらない）
   - **キャンセル冊数**: 大幅に増加
   - **残り冊数**: 1490 - 0 = 1490冊に戻る

5. 「応募一覧」タブで確認：
   - ステータスフィルタで「キャンセル済み」を選択
   - 元々 reserved だった応募が canceled になっていることを確認
   - 応募データ自体は削除されず、すべて保持されている

## 注意事項

### ✅ 実行内容
- `status = 'reserved'` → `status = 'canceled'` に変更
- `updated_at` を現在時刻に更新
- **データは削除しない**（全レコード保持）

### ⚠️ 影響範囲
- 応募一覧: キャンセル済みとして表示される
- 統計データ: 応募済み冊数が0になり、キャンセル冊数が増加
- 購入完了データ: **影響なし**（277冊のまま）
- ヒートマップ: キャンセル分は表示されなくなる

### 🔄 ロールバック（元に戻す場合）

もし誤ってキャンセルした場合、以下のSQLで元に戻せます：

```sql
-- 特定の予約IDを reserved に戻す
UPDATE reservations
SET 
  status = 'reserved',
  updated_at = CURRENT_TIMESTAMP
WHERE reservation_id = 'RES-XXXXXX';

-- 全キャンセルを一括で reserved に戻す（注意！）
-- UPDATE reservations
-- SET status = 'reserved', updated_at = CURRENT_TIMESTAMP
-- WHERE status = 'canceled' AND picked_up_at IS NULL;
```

## 実行ログ

### 実行日時
2026-03-15

### 実行前の状態
- 応募済み (reserved): ?件 / ?冊
- 購入完了 (picked_up): 121件 / 277冊

### 実行後の状態
- 応募済み (reserved): 0件 / 0冊
- 購入完了 (picked_up): 121件 / 277冊（変更なし）
- キャンセル (canceled): ?件 / ?冊（増加）

### 関連リンク
- Cloudflare D1 Console: https://dash.cloudflare.com
- 管理画面: https://tsuboi-premium.pages.dev/admin
- GitHub リポジトリ: https://github.com/infourbandirection-spec/tsuboi-premium

## まとめ

購入期限切れのため、`reserved` 状態の応募を一括で `canceled` に変更しました。
- ✅ 応募データは削除せず、すべて保持
- ✅ ステータスのみ変更
- ✅ 購入完了（277冊）は影響なし
- ✅ 管理画面で履歴確認可能

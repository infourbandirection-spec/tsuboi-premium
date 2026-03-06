# 管理者画面 統計・集計からの除外対応

## 実装日時
2026-03-06

## 変更内容
管理者画面のダッシュボード統計、応募一覧、混雑状況ヒートマップから**除外した応募**と**キャンセルした応募**を集計対象外にする対応を実施。

## 影響を受ける箇所

### 1. 統計API (`/api/admin/statistics`)
以下の集計クエリに除外条件を追加：

#### ① 総応募数・総冊数
```sql
-- 修正前
SELECT 
  COUNT(*) as total_reservations,
  SUM(quantity) as total_books,
  ...
FROM reservations

-- 修正後
SELECT 
  COUNT(*) as total_reservations,
  SUM(quantity) as total_books,
  ...
FROM reservations
WHERE (excluded_from_lottery = 0 OR excluded_from_lottery IS NULL)
  AND status != 'canceled'
```

#### ② 店舗別集計
```sql
-- 修正前
SELECT store_location, COUNT(*), SUM(quantity)
FROM reservations
WHERE status = 'reserved'
GROUP BY store_location

-- 修正後
SELECT store_location, COUNT(*), SUM(quantity)
FROM reservations
WHERE status = 'reserved'
  AND (excluded_from_lottery = 0 OR excluded_from_lottery IS NULL)
GROUP BY store_location
```

#### ③ 日付別集計
```sql
-- 修正前
SELECT pickup_date, COUNT(*), SUM(quantity)
FROM reservations
WHERE status = 'reserved'
GROUP BY pickup_date

-- 修正後
SELECT pickup_date, COUNT(*), SUM(quantity)
FROM reservations
WHERE status = 'reserved'
  AND (excluded_from_lottery = 0 OR excluded_from_lottery IS NULL)
GROUP BY pickup_date
```

#### ④ 時間帯別集計
```sql
-- 修正前
SELECT pickup_time_slot, COUNT(*), SUM(quantity)
FROM reservations
WHERE status = 'reserved'
GROUP BY pickup_time_slot

-- 修正後
SELECT pickup_time_slot, COUNT(*), SUM(quantity)
FROM reservations
WHERE status = 'reserved'
  AND (excluded_from_lottery = 0 OR excluded_from_lottery IS NULL)
GROUP BY pickup_time_slot
```

### 2. 予約一覧API (`/api/admin/reservations`)
混雑状況ヒートマップや管理画面一覧で使用されるAPIに除外条件を追加：

```sql
-- 修正前
SELECT * FROM reservations WHERE 1=1
  AND (lottery_status IS NULL OR lottery_status != 'lost')

-- 修正後
SELECT * FROM reservations WHERE 1=1
  AND (excluded_from_lottery = 0 OR excluded_from_lottery IS NULL)
  AND status != 'canceled'
  AND (lottery_status IS NULL OR lottery_status != 'lost')
```

総件数カウントも同様に修正。

## 除外される応募の条件
以下の条件に該当する応募は集計から除外されます：

1. **抽選から除外** (`excluded_from_lottery = 1`)
   - 管理画面で「抽選から除外」ボタンで除外した応募
   - 重複応募、不正応募などの理由で除外

2. **キャンセル** (`status = 'canceled'`)
   - ユーザーが電話でキャンセルした応募
   - 管理者が手動でキャンセルした応募

## 影響を受ける管理画面の表示

### ダッシュボード（統計タブ）
- 総応募者数
- 応募済み冊数
- 購入完了冊数
- 残り冊数
- 店舗別応募状況グラフ
- 日付別応募推移グラフ
- 時間帯別応募状況グラフ

### 混雑状況タブ
- ヒートマップ（日付×時間帯の集計）
- 混雑度の色分け表示

### 応募一覧タブ
- 一覧表示件数
- フィルタ後の総件数

## 確認手順

1. **除外応募の作成**
   - 管理画面 → 応募一覧 → 対象の応募を選択
   - 「抽選から除外」ボタンをクリック
   - 理由を入力（例：「テストデータ」）

2. **統計タブで確認**
   - ダッシュボード → 統計タブ
   - 除外した応募が「総応募者数」「応募済み冊数」から除外されていることを確認
   - 各グラフでも除外されていることを確認

3. **混雑状況タブで確認**
   - 混雑状況タブを開く
   - 除外した応募の日付・時間帯の件数が減っていることを確認
   - ヒートマップの色が変化していることを確認（混雑度が下がる）

4. **応募一覧タブで確認**
   - 応募一覧タブで総件数が減っていることを確認
   - 除外した応募は一覧に表示されない（デフォルト）

## デプロイ情報
- **コミット**: `a296191`
- **メッセージ**: "Exclude lottery-excluded and canceled reservations from admin statistics and counts"
- **ファイル変更**: `src/index.tsx` (19 insertions, 4 deletions)
- **ビルドサイズ**: `dist/_worker.js` (114.51 kB)
- **デプロイ先**: https://tsuboi-premium.pages.dev/admin

## 注意事項
- キャッシュクリアが必要な場合があります（管理画面でCtrl+Shift+R / Cmd+Shift+R）
- 既存のデータベースに除外応募が多数ある場合、統計数値が大きく変化する可能性があります
- 除外理由は `exclusion_reason` カラムに保存されており、後から確認可能です

## 関連ドキュメント
- [TEST_DUPLICATE_EXCLUSION.md](./TEST_DUPLICATE_EXCLUSION.md) - 重複チェックからの除外
- [PRODUCTION_RESET.sql](./PRODUCTION_RESET.sql) - 本番環境リセット手順

# 管理者画面・ユーザー向け照会 統計・集計からの除外対応

## 実装日時
2026-03-06

## 変更内容
管理者画面のダッシュボード統計、グラフ表示、**およびユーザー向け応募照会**から**除外した応募**と**キャンセルした応募**を除外する対応を実施。

**重要**: 
- **管理者画面の応募一覧**には除外・キャンセルした応募も**引き続き表示**されます（履歴確認のため）
- **ユーザー向け応募照会**では除外・キャンセルした応募は**表示されません**（ユーザーには非表示）

## 影響を受ける箇所

### 1. 統計API (`/api/admin/statistics`) - **除外対象**
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

### 2. 予約一覧API (`/api/admin/reservations`) - **除外しない（管理者のみ）**
応募一覧、混雑状況ヒートマップで使用されるAPIでは、除外・キャンセルした応募も**引き続き表示**されます。

```sql
-- リスト表示では除外しない（すべて表示）
SELECT * FROM reservations WHERE 1=1
  -- excluded_from_lottery や status='canceled' のフィルタは適用しない
  AND (lottery_status IS NULL OR lottery_status != 'lost')
```

**理由**: 
- 管理者が過去の応募履歴を確認できるようにするため
- 除外・キャンセルの理由や内容を後から確認できるようにするため
- 応募一覧での検索・フィルタ機能を維持するため

### 3. ユーザー向け応募照会API - **除外する（ユーザーには非表示）**
ユーザー向けの応募照会では、除外・キャンセルした応募は**表示されません**。

#### `/api/search` - 管理者検索（電話番号・ID）
```sql
-- 除外・キャンセルを除外
SELECT * FROM reservations 
WHERE phone_number = ? 
AND (excluded_from_lottery = 0 OR excluded_from_lottery IS NULL) 
AND status != 'canceled'
```

#### `/api/reservation/lookup/id` - 応募ID照会
```sql
-- 除外・キャンセルを除外
SELECT * FROM reservations 
WHERE reservation_id = ? 
AND (excluded_from_lottery = 0 OR excluded_from_lottery IS NULL) 
AND status != 'canceled'
```

#### `/api/reservation/lookup/birthdate` - 生年月日・電話番号照会
```sql
-- 除外・キャンセルを除外
SELECT * FROM reservations 
WHERE birth_date = ? 
AND (phone_number = ? OR REPLACE(phone_number, '-', '') = ?)
AND (excluded_from_lottery = 0 OR excluded_from_lottery IS NULL)
AND status != 'canceled'
```

**理由**:
- 除外・キャンセルした応募はユーザーに見せる必要がないため
- ユーザーが混乱しないようにするため
- 不正応募や重複応募を非表示にするため

## 除外される応募の条件
以下の条件に該当する応募は集計から除外されます：

1. **抽選から除外** (`excluded_from_lottery = 1`)
   - 管理画面で「抽選から除外」ボタンで除外した応募
   - 重複応募、不正応募などの理由で除外

2. **キャンセル** (`status = 'canceled'`)
   - ユーザーが電話でキャンセルした応募
   - 管理者が手動でキャンセルした応募

## 影響を受ける画面の表示

### 管理者画面 - 除外される箇所

#### ダッシュボード（統計タブ）- **除外される**
- 総応募者数
- 応募済み冊数
- 購入完了冊数
- 残り冊数
- 店舗別応募状況グラフ
- 日付別応募推移グラフ
- 時間帯別応募状況グラフ

#### 抽選管理タブ - **除外される**
- Phase 1 応募状況の「応募者数」
- Phase 1 応募状況の「応募総冊数」
- 抽選判定（全員当選 / 抽選必要）
- 抽選実行ボタンのカウント表示

### 管理者画面 - 表示される箇所

#### 混雑状況タブ - **表示される**
- ヒートマップ（日付×時間帯の集計）
- 除外・キャンセルした応募も**表示される**（フロントエンドでフィルタ可能）

#### 応募一覧タブ - **表示される**
- 一覧表示
- 除外・キャンセルした応募も**引き続き表示される**
- 検索・フィルタ機能で絞り込み可能
- 応募IDをクリックして詳細確認・編集が可能

### ユーザー向け画面 - 除外される（非表示）

#### 応募照会ページ (`/search`) - **表示されない**
- 電話番号・生年月日での検索結果に**含まれない**
- 応募IDでの直接照会でも**見つからない**
- 除外・キャンセルした応募は「応募が見つかりませんでした」と表示

#### 当選者照会ページ (`/lottery-results`) - **表示されない**
- 抽選結果の照会でも**含まれない**（除外は抽選対象外のため）

## 確認手順

### 管理者画面での確認

1. **除外応募の作成**
   - 管理画面 → 応募一覧 → 対象の応募を選択
   - 「抽選から除外」ボタンをクリック
   - 理由を入力（例：「テストデータ」）

2. **統計タブで確認**（除外される）
   - ダッシュボード → 統計タブ
   - 除外した応募が「総応募者数」「応募済み冊数」から**除外されている**ことを確認
   - 各グラフでも除外されていることを確認

3. **応募一覧タブで確認**（表示される）
   - 応募一覧タブを開く
   - 除外した応募が**引き続き一覧に表示される**ことを確認
   - 応募IDをクリックして詳細を確認できることを確認
   - 除外理由が表示されることを確認

4. **混雑状況タブで確認**（表示される）
   - 混雑状況タブを開く
   - 除外した応募の日付・時間帯の**データは表示される**
   - ヒートマップに含まれている（フロントエンドでフィルタ可能）

### ユーザー向け画面での確認

5. **応募照会ページで確認**（表示されない）
   - 応募照会ページ https://tsuboi-premium.pages.dev/search にアクセス
   - 除外した応募の電話番号・生年月日で検索
   - 「応募が見つかりませんでした」と表示されることを確認
   - 除外した応募の応募IDで直接検索
   - 同様に「応募が見つかりませんでした」と表示されることを確認

6. **当選者照会ページで確認**（表示されない）
   - 当選者照会ページ https://tsuboi-premium.pages.dev/lottery-results にアクセス
   - 除外した応募は当選者リストに**含まれない**ことを確認

## デプロイ情報
- **初回コミット**: `a296191` - 統計から除外
- **修正コミット**: `15244ce` - リストには表示、統計のみ除外
- **抽選管理**: `b83c3c9` - 抽選管理画面の応募者数・応募総冊数も除外
- **最新コミット**: `107ee07` - ユーザー向け応募照会からも除外
- **メッセージ**: "Hide excluded/canceled reservations from user-facing lookup APIs"
- **ファイル変更**: `src/index.tsx` (10 insertions, 5 deletions)
- **ビルドサイズ**: `dist/_worker.js` (114.69 kB)
- **デプロイ先**: 
  - 管理画面: https://tsuboi-premium.pages.dev/admin
  - 応募照会: https://tsuboi-premium.pages.dev/search

## 注意事項
- キャッシュクリアが必要な場合があります（Ctrl+Shift+R / Cmd+Shift+R）
- **管理者画面の応募一覧**には除外・キャンセルした応募も表示されます（過去の履歴確認のため）
- **ユーザー向け応募照会**では除外・キャンセルした応募は表示されません（ユーザーには非表示）
- **統計計算**では除外・キャンセルした応募は除外されます（残り冊数、グラフなど）
- 除外理由は `exclusion_reason` カラムに保存されており、管理画面の応募詳細から確認可能です
- 抽選実行時には除外した応募は自動的にスキップされます
- キャンセルした応募も同様に非表示になります

## 関連ドキュメント
- [TEST_DUPLICATE_EXCLUSION.md](./TEST_DUPLICATE_EXCLUSION.md) - 重複チェックからの除外
- [PRODUCTION_RESET.sql](./PRODUCTION_RESET.sql) - 本番環境リセット手順

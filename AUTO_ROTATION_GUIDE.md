# Phase 2 購入日の自動ローテーション機能

## 概要

Phase 2の購入日を**毎日自動的にローテーション**し、常に「当日から1週間後まで」の購入日を提供します。

## 仕組み

### 自動ローテーション処理

**実行タイミング**: 毎日午前0時（JST）  
**Cron式**: `0 15 * * *`（UTC 15:00 = JST 翌日0:00）

**処理内容**:
1. **前日の日付を無効化**: `is_active = 0` に更新
2. **1週間後の日付を追加/有効化**: 
   - 既に存在する場合: `is_active = 1` に更新
   - 存在しない場合: 新規レコードを追加

### 例: 3月16日の処理

- **無効化**: 3月15日（前日）の購入日を `is_active = 0` に設定
- **追加**: 3月23日（7日後）の購入日を追加または有効化

これにより、ユーザーは常に「今日～7日後」の範囲で購入日を選択できます。

---

## 初期セットアップ

### Step 1: 初期データの投入

Cloudflare D1 Console で以下のSQLを実行：

```sql
-- 3月16日～3月22日の7日間を初期データとして登録
INSERT INTO pickup_dates (pickup_date, display_label, phase, is_active, display_order, created_at, updated_at) VALUES 
('2026-03-16', '3月16日（月）', 2, 1, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-17', '3月17日（火）', 2, 1, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-18', '3月18日（水）', 2, 1, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-19', '3月19日（木）', 2, 1, 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-20', '3月20日（金）', 2, 1, 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-21', '3月21日（土）', 2, 1, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-22', '3月22日（日）', 2, 1, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

### Step 2: コードのデプロイ

```bash
cd /home/user/webapp
npm run build
git add -A
git commit -m "Add automatic pickup date rotation for Phase 2"
git push origin main
```

Cloudflare Pagesが自動デプロイします（2-5分）。

---

## 自動ローテーションの動作確認

### ローテーションのタイムライン

| 日付 | 3/16（月） | 3/17（火） | 3/18（水） | 3/19（木） | 3/20（金） | 3/21（土） | 3/22（日） | 3/23（月） | 3/24（火） |
|------|------------|------------|------------|------------|------------|------------|------------|------------|------------|
| **初期状態（3/15）** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **3/16 午前0時** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **✅** | ❌ |
| **3/17 午前0時** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **✅** |
| **3/18 午前0時** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

✅ = 有効（選択可能）  
❌ = 無効（選択不可）

---

## 確認方法

### 1. データベースで確認

Cloudflare D1 Console で実行：

```sql
-- Phase 2の有効な購入日を確認
SELECT pickup_date, display_label, is_active, display_order
FROM pickup_dates
WHERE phase = 2
ORDER BY display_order, pickup_date;
```

**期待結果**: 常に7日分の有効な購入日（`is_active = 1`）が存在

---

### 2. 管理画面で確認

1. https://tsuboi-premium.pages.dev/admin にアクセス
2. 「購入日管理」タブを開く
3. **Phase 2** を選択
4. 有効な購入日が7件表示されることを確認

---

### 3. Cron実行ログの確認

Cloudflare Dashboardでログを確認：

1. https://dash.cloudflare.com にアクセス
2. **Workers & Pages** → **tsuboi-premium** を開く
3. **Logs** タブで Cron実行ログを確認

**ログ例**:
```
[Cron] Rotating pickup dates at 2026-03-16T15:00:00.000Z
[Cron] Deactivating: 2026-03-15
[Cron] Adding: 2026-03-23 (3月23日（月）)
[Cron] Deactivated 1 rows for 2026-03-15
[Cron] Added new date: 2026-03-23 (3月23日（月）) with order 17
[Cron] Rotation completed successfully
```

---

## 手動でローテーションを停止する方法

### 方法1: Cron Triggerを無効化

wrangler.jsonc を編集：

```jsonc
{
  // ...
  // "triggers": {
  //   "crons": ["0 15 * * *"]
  // }
  // ↑ コメントアウトして無効化
}
```

再デプロイすると、自動ローテーションが停止します。

---

### 方法2: 特定の日付を永続的に有効化

Cloudflare D1 Consoleで実行：

```sql
-- 特定の日付を常に有効にする（例: 3月20日）
UPDATE pickup_dates
SET is_active = 1
WHERE pickup_date = '2026-03-20' AND phase = 2;
```

ただし、翌日のCron実行で再び無効化される可能性があります。

---

### 方法3: コードを修正して無効化

`src/index.tsx` の `scheduled` 関数をコメントアウト：

```typescript
export default {
  fetch: app.fetch,
  
  // 自動ローテーションを停止
  // async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext): Promise<void> {
  //   console.log('[Cron] Scheduled event triggered:', event.cron)
  //   await rotatePickupDates(env)
  // }
}
```

再デプロイすると、Cron Triggerが実行されても何も処理されません。

---

## トラブルシューティング

### 問題1: ローテーションが実行されない

**原因**: Cron Triggerが設定されていない  
**解決策**: wrangler.jsonc に `triggers.crons` が記述されているか確認

---

### 問題2: 購入日が重複して追加される

**原因**: `pickup_date` のUNIQUE制約が機能していない  
**解決策**: マイグレーションで UNIQUE制約を追加

```sql
-- pickup_dates テーブルに UNIQUE制約を追加
CREATE UNIQUE INDEX IF NOT EXISTS idx_pickup_dates_unique 
ON pickup_dates(pickup_date, phase);
```

---

### 問題3: 日付がJSTではなくUTCで計算される

**原因**: コード内で UTC+9 のオフセット計算が正しく動作していない  
**解決策**: `rotatePickupDates` 関数のタイムゾーン処理を確認

---

## 技術仕様

### Cron Trigger設定

- **Cron式**: `0 15 * * *`
- **実行時刻**: 毎日 UTC 15:00（JST 0:00）
- **実行環境**: Cloudflare Workers
- **タイムアウト**: 30秒（デフォルト）

### データベーススキーマ

```sql
CREATE TABLE pickup_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pickup_date TEXT NOT NULL,
  display_label TEXT NOT NULL,
  phase INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pickup_date, phase)
);
```

---

## 関連リンク

- **初期データSQL**: `/home/user/webapp/INIT_PHASE2_DATES.sql`
- **GitHub**: https://github.com/infourbandirection-spec/tsuboi-premium
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **管理画面**: https://tsuboi-premium.pages.dev/admin

---

## まとめ

✅ **自動ローテーション機能の実装完了**
- 毎日午前0時（JST）に自動実行
- 前日の購入日を無効化
- 1週間後の購入日を追加/有効化
- 常に7日分の購入日が選択可能

✅ **停止方法**
- wrangler.jsonc で Cron Trigger をコメントアウト
- または、`scheduled` 関数をコメントアウト

✅ **初期セットアップ**
1. `INIT_PHASE2_DATES.sql` を実行（3/16～3/22を登録）
2. コードをデプロイ
3. 翌日から自動ローテーション開始

何か問題があれば教えてください！

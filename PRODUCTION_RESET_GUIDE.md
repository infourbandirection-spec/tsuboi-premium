# 本番環境リセット手順書

## 📋 概要
テストデータを削除し、本番運用開始の初期状態にリセットします。

---

## ⚠️ 重要事項
- **実行前に必ずバックアップを確認してください**
- **本番DBのデータは完全に削除されます（復元不可）**
- **SQLは1つずつ順番に実行してください**
- **各ステップで結果を確認してから次に進んでください**

---

## 🔧 実行手順

### ステップ1: Cloudflare D1 Console にアクセス

1. Cloudflare Dashboard にログイン
2. URL: https://dash.cloudflare.com/e74e780cd3e5705ede60a66c07a3d2bb/workers-and-pages
3. **Workers & Pages** → **D1** → **tsuboi-premium-production** → **Console** タブをクリック

---

### ステップ2: 実行前の状態確認

以下のSQLを実行して、現在の状態を確認します：

```sql
SELECT 
  (SELECT COUNT(*) FROM reservations) as total_reservations,
  (SELECT COUNT(*) FROM reservations WHERE lottery_status = 'won') as total_winners,
  (SELECT COUNT(*) FROM email_logs) as total_email_logs,
  (SELECT setting_value FROM system_settings WHERE setting_key = 'current_phase') as current_phase,
  (SELECT setting_value FROM system_settings WHERE setting_key = 'lottery_executed') as lottery_executed;
```

**期待される結果例:**
```
total_reservations: 16
total_winners: 10
total_email_logs: 10
current_phase: "2"
lottery_executed: "true"
```

📸 **この結果のスクリーンショットを保存してください（後で確認用）**

---

### ステップ3: テストデータ削除

#### 3-1. 応募データをすべて削除

```sql
DELETE FROM reservations;
```

✅ **確認**: `"success": true` と表示されることを確認

#### 3-2. 削除確認

```sql
SELECT COUNT(*) as remaining FROM reservations;
```

✅ **期待結果**: `remaining: 0`

#### 3-3. メール送信ログを削除

```sql
DELETE FROM email_logs;
```

✅ **確認**: `"success": true` と表示されることを確認

#### 3-4. ログ削除確認

```sql
SELECT COUNT(*) as remaining FROM email_logs;
```

✅ **期待結果**: `remaining: 0`

---

### ステップ4: システム設定を初期状態にリセット

#### 4-1. フェーズを1に戻す

```sql
UPDATE system_settings 
SET setting_value = '1', updated_at = datetime('now', 'localtime')
WHERE setting_key = 'current_phase';
```

#### 4-2. 抽選未実行状態にする

```sql
UPDATE system_settings 
SET setting_value = 'false', updated_at = datetime('now', 'localtime')
WHERE setting_key = 'lottery_executed';
```

#### 4-3. 当選者数をリセット

```sql
UPDATE system_settings 
SET setting_value = '0', updated_at = datetime('now', 'localtime')
WHERE setting_key = 'winners_count';
```

#### 4-4. 応募受付を有効にする

```sql
UPDATE system_settings 
SET setting_value = 'true', updated_at = datetime('now', 'localtime')
WHERE setting_key = 'reservation_enabled';
```

---

### ステップ5: リセット後の状態確認

#### 5-1. データ削除確認

```sql
SELECT 
  (SELECT COUNT(*) FROM reservations) as remaining_reservations,
  (SELECT COUNT(*) FROM email_logs) as remaining_email_logs;
```

✅ **期待結果**: 
```
remaining_reservations: 0
remaining_email_logs: 0
```

#### 5-2. システム設定確認

```sql
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
```

✅ **期待結果**:
```
current_phase: "1"
lottery_executed: "false"  
winners_count: "0"
reservation_enabled: "true"
max_total_books: "1490"
```

---

### ステップ6: 店舗・購入日時設定の確認

#### 6-1. フェーズ別店舗確認

```sql
SELECT id, store_name, address, phase, is_active 
FROM stores 
ORDER BY phase, id;
```

✅ **期待結果**:
```
Phase 1: 一畳屋ショールーム（熊本県熊本市中央区坪井5丁目2-27）
Phase 2: little vintage（熊本県熊本市中央区坪井5丁目1-49）
```

#### 6-2. 購入日設定確認

```sql
SELECT phase, pickup_date, is_active 
FROM pickup_dates 
WHERE is_active = 1
ORDER BY phase, pickup_date;
```

#### 6-3. 購入時間帯設定確認（フェーズ1）

```sql
SELECT phase, time_slot, is_active 
FROM pickup_time_slots 
WHERE phase = 1 AND is_active = 1
ORDER BY time_slot;
```

⚠️ **注意**: フェーズ2の購入時間帯の `is_active` が null の場合は、以下のSQLで修正してください：

```sql
UPDATE pickup_time_slots 
SET is_active = 1
WHERE phase = 2 AND time_slot IN (
  '12:00～13:00','13:00～14:00','15:00～16:00',
  '16:00～17:00','18:00～19:00','19:00～20:00'
);
```

---

## ✅ 本番運用開始前チェックリスト

実行完了後、以下をすべて確認してください：

- [ ] **データ削除完了**
  - [ ] `reservations` テーブルが空（0件）
  - [ ] `email_logs` テーブルが空（0件）

- [ ] **システム設定が初期状態**
  - [ ] `current_phase = '1'`
  - [ ] `lottery_executed = 'false'`
  - [ ] `winners_count = '0'`
  - [ ] `reservation_enabled = 'true'`
  - [ ] `max_total_books = '1490'`

- [ ] **店舗設定が正しい**
  - [ ] Phase 1: 一畳屋ショールーム
  - [ ] Phase 2: little vintage

- [ ] **購入日時が設定されている**
  - [ ] Phase 1 の購入日が設定されている
  - [ ] Phase 1 の購入時間帯が設定されている（10件程度）
  - [ ] Phase 2 の購入時間帯の `is_active` が 1 になっている

- [ ] **セキュリティ設定**
  - [ ] ADMIN_PASSWORD が強力なパスワードに変更されている
    ```bash
    npx wrangler pages secret put ADMIN_PASSWORD --project-name tsuboi-premium
    ```
  - [ ] デバッグエンドポイントが削除されている（404を返す）

- [ ] **フロントエンド動作確認**
  - [ ] https://tsuboi-premium.pages.dev/ でトップページが表示される
  - [ ] 応募フォームが表示され、店舗が「一畳屋ショールーム」になっている
  - [ ] 購入日・購入時間が選択できる
  - [ ] 応募照会ページ（/search）が動作する
  - [ ] 当選者照会ページ（/lottery-results）で「抽選未実行」と表示される

---

## 🚀 本番運用開始後の流れ

### フェーズ1（一畳屋ショールーム）
1. 応募受付開始
2. 応募受付終了
3. 管理画面で抽選実行（/admin）
4. 当選者に自動メール送信
5. 当選者が店舗で購入

### フェーズ2への切り替え
```sql
UPDATE system_settings 
SET setting_value = '2', updated_at = datetime('now', 'localtime')
WHERE setting_key = 'current_phase';
```

---

## 🆘 トラブルシューティング

### 問題: SQLが実行できない
- **原因**: 権限不足
- **解決**: Cloudflare アカウントに D1 データベースの編集権限があるか確認

### 問題: データが削除されない
- **原因**: 外部キー制約
- **解決**: テーブルを順番に削除（email_logs → reservations）

### 問題: フロントエンドに古いデータが表示される
- **原因**: ブラウザキャッシュ
- **解決**: ハードリフレッシュ（Ctrl+Shift+R / Cmd+Shift+R）

---

## 📞 サポート

問題が発生した場合は、以下の情報を共有してください：
1. 実行したSQL文
2. エラーメッセージのスクリーンショット
3. 確認クエリの結果

---

**作成日**: 2026-03-05  
**対象DB**: tsuboi-premium-production  
**プロジェクト**: tsuboi-premium  
**URL**: https://tsuboi-premium.pages.dev/

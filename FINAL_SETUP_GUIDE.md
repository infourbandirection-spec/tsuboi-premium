# Phase 2 購入日の自動ローテーション - 最終セットアップガイド

## 📋 実行が必要なSQLクエリ

以下のSQLを**Cloudflare D1 Console**で**1つずつ**実行してください。

https://dash.cloudflare.com → Workers & Pages → D1 → `tsuboi-premium-production` → Console

---

### **Step 1: 3月6日のPhase 2購入日を削除**

```sql
DELETE FROM pickup_dates WHERE pickup_date = '2026-03-06' AND phase = 2;
```

---

### **Step 2: 自動ローテーション制御設定を追加**

```sql
INSERT INTO system_settings (setting_key, setting_value, description, updated_at)
VALUES ('auto_rotation_enabled', '1', 'Phase 2購入日の自動ローテーション有効/無効', CURRENT_TIMESTAMP)
ON CONFLICT(setting_key) DO UPDATE SET 
  setting_value = '1',
  updated_at = CURRENT_TIMESTAMP;
```

---

### **Step 3: Phase 2購入日の初期データを投入（3月16日～3月22日）**

```sql
INSERT INTO pickup_dates (pickup_date, display_label, phase, is_active, display_order, created_at, updated_at) VALUES 
('2026-03-16', '3月16日（月）', 2, 1, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-17', '3月17日（火）', 2, 1, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-18', '3月18日（水）', 2, 1, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-19', '3月19日（木）', 2, 1, 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-20', '3月20日（金）', 2, 1, 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-21', '3月21日（土）', 2, 1, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('2026-03-22', '3月22日（日）', 2, 1, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

---

### **Step 4: データの確認**

```sql
-- Phase 2の購入日を確認（7件であるべき）
SELECT * FROM pickup_dates WHERE phase = 2 ORDER BY display_order, pickup_date;

-- 自動ローテーション設定を確認（値が '1' であるべき）
SELECT * FROM system_settings WHERE setting_key = 'auto_rotation_enabled';
```

**期待結果**:
- Phase 2の購入日: 7件（3月16日～3月22日）
- `auto_rotation_enabled`: `'1'`（有効）

---

## ✅ 完了後の確認

### **1. 管理画面で確認**

1. https://tsuboi-premium.pages.dev/admin にアクセス
2. 「購入日管理」タブを開く
3. **Phase 2** を選択
4. 以下を確認：
   - 7件の購入日が表示される（3月16日～3月22日）
   - 右上に「自動ローテーション: 稼働中」と表示
   - 「停止」ボタンが表示される

---

### **2. 自動ローテーションの動作**

**実行タイミング**: 毎日午前0時（JST）

**処理内容**:
- 前日の日付を無効化（`is_active = 0`）
- 1週間後の日付を追加/有効化（`is_active = 1`）

**例**: 3月16日 午前0時の処理
- **無効化**: 3月15日（存在しないのでスキップ）
- **追加**: 3月23日（月）を新規追加

---

## 🛑 自動ローテーションの停止方法

### **管理画面から停止（推奨）**

1. https://tsuboi-premium.pages.dev/admin にアクセス
2. 「購入日管理」タブを開く
3. **Phase 2** を選択
4. 右上の **「停止」ボタン** をクリック
5. 確認ダイアログで「OK」をクリック

**結果**:
- 「自動ローテーション: 停止中」と表示
- 「開始」ボタンが表示される
- 翌日以降、購入日が自動更新されなくなる

---

### **再開する場合**

1. 「購入日管理」タブの **「開始」ボタン** をクリック
2. 確認ダイアログで「OK」をクリック

**結果**:
- 「自動ローテーション: 稼働中」と表示
- 翌日午前0時から自動ローテーション再開

---

## 📊 ローテーションのタイムライン

| 日付 | 3/16 | 3/17 | 3/18 | 3/19 | 3/20 | 3/21 | 3/22 | 3/23 | 3/24 | 3/25 |
|------|------|------|------|------|------|------|------|------|------|------|
| **初期（3/15）** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **3/16 0時** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **3/17 0時** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **3/18 0時** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

✅ = 有効（選択可能）  
❌ = 無効（選択不可）

---

## 🔍 トラブルシューティング

### **問題1: 停止ボタンが表示されない**

**原因**: 自動ローテーション設定が未登録  
**解決策**: Step 2のSQLを再実行

---

### **問題2: Phase 2の購入日が表示されない**

**原因**: 初期データが未投入  
**解決策**: Step 3のSQLを再実行

---

### **問題3: 翌日になっても購入日が更新されない**

**確認項目**:
1. 自動ローテーションが「稼働中」になっているか
2. Cloudflare Workers の Cron Trigger が有効か
3. Cloudflare Dashboard のログを確認

---

## 📚 関連ドキュメント

- **詳細ガイド**: `/home/user/webapp/AUTO_ROTATION_GUIDE.md`
- **GitHub**: https://github.com/infourbandirection-spec/tsuboi-premium
- **管理画面**: https://tsuboi-premium.pages.dev/admin

---

## ✅ まとめ

**実装完了**:
- ✅ 3月6日のPhase 2購入日を削除
- ✅ 自動ローテーション機能を実装
- ✅ 管理画面に停止/開始ボタンを追加
- ✅ 停止するまで無限にローテーション継続

**次のステップ**:
1. 上記4つのSQLを実行
2. Cloudflareのデプロイ完了を待つ（2-5分）
3. 管理画面で確認
4. 翌日（3/16）に動作確認

SQL実行が完了したら教えてください！

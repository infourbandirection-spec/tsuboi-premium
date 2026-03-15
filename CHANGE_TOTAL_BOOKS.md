# 販売冊数の変更手順

## 変更内容
**購入完了冊数を 1000冊 → 277冊 に変更**

## 理由
購入完了になっている人で、販売冊数を増やして購入した人がいるため、実際の在庫に合わせて残数を調整する必要があります。

---

## 変更手順

### 1. Cloudflare D1 Console にアクセス
1. https://dash.cloudflare.com にアクセス
2. Workers & Pages → D1 を選択
3. `tsuboi-premium-production` データベースを選択
4. 「Console」タブをクリック

---

### 2. 現在の設定を確認

以下の SQL を実行して、現在の設定を確認します：

```sql
-- 現在の販売冊数設定を確認
SELECT * FROM system_settings WHERE setting_key = 'max_total_books';

-- 購入完了冊数を確認
SELECT 
  COUNT(*) as picked_up_count,
  SUM(quantity) as picked_up_books
FROM reservations 
WHERE status = 'picked_up';

-- 応募済み冊数を確認
SELECT 
  COUNT(*) as reserved_count,
  SUM(quantity) as reserved_books
FROM reservations 
WHERE status = 'reserved' 
  AND (excluded_from_lottery = 0 OR excluded_from_lottery IS NULL);
```

**期待される結果**:
- `max_total_books`: 1000（現在の設定）
- `picked_up_books`: 購入完了冊数
- `reserved_books`: 応募済み冊数

---

### 3. 販売冊数を 277冊 に変更

以下の SQL を実行します：

```sql
-- 販売冊数を 277冊 に変更
UPDATE system_settings 
SET setting_value = '277',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'max_total_books';

-- 変更を確認
SELECT * FROM system_settings WHERE setting_key = 'max_total_books';
```

**実行結果**:
```
setting_key      | setting_value | updated_at
-----------------|---------------|---------------------------
max_total_books  | 277           | 2026-03-13 XX:XX:XX
```

---

### 4. 管理画面で確認

1. 管理画面を開く: https://tsuboi-premium.pages.dev/admin
2. キャッシュクリア (Ctrl+Shift+R / Cmd+Shift+R)
3. ダッシュボードタブを開く
4. 以下の数値を確認：
   - **販売冊数**: 277冊
   - **購入完了冊数**: 実際の購入完了冊数
   - **残り冊数**: 277 - 購入完了冊数

---

## 計算例

### **変更前（販売冊数 1000冊）**
- 販売冊数: 1000冊
- 購入完了: 50冊（例）
- 残り: 950冊

### **変更後（販売冊数 277冊）**
- 販売冊数: 277冊
- 購入完了: 50冊（例）
- 残り: 227冊

---

## 影響範囲

### **管理画面**
✅ ダッシュボードの「残り冊数」が更新される  
✅ 統計タブの「販売冊数」が277冊に表示される  

### **ユーザー画面**
✅ 応募フォームの「残り冊数」が更新される（次回アクセス時）  

### **抽選ロジック**
✅ 抽選実行時に277冊を基準に当選者を決定  
✅ 277冊以下の応募の場合は全員当選  
✅ 277冊超過の場合はランダム抽選  

---

## 注意事項

### **データの整合性**
- **購入完了冊数が 277冊 を超えている場合**:
  - 残り冊数がマイナスになります
  - この場合は、実際の購入完了冊数に合わせて `max_total_books` を調整してください

### **確認クエリ**
```sql
-- 購入完了冊数が 277冊 を超えているか確認
SELECT 
  SUM(quantity) as picked_up_books,
  CASE 
    WHEN SUM(quantity) > 277 THEN '⚠️ 購入完了冊数が販売冊数を超えています'
    ELSE '✅ 正常'
  END as status
FROM reservations 
WHERE status = 'picked_up';
```

---

## ロールバック手順

もし元に戻す必要がある場合：

```sql
-- 販売冊数を 1000冊 に戻す
UPDATE system_settings 
SET setting_value = '1000',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'max_total_books';
```

---

## まとめ

✅ **販売冊数を 277冊 に変更**  
✅ **管理画面で残り冊数が正しく表示される**  
✅ **抽選ロジックが 277冊 を基準に動作する**  
✅ **データの整合性を確認する**  

**Cloudflare D1 Console で SQL を実行してください！**

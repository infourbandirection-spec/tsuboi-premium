# 買い増し分30冊を追加する手順

## 目的
現在の購入完了247冊に、買い増し分30冊を追加して、合計277冊にする。

## 理由
購入完了者が当日に追加で購入（買い増し）したため、その分を記録する必要がある。

---

## 実施手順

### 1. Cloudflare D1 Console にアクセス
1. https://dash.cloudflare.com にアクセス
2. Workers & Pages → D1 を選択
3. `tsuboi-premium-production` データベースを選択
4. 「Console」タブをクリック

---

### 2. 現在の購入完了冊数を確認

```sql
-- 購入完了冊数を確認
SELECT 
  COUNT(*) as picked_up_count,
  SUM(quantity) as picked_up_books
FROM reservations
WHERE status = 'picked_up';
```

**期待される結果**:
```
picked_up_count | picked_up_books
----------------|----------------
XX人            | 247冊
```

---

### 3. 買い増し分30冊を記録するレコードを追加

以下の SQL を実行して、買い増し分を記録します：

```sql
-- 買い増し分30冊を記録するレコードを追加
INSERT INTO reservations (
  reservation_id,
  reservation_phase,
  birth_date,
  full_name,
  kana,
  phone_number,
  email,
  quantity,
  store_location,
  pickup_date,
  pickup_time_slot,
  status,
  lottery_status,
  excluded_from_lottery,
  exclusion_reason,
  created_at,
  picked_up_at,
  picked_up_by
) VALUES (
  'EXTRA-BUY-' || strftime('%Y%m%d%H%M%S', 'now'),  -- ユニークな応募ID
  1,                                                  -- Phase 1
  '1900-01-01',                                       -- ダミー生年月日
  '買い増し分（集計用）',                            -- 氏名
  'カイマシブン',                                     -- ふりがな
  '000-0000-0000',                                    -- ダミー電話番号
  'extra-buy@system.local',                           -- ダミーメール
  30,                                                 -- 買い増し冊数 ★
  '一畳屋ショールーム（熊本県熊本市中央区坪井5丁目2-27）',  -- 店舗
  date('now'),                                        -- 今日の日付
  '10:00-12:00',                                      -- ダミー時間帯
  'picked_up',                                        -- 購入完了
  'won',                                              -- 当選扱い
  0,                                                  -- 除外しない
  NULL,                                               -- 除外理由なし
  CURRENT_TIMESTAMP,                                  -- 作成日時
  CURRENT_TIMESTAMP,                                  -- 購入日時
  '管理者（買い増し記録）'                            -- 担当者名
);

-- 追加を確認
SELECT 
  reservation_id,
  full_name,
  quantity,
  status,
  picked_up_by
FROM reservations
WHERE full_name = '買い増し分（集計用）';
```

---

### 4. 合計購入完了冊数を確認

```sql
-- 購入完了冊数の合計を確認
SELECT 
  COUNT(*) as picked_up_count,
  SUM(quantity) as picked_up_books
FROM reservations
WHERE status = 'picked_up';
```

**期待される結果**:
```
picked_up_count | picked_up_books
----------------|----------------
XX人            | 277冊 ✅
```

---

### 5. 管理画面で確認

1. 管理画面を開く: https://tsuboi-premium.pages.dev/admin
2. キャッシュクリア (Ctrl+Shift+R / Cmd+Shift+R)
3. ダッシュボードタブを開く
4. 以下の数値を確認：
   - **購入完了冊数**: 277冊 ✅
   - **残り冊数**: 販売冊数 - 277冊

---

## 計算例

### **追加前**
- 購入完了者数: XX人
- 購入完了冊数: 247冊
- 買い増し分: 0冊
- **合計: 247冊**

### **追加後**
- 購入完了者数: XX+1人（買い増し記録含む）
- 購入完了冊数: 247冊
- 買い増し分: 30冊
- **合計: 277冊 ✅**

---

## 注意事項

### **買い増し記録の扱い**
- この記録は **集計専用** です
- 実際の顧客ではなく、買い増しを記録するためのダミーレコードです
- 氏名が「買い増し分（集計用）」なので、管理者が識別できます
- 応募一覧に表示されますが、除外やキャンセルはしないでください

### **応募一覧での表示**
管理画面の応募一覧で以下のように表示されます：
- **氏名**: 買い増し分（集計用）
- **冊数**: 30冊
- **ステータス**: 購入完了
- **担当者**: 管理者（買い増し記録）

### **データの整合性**
- このレコードは `excluded_from_lottery = 0` なので、統計に含まれます
- `status = 'picked_up'` なので、購入完了冊数に加算されます
- `lottery_status = 'won'` なので、当選者として扱われます

---

## 買い増し分を修正する場合

もし買い増し冊数を変更する必要がある場合：

```sql
-- 買い増し冊数を変更（例: 30冊 → 35冊）
UPDATE reservations
SET quantity = 35,
    picked_up_at = CURRENT_TIMESTAMP
WHERE full_name = '買い増し分（集計用）';

-- 変更を確認
SELECT 
  COUNT(*) as picked_up_count,
  SUM(quantity) as picked_up_books
FROM reservations
WHERE status = 'picked_up';
```

---

## 買い増し分を削除する場合

もし買い増し記録が不要になった場合：

```sql
-- 買い増し記録を削除
DELETE FROM reservations
WHERE full_name = '買い増し分（集計用）';

-- 削除を確認
SELECT 
  COUNT(*) as picked_up_count,
  SUM(quantity) as picked_up_books
FROM reservations
WHERE status = 'picked_up';
```

---

## まとめ

✅ **買い増し分30冊を記録するダミーレコードを追加**  
✅ **購入完了冊数が 247冊 → 277冊 に増加**  
✅ **管理画面で正しく集計される**  
✅ **応募一覧で「買い増し分（集計用）」として識別可能**  

**Cloudflare D1 Console にアクセスして、上記の SQL を実行してください！**

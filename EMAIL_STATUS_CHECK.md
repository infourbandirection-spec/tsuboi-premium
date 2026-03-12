# メール送信状況確認用SQL

## 現在の送信状況を確認

### 1. 最新の送信結果サマリー
```sql
-- 各応募IDの最新送信結果を集計
SELECT 
  e.status,
  COUNT(*) as count
FROM reservations r
INNER JOIN email_logs e ON r.reservation_id = e.reservation_id
WHERE r.lottery_status = 'won'
AND e.email_type = 'winner'
AND e.sent_at = (
  SELECT MAX(sent_at) 
  FROM email_logs 
  WHERE reservation_id = r.reservation_id 
  AND email_type = 'winner'
)
GROUP BY e.status;
```

**期待される結果例**:
```
status  | count
--------|------
success | 26
failed  | 90
```

### 2. 再送対象の詳細リスト
```sql
-- 現在再送が必要な応募を確認
SELECT 
  r.reservation_id,
  r.full_name,
  e.recipient_email,
  e.error_message,
  e.sent_at as last_attempt
FROM reservations r
INNER JOIN email_logs e ON r.reservation_id = e.reservation_id
WHERE r.lottery_status = 'won'
AND e.email_type = 'winner'
AND e.sent_at = (
  SELECT MAX(sent_at) 
  FROM email_logs 
  WHERE reservation_id = r.reservation_id 
  AND email_type = 'winner'
)
AND e.status = 'failed'
ORDER BY e.sent_at DESC
LIMIT 10;
```

### 3. 特定の応募IDの送信履歴
```sql
-- 特定の応募IDの全送信履歴を確認
SELECT 
  sent_at,
  status,
  error_message,
  message_id
FROM email_logs
WHERE reservation_id = 'PRE-20260306-001234'
AND email_type = 'winner'
ORDER BY sent_at DESC;
```

### 4. 重複送信が発生していないか確認
```sql
-- 同じ応募IDに複数回成功メールが送信されていないか確認
SELECT 
  reservation_id,
  recipient_email,
  COUNT(*) as success_count,
  GROUP_CONCAT(sent_at) as sent_times
FROM email_logs
WHERE email_type = 'winner'
AND status = 'success'
GROUP BY reservation_id, recipient_email
HAVING COUNT(*) > 1
ORDER BY success_count DESC;
```

**期待される結果**: 0件（重複送信がない状態）

### 5. 全体の送信統計
```sql
-- 当選メールの全体統計
SELECT 
  '総応募者（当選）' as category,
  COUNT(DISTINCT reservation_id) as count
FROM reservations
WHERE lottery_status = 'won'

UNION ALL

SELECT 
  'メール送信試行',
  COUNT(DISTINCT reservation_id)
FROM email_logs
WHERE email_type = 'winner'

UNION ALL

SELECT 
  '最新ステータス: 成功',
  COUNT(*)
FROM (
  SELECT r.reservation_id
  FROM reservations r
  INNER JOIN email_logs e ON r.reservation_id = e.reservation_id
  WHERE r.lottery_status = 'won'
  AND e.email_type = 'winner'
  AND e.sent_at = (
    SELECT MAX(sent_at) 
    FROM email_logs 
    WHERE reservation_id = r.reservation_id 
    AND email_type = 'winner'
  )
  AND e.status = 'success'
)

UNION ALL

SELECT 
  '最新ステータス: 失敗',
  COUNT(*)
FROM (
  SELECT r.reservation_id
  FROM reservations r
  INNER JOIN email_logs e ON r.reservation_id = e.reservation_id
  WHERE r.lottery_status = 'won'
  AND e.email_type = 'winner'
  AND e.sent_at = (
    SELECT MAX(sent_at) 
    FROM email_logs 
    WHERE reservation_id = r.reservation_id 
    AND email_type = 'winner'
  )
  AND e.status = 'failed'
);
```

## 使用方法

### Cloudflare D1 Console で実行
1. https://dash.cloudflare.com にアクセス
2. Workers & Pages → D1 → tsuboi-premium-production
3. Console タブを開く
4. 上記SQLを1つずつ実行

### 結果の見方

**正常な状態**:
- 「重複送信確認」クエリの結果が0件
- 「最新ステータス: 成功」の数 + 「最新ステータス: 失敗」の数 = 「総応募者（当選）」の数

**異常な状態**:
- 「重複送信確認」クエリで結果が表示される → 重複送信が発生している
- 「最新ステータス」の合計が「総応募者（当選）」と一致しない → メール未送信の人がいる

## トラブルシューティング

### 再送後も失敗件数が減らない
**原因**: メールアドレスが無効、またはResend APIの問題
**対処**: 
1. 上記「2. 再送対象の詳細リスト」で `error_message` を確認
2. メールアドレスの正当性を確認
3. 電話連絡に切り替え

### 重複送信が発生している
**原因**: 修正前のバージョンで再送を実行した
**対処**:
1. 最新版にデプロイ済みか確認（2026-03-06 15:30以降）
2. キャッシュクリア（Ctrl+Shift+R）
3. 再送ボタンをクリック

### メール未送信の人がいる
**原因**: 抽選実行後にメール送信をスキップした可能性
**対処**:
1. 「メール一括送信」ボタンをクリック
2. または「失敗メール再送」ボタンをクリック

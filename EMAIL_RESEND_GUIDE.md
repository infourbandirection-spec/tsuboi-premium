# メール送信失敗時の再送ガイド

## 概要
抽選後の当選メール送信で失敗が発生した場合の対処方法と再送手順をまとめています。

**重要な修正（2026-03-06）**: 再送ボタンは**最新の送信結果のみ**を確認するように修正されました。再送で成功した人に重複してメールが送られることはありません。

## 失敗原因の主な要因

### 1. メールアドレスの問題
- **無効なメールアドレス**: タイポ、存在しないドメイン
- **一時的なメールアドレス**: 使い捨てメール、無効化済みアドレス
- **受信拒否設定**: ユーザー側のフィルタ設定

### 2. Resend API の制限
- **レート制限**: 短時間での大量送信
- **無料プランの制限**: 
  - 1日あたり100通まで
  - 月あたり3,000通まで
- **ドメイン認証**: 認証されていないドメインからの送信

### 3. ネットワーク/サーバー問題
- **タイムアウト**: API応答の遅延
- **接続エラー**: ネットワーク障害
- **サーバーエラー**: Resend側の一時的な障害

## 失敗メールの確認方法

### 方法1: 管理画面で確認
1. 管理画面にログイン: https://tsuboi-premium.pages.dev/admin
2. 「抽選管理」タブを開く
3. メール一括送信後の結果メッセージを確認
4. 「失敗: XX件」と表示された場合、失敗メールアドレスが表示される

### 方法2: データベースで確認
Cloudflare D1 Console で以下のSQLを実行：

```sql
-- 失敗したメールログを確認
SELECT 
  e.reservation_id,
  e.recipient_email,
  r.full_name,
  e.error_message,
  e.sent_at
FROM email_logs e
INNER JOIN reservations r ON e.reservation_id = r.reservation_id
WHERE e.status = 'failed' 
AND e.email_type = 'winner'
ORDER BY e.sent_at DESC;
```

## 再送手順

### 管理画面から一括再送（推奨）

1. **管理画面にアクセス**
   - URL: https://tsuboi-premium.pages.dev/admin
   - ログインしてください

2. **抽選管理タブを開く**
   - 左メニューから「抽選管理」を選択

3. **失敗メール再送ボタンをクリック**
   - オレンジ色の「失敗メール再送」ボタンをクリック
   - 確認ダイアログで「OK」をクリック

4. **再送結果を確認**
   - 成功件数と失敗件数が表示されます
   - 再度失敗した場合は、失敗した宛先が表示されます

### 手動で個別再送

失敗が繰り返される場合は、個別に対応してください：

1. **応募詳細から確認**
   - 応募一覧から対象の応募を検索
   - 応募詳細画面でメールアドレスを確認

2. **メールアドレスの修正**
   - 応募詳細画面で「編集」をクリック
   - 正しいメールアドレスに修正
   - 保存

3. **再送を実行**
   - 「失敗メール再送」ボタンをクリック
   - 修正したメールアドレスに再送信されます

## 失敗が繰り返される場合の対処

### 1. メールアドレスの正当性確認
- ドメインが存在するか確認（例: @docomo.ne.jp, @gmail.com）
- タイポがないか確認（例: @gmial.com → @gmail.com）
- 全角文字が含まれていないか確認

### 2. ユーザーへの連絡
以下の方法でユーザーに連絡してください：

#### 電話連絡
- 応募時の電話番号に連絡
- 「メールが届いていない可能性がある」と伝える
- 正しいメールアドレスを確認
- または、電話で当選を直接伝える

#### 管理画面でのメモ記録
- 応募詳細画面で除外理由欄に記録
- 例：「メール不達のため電話連絡済み（2026-03-06）」

### 3. Resend APIの確認
- Resend ダッシュボードでログを確認: https://resend.com/logs
- エラーメッセージの詳細を確認
- 必要に応じてResendサポートに問い合わせ

## 予防策

### 応募時のメールアドレス検証強化
- 応募フォームでメールアドレスの形式チェックを強化
- 確認用メールアドレス入力欄の追加を検討
- 応募完了メールを送信し、受信確認を行う

### Resend API設定の見直し
- ドメイン認証を完了させる（SPF, DKIM, DMARC）
- 送信元メールアドレスを認証済みドメインにする
- レート制限を考慮した送信スケジュールを設定

### バックアップ連絡手段の確保
- 電話番号を必須入力にする
- SMS送信の検討（Twilio等）
- 郵送での通知も検討

## 再送機能の技術仕様

### API エンドポイント
```
POST /api/admin/resend-failed-emails
Authorization: Bearer <admin_token>
```

### 処理内容（修正版）
1. 各 `reservation_id` の**最新の送信結果のみ**を確認（サブクエリで `MAX(sent_at)` を使用）
2. 最新の送信が `status='failed'` かつ `email_type='winner'` のものを取得
3. 当選メールを再送信（50ms間隔でレート制限対策）
4. 送信結果を `email_logs` に記録
5. **重要**: 再送で成功した人は次回の再送対象から除外される

### SQLクエリ（修正版）
```sql
SELECT DISTINCT r.reservation_id, e.recipient_email, r.full_name, r.quantity, 
       r.store_location, r.pickup_date, r.pickup_time_slot
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
```

**修正理由**:
- 旧実装では、全ての `status='failed'` レコードを取得していた
- 再送で成功しても古い失敗レコードが残るため、重複送信が発生
- 新実装では、**最新の送信結果のみ**を確認するため、重複送信を防止

### レスポンス例
```json
{
  "success": true,
  "message": "メール再送完了: 成功 10件、失敗 2件",
  "sent": 10,
  "failed": 2,
  "failedRecipients": [
    "invalid@example.com (山田太郎)",
    "test@invalid-domain.xyz (佐藤花子)"
  ]
}
```

## データベーステーブル構造

### email_logs テーブル
```sql
CREATE TABLE email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'confirmation', 'winner', 'loser'
  subject TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failed'
  message_id TEXT,
  error_message TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);
```

## トラブルシューティング

### Q1: 「再送対象のメールがありません」と表示される
**原因**: 失敗したメールログが存在しない
**対処**: 
- メール一括送信が正常に完了している
- または、既に全て再送済み
- データベースで直接確認してください

### Q2: 再送しても同じメールアドレスで失敗し続ける
**原因**: メールアドレスが無効、または受信拒否設定
**対処**:
- 電話でユーザーに連絡
- 正しいメールアドレスを確認して修正
- または、電話で当選を伝える

### Q3: 再送ボタンをクリックしてもエラーになる
**原因**: 認証トークン期限切れ、またはサーバーエラー
**対処**:
- ログアウトして再ログイン
- ブラウザのキャッシュをクリア
- 数分後に再試行

### Q4: Resend API のレート制限エラー
**原因**: 短時間で大量のメール送信
**対処**:
- 10分程度待ってから再送
- または、Resend の有料プランへのアップグレードを検討

## 関連ドキュメント
- [Resend API ドキュメント](https://resend.com/docs)
- [Cloudflare D1 ドキュメント](https://developers.cloudflare.com/d1/)

## 更新履歴
- 2026-03-06 14:00: 初版作成（メール再送機能追加）
- 2026-03-06 15:30: 重複送信問題の修正（最新の送信結果のみを確認するように変更）

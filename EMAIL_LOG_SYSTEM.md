# メール送信ログシステム

## 概要
パスート24 プレミアム商品券システムのすべてのメール送信が自動的に記録され、管理画面から閲覧できるようになりました。

## 実装日時
**2026-03-04**

## データベース構造

### email_logs テーブル
```sql
CREATE TABLE IF NOT EXISTS email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL,        -- 'confirmation', 'winner', 'loser'
  subject TEXT NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL,             -- 'success', 'failed'
  message_id TEXT,                  -- Resend APIからのメッセージID
  error_message TEXT,
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);
```

### インデックス
- `idx_email_logs_reservation_id`: 応募ID検索用
- `idx_email_logs_sent_at`: 送信日時検索用
- `idx_email_logs_status`: ステータス検索用

## メールの種類

### 1. 応募完了メール (`confirmation`)
- **送信タイミング**: 応募フォーム完了時
- **件名**: パスート24 プレミアム商品券 応募完了
- **内容**: 応募ID、数量、受取店舗、受取日時

### 2. 抽選当選メール (`winner`)
- **送信タイミング**: 管理画面で抽選実行時
- **件名**: パスート24 プレミアム商品券 抽選結果のお知らせ（当選）
- **内容**: 当選通知、受取店舗、受取日時、本人確認書類の案内

### 3. 抽選落選メール (`loser`)
- **送信タイミング**: 管理画面で抽選実行時
- **件名**: パスート24 プレミアム商品券 抽選結果のお知らせ
- **内容**: 落選通知、次回応募案内

## API エンドポイント

### 1. メールログ一覧取得（管理者専用）
```
GET /api/admin/email-logs
```

**クエリパラメータ**:
- `limit`: 取得件数（デフォルト: 100）
- `offset`: オフセット（デフォルト: 0）
- `reservation_id`: 応募IDでフィルタ（オプション）
- `status`: ステータスでフィルタ（`success` または `failed`、オプション）

**レスポンス例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "reservation_id": "PRE-20260304-ABC123",
      "recipient_email": "user@example.com",
      "email_type": "confirmation",
      "subject": "パスート24 プレミアム商品券 応募完了",
      "sent_at": "2026-03-04 10:30:00",
      "status": "success",
      "message_id": "re_abc123xyz",
      "error_message": null
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

### 2. 特定応募IDのメールログ取得（管理者専用）
```
GET /api/admin/email-logs/:reservationId
```

**レスポンス例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "reservation_id": "PRE-20260304-ABC123",
      "recipient_email": "user@example.com",
      "email_type": "confirmation",
      "subject": "パスート24 プレミアム商品券 応募完了",
      "sent_at": "2026-03-04 10:30:00",
      "status": "success",
      "message_id": "re_abc123xyz",
      "error_message": null
    },
    {
      "id": 45,
      "reservation_id": "PRE-20260304-ABC123",
      "recipient_email": "user@example.com",
      "email_type": "winner",
      "subject": "パスート24 プレミアム商品券 抽選結果のお知らせ（当選）",
      "sent_at": "2026-03-05 15:00:00",
      "status": "success",
      "message_id": "re_def456uvw",
      "error_message": null
    }
  ]
}
```

## 自動ログ記録

### sendEmail関数の拡張
すべてのメール送信時に自動的にログが記録されます：

```typescript
const emailResult = await sendEmail(
  'user@example.com',
  'パスート24 プレミアム商品券 応募完了',
  emailHTML,
  c.env,
  'PRE-20260304-ABC123',  // 応募ID
  'confirmation'           // メール種類
)
```

### ログ記録のタイミング

1. **成功時**: メール送信成功直後にログ記録
   - `status`: 'success'
   - `message_id`: Resend APIからのメッセージID
   - `error_message`: null

2. **失敗時**: メール送信エラー時にもログ記録
   - `status`: 'failed'
   - `message_id`: null
   - `error_message`: エラー内容

### エラーハンドリング
- メール送信に成功してもログ記録に失敗した場合、コンソールにエラーログを出力
- ログ記録の失敗はメール送信自体の成功/失敗に影響しない

## マイグレーション履歴

### 0010_add_email_logs.sql
- **作成日時**: 2026-03-04
- **内容**: email_logsテーブル作成とインデックス設定
- **適用状況**:
  - ローカル環境: ✅ 適用済み
  - 本番環境: ✅ 適用済み

## 確認手順

### 1. テーブル存在確認
```bash
# ローカル環境
npx wrangler d1 execute passport24-voucher-production --local \
  --command="SELECT name FROM sqlite_master WHERE type='table' AND name='email_logs'"

# 本番環境
npx wrangler d1 execute passport24-voucher-production --remote \
  --command="SELECT name FROM sqlite_master WHERE type='table' AND name='email_logs'"
```

### 2. メールログ確認
```bash
# ローカル環境
npx wrangler d1 execute passport24-voucher-production --local \
  --command="SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10"

# 本番環境
npx wrangler d1 execute passport24-voucher-production --remote \
  --command="SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10"
```

### 3. API経由で確認（管理者権限必要）
```bash
# 管理者ログイン
curl -X POST https://passurt24.pages.dev/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_admin_password"}'

# メールログ取得
curl -X GET https://passurt24.pages.dev/api/admin/email-logs \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## 運用上の注意事項

### データ保持期間
- 現在、メールログは無期限保存
- 将来的に古いログのアーカイブや削除機能を検討

### プライバシー保護
- メールログには個人情報（メールアドレス）が含まれるため、管理者のみアクセス可能
- APIは認証トークン必須

### パフォーマンス
- インデックスが設定されているため、検索は高速
- 大量ログ蓄積時はlimit/offsetでページネーション実施

## 今後の拡張案

### 1. メール再送機能
失敗したメールを管理画面から手動で再送信

### 2. メール内容プレビュー
管理画面でメールHTMLを確認

### 3. 統計ダッシュボード
- 送信成功率
- メール種類別の送信数
- 日時別の送信グラフ

### 4. アラート機能
メール送信失敗が連続した場合の管理者通知

## 関連ファイル
- マイグレーション: `/migrations/0010_add_email_logs.sql`
- メイン実装: `/src/index.tsx` (sendEmail関数、メールログAPI)
- 設定: `/wrangler.jsonc` (D1データベース設定)

## 問い合わせ
技術的な質問: info.urbandirection@gmail.com

---

**バージョン**: 1.0.0  
**最終更新**: 2026-03-04  
**ステータス**: ✅ 本番環境デプロイ済み

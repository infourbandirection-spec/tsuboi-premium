# メール送信設定

## 送信元メールアドレス

### 現在の設定
- **送信元**: `info.urbandirection@gmail.com`
- **更新日**: 2026-03-04

### 設定方法

#### 1. ローカル開発環境
`.dev.vars` ファイルに以下を設定：
```bash
RESEND_API_KEY=re_2oYH4UPg_GTPFCMFneHTws4WCzfLPGH9N
RESEND_FROM_EMAIL=info.urbandirection@gmail.com
```

#### 2. 本番環境
Wranglerコマンドでシークレットを設定：
```bash
# 送信元メールアドレス設定
echo "info.urbandirection@gmail.com" | npx wrangler pages secret put RESEND_FROM_EMAIL --project-name passurt24

# 設定確認
npx wrangler pages secret list --project-name passurt24
```

### メール送信の仕組み

#### Resend API
- **サービス**: [Resend.com](https://resend.com)
- **APIキー**: Resendダッシュボードで取得
- **ドメイン検証**: 不要（Gmailアドレス使用のため）

#### 送信可能なメールアドレス
Resend APIの制限により、**検証済みメールアドレス**のみに送信可能：
- ✅ `info.urbandirection@gmail.com`（自分自身）
- ❌ その他のアドレス（ドメイン検証が必要）

**注意**: 本番環境で他のユーザーにメールを送信するには、独自ドメインを検証する必要があります。

### メール種類

#### 1. 応募完了メール
- **トリガー**: 応募フォーム送信時
- **件名**: パスート24 プレミアム商品券 応募完了
- **内容**: 応募ID、受取店舗、受取日時

#### 2. 抽選当選メール
- **トリガー**: 管理画面で抽選実行時
- **件名**: パスート24 プレミアム商品券 抽選結果のお知らせ（当選）
- **内容**: 当選通知、受取案内

#### 3. 抽選落選メール
- **トリガー**: 管理画面で抽選実行時
- **件名**: パスート24 プレミアム商品券 抽選結果のお知らせ
- **内容**: 落選通知、次回案内

### トラブルシューティング

#### メールが送信されない場合

1. **APIキー確認**
```bash
npx wrangler pages secret list --project-name passurt24
```

2. **ログ確認**
管理画面 → ブラウザコンソール → Network → `/api/reserve` のレスポンス確認

3. **Resendダッシュボード確認**
- [Resend Logs](https://resend.com/logs)
- 送信失敗理由を確認

#### よくあるエラー

**エラー**: "You can only send testing emails to your own email address"
- **原因**: ドメイン未検証
- **解決**: 独自ドメインを検証するか、送信先を `info.urbandirection@gmail.com` に変更

**エラー**: "Email service not configured"
- **原因**: APIキーが設定されていない
- **解決**: `wrangler pages secret put RESEND_API_KEY` でAPIキーを設定

### 独自ドメインでの運用（推奨）

本番運用では独自ドメインの使用を推奨：

1. **ドメイン検証**
   - Resendダッシュボードでドメイン追加
   - DNSレコード設定（SPF, DKIM, DMARC）
   - 検証完了まで24-48時間

2. **メールアドレス変更**
   ```bash
   # 例: info@passurt24.jp に変更
   echo "info@passurt24.jp" | npx wrangler pages secret put RESEND_FROM_EMAIL --project-name passurt24
   ```

3. **メリット**
   - 任意のメールアドレスに送信可能
   - プロフェッショナルな印象
   - 配信率向上（SPF/DKIM設定済み）

### 送信履歴確認

#### データベース
```sql
-- 直近10件のメール送信履歴
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10;

-- 送信成功率
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM email_logs), 2) as percentage
FROM email_logs
GROUP BY status;
```

#### 管理画面API
```bash
# メールログ取得
curl -X GET https://passurt24.pages.dev/api/admin/email-logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### セキュリティ

#### APIキー保護
- ✅ `.dev.vars` は `.gitignore` に含まれている
- ✅ 本番環境はCloudflare Secretsで暗号化保存
- ❌ コードにAPIキーを直接記載しない

#### メールアドレス保護
- 個人情報として扱う
- 管理者のみアクセス可能
- ログ記録時も暗号化推奨

---

**問い合わせ**: info.urbandirection@gmail.com  
**最終更新**: 2026-03-04  
**バージョン**: 1.0.0

# メール送信機能の設定ガイド

**最終更新**: 2026年2月26日

---

## 📧 概要

プレミアム商品券予約・抽選システムに**メール送信機能**が追加されました。
予約完了後、ユーザーに自動的に確認メールが送信されます。

### 実装内容
- ✅ メールアドレス入力ステップ追加（ステップ3/8）
- ✅ メールアドレスバリデーション（RFC 5322準拠）
- ✅ Resend APIを使用した自動メール送信
- ✅ HTMLフォーマットの美しい確認メール
- ✅ 予約ID、氏名、冊数、店舗、日時を含む詳細情報
- ✅ 非同期送信（メール失敗でも予約は成功）

---

## 🚀 Resend APIの設定手順

### ステップ1: Resendアカウント作成

1. **Resend公式サイトにアクセス**
   - URL: https://resend.com/

2. **無料アカウント作成**
   - 無料プラン: **月100通まで送信可能**
   - クレジットカード不要

3. **ログイン後、API Keyを取得**
   - ダッシュボード → **API Keys**
   - **Create API Key** をクリック
   - 名前: `premium-voucher-production` （任意）
   - 権限: **Sending access**
   - **Create** をクリック
   - **表示されたAPIキーをコピー**（後で見れないので注意！）

---

### ステップ2: Cloudflare Pagesに環境変数を設定

#### 本番環境（Cloudflare Pages）

```bash
# Cloudflare Pagesのシークレットとして設定
npx wrangler pages secret put RESEND_API_KEY --project-name webapp

# 入力プロンプトが表示されたら、コピーしたAPIキーを貼り付け
? Enter a secret value: re_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### ローカル開発環境

`.dev.vars`ファイルを作成（**Gitにコミットしない！**）:

```bash
# プロジェクトルートに作成
cd /home/user/webapp
cat > .dev.vars << 'EOF'
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
EOF
```

`.gitignore`に`.dev.vars`が含まれているか確認:

```bash
grep ".dev.vars" .gitignore
# 出力: .env が表示されればOK（.dev.varsも無視される）
```

---

### ステップ3: 動作確認

#### ローカルテスト

```bash
# 開発サーバー起動
cd /home/user/webapp
npm run build
pm2 restart premium-voucher-system

# ブラウザで予約テスト
# http://localhost:3000/
# 予約完了後、登録したメールアドレスに確認メールが届く
```

#### 本番環境テスト

```bash
# デプロイ
cd /home/user/webapp
npm run build
npx wrangler pages deploy dist --project-name webapp

# ブラウザで予約テスト
# https://webapp.pages.dev/
# メール送信を確認
```

---

## 📋 メールテンプレート内容

送信されるメールには以下の情報が含まれます：

- 🎫 **予約ID**（例: PRE-20260226-AB3C5D）
- 👤 **氏名**
- 📦 **購入冊数**
- 🏪 **受け取り店舗**
- 📅 **受け取り日時**
- ⚠️ **重要な注意事項**

### メールサンプル

```
件名: 【予約完了】プレミアム商品券のご予約を承りました（予約ID: PRE-20260226-AB3C5D）

━━━━━━━━━━━━━━━━━━━━
🎫 予約完了のお知らせ
プレミアム商品券予約・抽選システム
━━━━━━━━━━━━━━━━━━━━

山田太郎 様

この度は、プレミアム商品券をご予約いただき、誠にありがとうございます。

📋 予約内容
━━━━━━━━━━━━━━━━━━━━
予約ID: PRE-20260226-AB3C5D
お名前: 山田太郎
購入冊数: 2 冊
受け取り店舗: パスー24上通
受け取り日時: 2026-02-27 14:00～15:00

⚠️ 重要なお知らせ
━━━━━━━━━━━━━━━━━━━━
• 予約IDは必ず控えてください
• 受け取り時には本メールまたは予約IDをご提示ください
• 指定時間を1時間以上過ぎた場合、自動的にキャンセルされます
• お一人様1回限りの予約です
```

---

## 🔧 トラブルシューティング

### メールが送信されない

**原因1: APIキーが設定されていない**
```bash
# 確認
npx wrangler pages secret list --project-name webapp

# RESEND_API_KEYが表示されない場合は設定
npx wrangler pages secret put RESEND_API_KEY --project-name webapp
```

**原因2: APIキーが無効**
- Resendダッシュボードで新しいAPIキーを作成
- 古いキーを削除
- 新しいキーを再設定

**原因3: 送信制限超過**
- 無料プラン: 月100通まで
- Resendダッシュボードで送信履歴を確認
- 必要に応じて有料プランにアップグレード

### メールが届かない

**スパムフォルダを確認**
- Gmail: 「迷惑メール」フォルダ
- Outlook: 「ジャンクメール」フォルダ

**送信元アドレスの検証**
- 無料プラン: `onboarding@resend.dev`（Resendのテスト用）
- 本番環境: 独自ドメインを追加して認証（推奨）

---

## 🎨 カスタマイズ

### 送信元メールアドレスを変更

`src/index.tsx`の`sendReservationEmail()`関数を編集:

```typescript
from: 'プレミアム商品券 <onboarding@resend.dev>', // ここを変更
```

**独自ドメインを使用する場合**:
1. Resendダッシュボードで**Domains**を追加
2. DNS設定（MX/TXTレコード）を行う
3. 認証完了後、`from`を変更
   ```typescript
   from: 'プレミアム商品券 <noreply@yourdomain.com>',
   ```

### メール件名を変更

```typescript
subject: `【予約完了】プレミアム商品券のご予約を承りました（予約ID: ${reservation.reservationId}）`,
```

### メール本文をカスタマイズ

`emailBody`変数内のHTMLを編集してデザインを変更可能。

---

## 💰 料金プラン

| プラン | 月額 | 送信数 | サポート |
|--------|------|--------|----------|
| **Free** | $0 | 100通 | Email |
| **Pro** | $20 | 50,000通 | Email + Chat |
| **Enterprise** | カスタム | 無制限 | 専任サポート |

**推奨プラン**:
- テスト・小規模: Free（月100通）
- 本番環境: Pro（月50,000通）

---

## 📊 モニタリング

### Resendダッシュボード

- **送信履歴**: 全ての送信メールを確認
- **エラーログ**: 失敗したメールと理由
- **配信率**: 成功/失敗の統計

### Cloudflare Workers Logs

```bash
# リアルタイムログ確認
npx wrangler pages deployment tail --project-name webapp

# メール送信のログを確認
# "Email sent successfully" または "Email sending failed"
```

---

## ✅ 実装確認チェックリスト

- [ ] Resendアカウント作成完了
- [ ] API Key取得完了
- [ ] Cloudflare Pagesに環境変数設定完了
- [ ] ローカル環境で`.dev.vars`作成完了
- [ ] テスト予約でメール送信確認完了
- [ ] 本番環境デプロイ完了
- [ ] 本番環境でメール送信確認完了
- [ ] スパムフォルダチェック完了

---

## 🔗 参考リンク

- **Resend公式ドキュメント**: https://resend.com/docs
- **Resend APIリファレンス**: https://resend.com/docs/api-reference
- **Cloudflare Pages環境変数**: https://developers.cloudflare.com/pages/platform/functions/bindings/

---

**サポート**: 問題が発生した場合は、Resendのサポートチーム（support@resend.com）にお問い合わせください。

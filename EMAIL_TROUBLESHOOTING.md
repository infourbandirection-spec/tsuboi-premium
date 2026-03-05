# メール送信トラブルシューティング

## 問題
応募完了後、確認メールが自動送信されない

## 原因の可能性

### 1. 🔑 Resend APIキーが未設定（最も可能性が高い）

**確認方法**:
Cloudflare Pagesダッシュボードで環境変数を確認

**設定手順**:

#### **方法A: Cloudflare Pagesダッシュボード（推奨）**

1. **Cloudflareダッシュボードにアクセス**
   - https://dash.cloudflare.com/

2. **プロジェクトを開く**
   - tsuboi-premium を選択

3. **Settings タブ → Environment variables**
   - "Add variables" をクリック

4. **環境変数を追加**
   
   **変数1: RESEND_API_KEY**
   ```
   Variable name: RESEND_API_KEY
   Value: re_xxxxxxxxxxxxxxxxxxxxxxxxxx
   Environment: Production (and Preview)
   ```
   
   **変数2: RESEND_FROM_EMAIL（オプション）**
   ```
   Variable name: RESEND_FROM_EMAIL
   Value: info@urbandirection.jp
   Environment: Production (and Preview)
   ```

5. **再デプロイ**
   - Deployments タブ → 最新デプロイ → "Retry deployment"
   - または、GitHubに空コミットをプッシュして自動デプロイ

#### **方法B: Wranglerコマンドライン**
```bash
# Resend APIキーを設定
npx wrangler pages secret put RESEND_API_KEY --project-name tsuboi-premium
# プロンプトが表示されたら、APIキーを入力

# 送信元メールアドレスを設定（オプション）
npx wrangler pages secret put RESEND_FROM_EMAIL --project-name tsuboi-premium
# プロンプトが表示されたら: info@urbandirection.jp
```

---

### 2. 📧 Resend APIキーの取得方法

**Resendアカウントを持っていない場合**:

1. **Resendにサインアップ**
   - https://resend.com/signup
   - メールアドレスで登録（無料プランで月100通まで）

2. **ドメイン認証（重要）**
   - Dashboard → Domains → "Add Domain"
   - `urbandirection.jp` を追加
   - DNS レコードを設定（TXT, MX, CNAME）
   - 認証完了まで数分〜数時間

3. **APIキーを生成**
   - Dashboard → API Keys → "Create API Key"
   - Name: `tsuboi-premium-production`
   - Permission: "Sending access"
   - 生成されたキーをコピー（`re_` で始まる文字列）

4. **Cloudflare Pagesに設定**
   - 上記「方法A」の手順に従って設定

---

### 3. 🔍 メール送信ログの確認

**応募が成功している場合**、メール送信の試行ログがデータベースに記録されます。

#### **ログ確認方法（ブラウザコンソール）**

管理画面にログインして、ブラウザの開発者ツールで確認:
1. https://tsuboi-premium.pages.dev/admin にアクセス
2. F12キーで開発者ツールを開く
3. Console タブを確認
4. 応募一覧から最新の応募を確認
5. エラーメッセージがあれば表示される

#### **データベースで直接確認（Cloudflare APIトークン権限が必要）**

```bash
# email_logsテーブルを確認
npx wrangler d1 execute passport24-voucher-production --remote \
  --command="SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 5"
```

---

### 4. 🛠️ 一時的な対処法

**APIキー設定が完了するまで**:

メール機能は無効化されていますが、応募自体は正常に完了します。
- ✅ 応募データはデータベースに保存される
- ✅ 応募IDは発行される
- ✅ 照会機能で確認可能
- ❌ メールのみ送信されない

**メール送信を後で確認する方法**:
1. 管理画面の応募一覧から応募者のメールアドレスを確認
2. 必要に応じて手動でメール送信（または管理画面から再送信機能を実装）

---

## 📋 確認チェックリスト

- [ ] **Resendアカウントは作成済みですか？**
  - No → https://resend.com/signup で登録
  
- [ ] **ドメイン認証は完了していますか？**
  - No → DNS設定を追加してドメイン認証
  
- [ ] **APIキーは生成しましたか？**
  - No → Resend Dashboard → API Keys → Create
  
- [ ] **Cloudflare Pagesに環境変数を設定しましたか？**
  - No → Settings → Environment variables → Add
  
- [ ] **設定後に再デプロイしましたか？**
  - No → Deployments → Retry deployment

---

## 🔜 次のステップ

1. **Resend APIキーを取得**
   - 既存アカウントから取得 or 新規作成

2. **Cloudflare Pagesに設定**
   - Environment variables に `RESEND_API_KEY` を追加

3. **再デプロイ**
   - Retry deployment または Git push

4. **テスト**
   - 応募フォームから応募
   - メール受信を確認

---

## 📞 サポート

**Resendの問題**:
- ドキュメント: https://resend.com/docs
- サポート: https://resend.com/support

**Cloudflareの問題**:
- ダッシュボード: https://dash.cloudflare.com/
- ドキュメント: https://developers.cloudflare.com/pages/


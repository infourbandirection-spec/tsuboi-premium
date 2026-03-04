# 本番環境セットアップガイド

**作成日**: 2026-03-04  
**バージョン**: v2.4.0

## 🚨 重要：現在の状況

### Cloudflare APIトークンの権限不足

現在設定されているAPIトークン（`u8g-hi5vEJBsN1gvV3ZXSznBU82aQoBzQUNax_Lg`）には、以下の操作に必要な権限が不足しています：

- D1データベースの作成・管理
- KVネームスペースの作成・管理  
- Pagesプロジェクトのデプロイ

### 必要なAPIトークン権限

Cloudflareダッシュボード（https://dash.cloudflare.com/profile/api-tokens）で、以下の権限を持つAPIトークンを作成してください：

**必須権限**:
- Account - Cloudflare Pages: Edit
- Account - D1: Edit
- Account - Workers KV Storage: Edit
- Account - Account Settings: Read

**推奨設定**:
- Token名: `Wrangler CLI Token`
- TTL: 長期（1年以上）

## 📋 本番環境セットアップ手順

### Step 1: Cloudflare APIトークンの更新

```bash
# 新しいAPIトークンを環境変数に設定
export CLOUDFLARE_API_TOKEN="your_new_token_here"
echo "export CLOUDFLARE_API_TOKEN=\"your_new_token_here\"" >> ~/.bashrc

# 認証確認
npx wrangler whoami
```

### Step 2: D1データベースの確認（既存の場合）

既存のD1データベースID: `92ba7506-598f-4bb2-baf8-40d07a379224`

```bash
# データベースが存在するか確認
npx wrangler d1 list

# 既存データベースを使用する場合はスキップ
# 新規作成する場合：
# npx wrangler d1 create passport24-voucher-production
# 出力されたdatabase_idをwrangler.jsonc に設定
```

### Step 3: KVネームスペースの確認（既存の場合）

既存のKVネームスペースID:
- CSRF_TOKENS: `620dcfa3ae4e4c7bbf155e07c1840a93`
- RATE_LIMIT: `8d09805b2d1b4b3db141bbe067e34537`

```bash
# KVネームスペースが存在するか確認
npx wrangler kv:namespace list

# 既存ネームスペースを使用する場合はスキップ
# 新規作成する場合：
# npx wrangler kv:namespace create CSRF_TOKENS
# npx wrangler kv:namespace create RATE_LIMIT
# 出力されたIDをwrangler.jsonc に設定
```

### Step 4: 本番環境へのマイグレーション適用

```bash
cd /home/user/webapp

# すべてのマイグレーションを本番環境に適用
npx wrangler d1 migrations apply passport24-voucher-production --remote

# 適用されるマイグレーション:
# - 0001_initial_schema.sql (初期スキーマ)
# - 0003_add_email_field.sql
# - 0005_add_kana_field.sql
# - 0006_add_lottery_system.sql
# - 0007_add_pickup_tracking.sql
# - 0008_add_admin_users.sql
# - 0009_add_passurt24_admin.sql
# - 0010_add_email_logs.sql
# - 0011_add_excluded_from_lottery.sql
# - 0012_add_pickup_dates_table.sql
# - 0013_add_pickup_time_slots_table.sql
# - 0014_remove_karashima_stores.sql (辛島店舗削除)
# - 0015_update_store_to_ichijoya.sql (一畳屋ショールーム設定)
# - 0016_change_quantity_limit_to_3.sql (冊数上限3冊)
```

### Step 5: Resend APIキーの設定

#### 5-1. Resend APIキーの取得

1. https://resend.com/ にアクセス
2. ダッシュボードで「API Keys」セクションへ
3. 「Create API Key」をクリック
4. 名前を入力（例: `passurt24-production`）
5. 権限: `Sending access` を選択
6. 生成されたキーをコピー（`re_` で始まる文字列）

#### 5-2. ローカル開発環境での設定

既に `.dev.vars` ファイルが作成されています：

```bash
# .dev.vars ファイルを編集
nano .dev.vars

# 以下の内容に更新：
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=info@urbandirection.jp
```

**重要**: `.dev.vars` は `.gitignore` に含まれているため、Gitにコミットされません。

#### 5-3. 本番環境での設定

```bash
# Resend APIキーを本番環境のシークレットとして設定
npx wrangler pages secret put RESEND_API_KEY --project-name passurt24
# プロンプトで実際のAPIキーを入力（re_で始まる文字列）

# 送信元メールアドレスを設定
npx wrangler pages secret put RESEND_FROM_EMAIL --project-name passurt24
# プロンプトで info@urbandirection.jp を入力

# 設定したシークレットを確認
npx wrangler pages secret list --project-name passurt24
```

### Step 6: Pagesプロジェクトの作成（初回のみ）

```bash
# Pagesプロジェクトを作成（初回デプロイ時のみ）
npx wrangler pages project create passurt24 \
  --production-branch main \
  --compatibility-date 2026-02-25

# 既にプロジェクトが存在する場合はスキップ
```

### Step 7: 本番環境へのデプロイ

```bash
cd /home/user/webapp

# ビルド（既に完了済み）
npm run build

# 本番環境にデプロイ
npx wrangler pages deploy dist --project-name passurt24 --branch main

# デプロイ成功後、以下のURLが表示されます：
# Production: https://passurt24.pages.dev
# Branch: https://main.passurt24.pages.dev
```

### Step 8: D1データベースとKVのバインディング設定

Cloudflare Pagesダッシュボードでバインディングを設定：

1. https://dash.cloudflare.com/ にアクセス
2. Workers & Pages → passurt24 を選択
3. Settings → Functions → D1 database bindings
4. 以下を追加：
   - Variable name: `DB`
   - D1 database: `passport24-voucher-production`
5. Settings → Functions → KV namespace bindings
6. 以下を追加：
   - Variable name: `CSRF_TOKENS`, KV namespace: (既存のID)
   - Variable name: `RATE_LIMIT`, KV namespace: (既存のID)

**または、wrangler.jsonc が正しく設定されていれば自動的にバインドされます。**

### Step 9: 本番環境の動作確認

```bash
# システムステータス確認
curl https://passurt24.pages.dev/api/status

# 店舗一覧確認
curl https://passurt24.pages.dev/api/stores

# 管理画面アクセス
# https://passurt24.pages.dev/admin
# ユーザー名: urbandirection
# パスワード: urbandirection
```

## 📧 メール送信機能の確認

### テストメール送信

```bash
# test-emails.js を使用してテストメール送信
node test-emails.js
```

### メール送信のトラブルシューティング

**メールが送信されない場合**:

1. **Resend APIキーの確認**
   ```bash
   npx wrangler pages secret list --project-name passurt24
   ```
   
2. **送信元ドメインの認証**
   - Resendダッシュボードで `urbandirection.jp` ドメインが認証済みか確認
   - 未認証の場合、DNS設定（SPF、DKIM、DMARC）を追加

3. **ログの確認**
   - 本番環境: Cloudflare Pagesダッシュボード → Logs
   - ローカル環境: `pm2 logs premium-voucher-system --nostream`

### メール送信のフロー

1. **予約完了時**
   - 送信先: 予約者のメールアドレス（email フィールド）
   - 件名: `坪井繁栄会 プレミアム商品券 予約完了のお知らせ`
   - 内容: 予約ID、冊数、購入店舗、購入日時

2. **抽選結果通知**
   - **当選者向け**
     - 件名: `坪井繁栄会 プレミアム商品券 抽選結果のお知らせ（当選）`
     - 内容: 当選通知、予約ID、購入詳細
   - **落選者向け**
     - 件名: `坪井繁栄会 プレミアム商品券 抽選結果のお知らせ（落選）`
     - 内容: 落選通知、次回の案内

3. **メールログ**
   - すべての送信メールは `email_logs` テーブルに記録
   - 管理画面で送信履歴を確認可能

## 🔒 セキュリティ設定

### 環境変数の管理

**ローカル開発**:
- `.dev.vars` ファイルを使用
- `.gitignore` で除外済み

**本番環境**:
- Cloudflare Pages Secretsを使用
- ダッシュボードまたは `wrangler pages secret put` で設定

### 管理者認証

デフォルト管理者アカウント:
- ユーザー名: `urbandirection`
- パスワード: `urbandirection`

**セキュリティ推奨事項**:
1. 本番デプロイ後、管理画面でパスワードを変更
2. 定期的なパスワード更新
3. アクセスログの監視

## 📊 現在の設定状態

### ✅ 完了済み
- [x] ローカル開発環境構築
- [x] D1データベース（ローカル）セットアップ
- [x] マイグレーション作成（16ファイル）
- [x] .dev.vars ファイル作成
- [x] ビルド成功（107.16 kB）
- [x] Git管理（コミット: 5d2b2c9）

### ⏳ 要対応（APIトークン権限不足により保留）
- [ ] 本番D1データベースへのマイグレーション適用
- [ ] 本番Pagesプロジェクトへのデプロイ
- [ ] 本番環境でのResend APIキー設定

## 🔧 代替デプロイ方法

APIトークンの権限問題が解決できない場合、以下の方法でデプロイできます：

### 方法1: Cloudflareダッシュボードから手動デプロイ

1. https://dash.cloudflare.com/ にログイン
2. Workers & Pages → Create application → Pages → Connect to Git
3. GitHubリポジトリを接続
4. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
5. Environment variables を設定:
   - `RESEND_API_KEY`: (Resend APIキー)
   - `RESEND_FROM_EMAIL`: `info@urbandirection.jp`

### 方法2: 正しい権限を持つAPIトークンを作成

1. https://dash.cloudflare.com/profile/api-tokens にアクセス
2. 「Create Token」をクリック
3. 「Edit Cloudflare Workers」テンプレートを選択
4. 以下の権限を追加：
   - Account - Cloudflare Pages: Edit
   - Account - D1: Edit
   - Account - Workers KV Storage: Edit
   - Account - Account Settings: Read
5. アカウントリソースを選択
6. 「Continue to summary」→「Create Token」
7. 生成されたトークンをコピー
8. 以下のコマンドで設定：
   ```bash
   export CLOUDFLARE_API_TOKEN="new_token_here"
   echo "export CLOUDFLARE_API_TOKEN=\"new_token_here\"" >> ~/.bashrc
   npx wrangler whoami
   ```

### 方法3: wrangler login（対話的認証）

```bash
# 既存のトークンをクリア
unset CLOUDFLARE_API_TOKEN

# ブラウザベースの認証（サンドボックス環境では使用不可）
npx wrangler login
```

## 📧 Resend APIキーの取得方法

### 1. Resendアカウントの作成

1. https://resend.com/signup にアクセス
2. メールアドレスで登録（info@urbandirection@gmail.com 推奨）
3. メール認証を完了

### 2. ドメイン認証

1. Resendダッシュボード → Domains
2. 「Add Domain」をクリック
3. `urbandirection.jp` を入力
4. 表示されるDNSレコードを設定：
   - **SPF**: TXTレコード `v=spf1 include:_spf.resend.com ~all`
   - **DKIM**: CNAME レコード（Resendが提供）
   - **DMARC**: TXTレコード `v=DMARC1; p=none;`
5. 認証完了まで待機（最大48時間）

### 3. APIキーの作成

1. Resendダッシュボード → API Keys
2. 「Create API Key」をクリック
3. 名前: `passurt24-production`
4. 権限: `Sending access`
5. Domain: `urbandirection.jp`
6. 「Create」をクリック
7. 表示されたキーをコピー（`re_` で始まる）

**重要**: このキーは1回しか表示されないので、安全に保存してください。

### 4. APIキーの設定

**ローカル開発環境**:
```bash
# .dev.vars ファイルを編集
nano /home/user/webapp/.dev.vars

# 以下に更新：
RESEND_API_KEY=re_actual_key_here
RESEND_FROM_EMAIL=info@urbandirection.jp
```

**本番環境**:
```bash
# Cloudflare Pages Secretsに設定
npx wrangler pages secret put RESEND_API_KEY --project-name passurt24
# プロンプトで: re_actual_key_here と入力

npx wrangler pages secret put RESEND_FROM_EMAIL --project-name passurt24
# プロンプトで: info@urbandirection.jp と入力
```

## 🧪 メール送信テスト

### ローカル環境でのテスト

```bash
cd /home/user/webapp

# .dev.vars に実際のAPIキーを設定後
# PM2を再起動（環境変数を読み込み）
pm2 restart premium-voucher-system --update-env

# テストメール送信スクリプトを実行
node test-emails.js
```

### テスト予約でメール送信確認

1. フォームから予約を送信（メールアドレスを入力）
2. `email_logs` テーブルを確認：
   ```bash
   npx wrangler d1 execute passport24-voucher-production --local \
     --command="SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 5"
   ```
3. Resendダッシュボードで送信ログを確認

## 📝 チェックリスト

### デプロイ前
- [ ] Cloudflare APIトークンの権限を確認・更新
- [ ] Resend APIキーを取得
- [ ] ドメイン認証（urbandirection.jp）完了
- [ ] .dev.vars にAPIキーを設定してローカルテスト
- [ ] メール送信テストが成功

### デプロイ時
- [ ] `npm run build` でビルド
- [ ] 本番D1データベースへマイグレーション適用
- [ ] `npx wrangler pages deploy` でデプロイ
- [ ] Cloudflare Pages Secretsに環境変数設定

### デプロイ後
- [ ] 本番URLにアクセス可能
- [ ] 管理画面ログイン成功
- [ ] フォーム送信テスト
- [ ] メール受信確認
- [ ] 店舗情報が正しい（一畳屋ショールーム）
- [ ] 冊数選択が1～3冊

## 🚀 デプロイコマンド一覧

```bash
# 1. 認証確認
npx wrangler whoami

# 2. ビルド
cd /home/user/webapp
npm run build

# 3. マイグレーション適用（本番）
npx wrangler d1 migrations apply passport24-voucher-production --remote

# 4. デプロイ
npx wrangler pages deploy dist --project-name passurt24 --branch main

# 5. シークレット設定
npx wrangler pages secret put RESEND_API_KEY --project-name passurt24
npx wrangler pages secret put RESEND_FROM_EMAIL --project-name passurt24

# 6. 動作確認
curl https://passurt24.pages.dev/api/status
curl https://passurt24.pages.dev/api/stores
```

## 📞 サポート情報

### 関連ドキュメント
- README.md - システム概要と機能説明
- DEPLOYMENT_GUIDE.md - デプロイ詳細ガイド
- QUICKSTART.md - クイックスタートガイド
- QUANTITY_LIMIT_CHANGE.md - 冊数変更の実装詳細

### Cloudflareリソース
- ダッシュボード: https://dash.cloudflare.com/
- APIトークン管理: https://dash.cloudflare.com/profile/api-tokens
- アカウントID: `e74e780cd3e5705ede60a66c07a3d2bb`

### Resendリソース
- ダッシュボード: https://resend.com/
- ドキュメント: https://resend.com/docs
- 送信元メール: info@urbandirection.jp

---

**作成者**: AI Assistant  
**作成日**: 2026-03-04  
**プロジェクト**: passurt24 (坪井繁栄会 プレミアム商品券予約システム)

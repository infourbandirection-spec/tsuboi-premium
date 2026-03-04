# 手動デプロイガイド（Cloudflareダッシュボード使用）

**作成日**: 2026-03-04  
**プロジェクト名**: tsuboi-premium  
**本番URL**: https://tsuboi-premium.pages.dev/

---

## 🎯 このガイドについて

APIトークンの権限問題により、wrangler CLIでのデプロイができない場合、Cloudflareダッシュボードから直接デプロイできます。

**所要時間**: 約15～20分

---

## 📋 事前準備

### 必要なもの
1. ✅ Cloudflareアカウント（info.urbandirection@gmail.com）
2. ✅ ビルド済みのプロジェクト（`/home/user/webapp/dist/`）
3. ⏳ Resend APIキー（`re_` で始まる文字列）
4. ⏳ GitHubリポジトリ（オプション、自動デプロイ用）

### 現在の設定
- **D1 Database ID**: `92ba7506-598f-4bb2-baf8-40d07a379224`
- **KV CSRF_TOKENS ID**: `620dcfa3ae4e4c7bbf155e07c1840a93`
- **KV RATE_LIMIT ID**: `8d09805b2d1b4b3db141bbe067e34537`

---

## 🚀 デプロイ手順

### 方法1: GitHubリポジトリ経由（推奨）

#### Step 1: GitHubリポジトリにコードをプッシュ

**1-1. GitHubで新しいリポジトリを作成**
1. https://github.com/new にアクセス
2. リポジトリ名: `tsuboi-premium` または任意の名前
3. Public/Private を選択
4. 「Create repository」をクリック

**1-2. ローカルコードをプッシュ**
```bash
cd /home/user/webapp

# GitHub認証が未設定の場合
# サンドボックスの#githubタブで認証を完了してください

# リモートリポジトリを追加
git remote add origin https://github.com/YOUR_USERNAME/tsuboi-premium.git

# プッシュ
git push -u origin main
```

#### Step 2: Cloudflare PagesでGitHubを接続

**2-1. Pagesプロジェクトを作成**
1. https://dash.cloudflare.com/ にログイン
2. 左サイドバー → **Workers & Pages**
3. 「Create application」ボタンをクリック
4. 「Pages」タブを選択
5. 「Connect to Git」をクリック

**2-2. GitHubリポジトリを接続**
1. 「Connect GitHub」をクリック
2. GitHubで認証（初回のみ）
3. リポジトリを選択: `tsuboi-premium`
4. 「Begin setup」をクリック

**2-3. ビルド設定**
```
Project name: tsuboi-premium
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: /
```

**2-4. 環境変数を設定**

「Environment variables (advanced)」セクションで以下を追加：

| Variable name | Value | Environment |
|---|---|---|
| `RESEND_API_KEY` | `re_your_actual_api_key` | Production |
| `RESEND_FROM_EMAIL` | `info@urbandirection.jp` | Production |

**2-5. デプロイ**
1. 「Save and Deploy」をクリック
2. デプロイ完了まで待機（約2～5分）

#### Step 3: D1データベースとKVのバインディング設定

**3-1. D1バインディング**
1. Pagesプロジェクト → **Settings** → **Functions**
2. 「D1 database bindings」セクションを探す
3. 「Add binding」をクリック
4. 以下を入力：
   - Variable name: `DB`
   - D1 database: `passport24-voucher-production` を選択
   - （Database ID: `92ba7506-598f-4bb2-baf8-40d07a379224`）
5. 「Save」をクリック

**3-2. KVバインディング**
1. 同じ「Functions」ページの「KV namespace bindings」セクション
2. 「Add binding」を2回クリックして、以下を追加：

**バインディング1**:
- Variable name: `CSRF_TOKENS`
- KV namespace: ID `620dcfa3ae4e4c7bbf155e07c1840a93` を持つネームスペースを選択

**バインディング2**:
- Variable name: `RATE_LIMIT`
- KV namespace: ID `8d09805b2d1b4b3db141bbe067e34537` を持つネームスペースを選択

3. 「Save」をクリック

**3-3. 再デプロイ**
バインディング設定後、再デプロイが必要です：
1. Pagesプロジェクト → **Deployments**
2. 最新のデプロイを選択
3. 「Retry deployment」または新しいコミットをプッシュ

#### Step 4: D1データベースにマイグレーションを適用

**4-1. Cloudflareダッシュボードから**
1. ダッシュボード → **Storage & Databases** → **D1**
2. `passport24-voucher-production` を選択
3. 「Console」タブを選択
4. 各マイグレーションファイルの内容を順番に実行：

```bash
# ローカルでマイグレーション内容を確認
cd /home/user/webapp
cat migrations/0001_initial_schema.sql
# → Cloudflare D1コンソールにコピー&ペーストして実行
```

**重要**: 以下の順序で実行してください：
1. `0001_initial_schema.sql`
2. `0003_add_email_field.sql`
3. `0005_add_kana_field.sql`
4. `0006_add_lottery_system.sql`
5. `0007_add_pickup_tracking.sql`
6. `0008_add_admin_users.sql`
7. `0009_add_passurt24_admin.sql`
8. `0010_add_email_logs.sql`
9. `0011_add_excluded_from_lottery.sql`
10. `0012_add_pickup_dates_table.sql`
11. `0013_add_pickup_time_slots_table.sql`
12. `0014_remove_karashima_stores.sql`
13. `0015_update_store_to_ichijoya.sql`
14. `0016_change_quantity_limit_to_3.sql`

**または、APIトークン権限を更新後**:
```bash
npx wrangler d1 migrations apply passport24-voucher-production --remote
```

---

### 方法2: 直接ファイルアップロード（GitHubなし）

#### Step 1: distフォルダをzipファイルに圧縮

```bash
cd /home/user/webapp
zip -r tsuboi-premium-dist.zip dist/
ls -lh tsuboi-premium-dist.zip
```

#### Step 2: Cloudflare Pagesで新規プロジェクト作成

1. https://dash.cloudflare.com/ にログイン
2. **Workers & Pages** → 「Create application」
3. 「Pages」タブ → 「Upload assets」を選択
4. Project name: `tsuboi-premium`
5. Production branch: `main`

#### Step 3: ファイルをアップロード

1. 「Select from computer」をクリック
2. `dist/` フォルダ内のすべてのファイルを選択してアップロード
   - `_worker.js`
   - `_routes.json`
   - その他すべてのファイル

**または、CLIでアップロード（権限問題が解決後）**:
```bash
cd /home/user/webapp
wrangler pages deploy dist --project-name tsuboi-premium
```

#### Step 4: D1とKVのバインディング設定

前述の「方法1 - Step 3」と同じ手順でバインディングを設定してください。

---

## 📧 Resend APIキーの設定

### Step 1: Resendアカウントとドメイン認証

**1-1. アカウント作成**
1. https://resend.com/signup にアクセス
2. メールアドレス: `info.urbandirection@gmail.com` で登録
3. メール認証を完了

**1-2. ドメイン追加と認証**
1. Resendダッシュボード → **Domains** → 「Add Domain」
2. ドメイン名: `urbandirection.jp` を入力
3. 「Add Domain」をクリック
4. 表示されるDNSレコードをメモ：

```
種類: TXT
ホスト: @ (または空欄)
値: v=spf1 include:_spf.resend.com ~all

種類: CNAME
ホスト: resend._domainkey
値: resend._domainkey.resend.com

種類: TXT  
ホスト: _dmarc
値: v=DMARC1; p=none; rua=mailto:dmarc@urbandirection.jp
```

5. DNS管理画面（お使いのドメインプロバイダ）でこれらのレコードを追加
6. Resendダッシュボードで「Verify」をクリック
7. 認証完了まで待機（数分～48時間）

**1-3. ドメイン認証の確認**
- ステータスが「Verified」になれば完了
- 未認証の場合、DNS設定を再確認

### Step 2: APIキーの作成

**2-1. APIキー生成**
1. Resendダッシュボード → **API Keys**
2. 「Create API Key」をクリック
3. 設定：
   - Name: `tsuboi-premium-production`
   - Permission: `Sending access`
   - Domain: `urbandirection.jp`
4. 「Create」をクリック
5. 表示されたAPIキーをコピー（**重要**: 1回のみ表示されます）

**APIキーの形式**: `re_xxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 3: ローカル環境でテスト

**3-1. .dev.varsを更新**
```bash
cd /home/user/webapp
nano .dev.vars

# 以下に更新（実際のAPIキーに置換）:
RESEND_API_KEY=re_your_actual_api_key_from_resend
RESEND_FROM_EMAIL=info@urbandirection.jp
```

**3-2. PM2再起動（環境変数読み込み）**
```bash
pm2 restart premium-voucher-system --update-env
sleep 3
pm2 logs premium-voucher-system --nostream | tail -20
```

**3-3. テストメール送信**
```bash
cd /home/user/webapp
node test-emails.js
```

**期待される結果**:
- コンソールに「✓ 予約完了メール送信成功」
- `info.urbandirection@gmail.com` にメールが届く
- Resendダッシュボードの「Logs」に送信記録

### Step 4: 本番環境に設定

#### 方法A: Cloudflareダッシュボードから設定（推奨）

1. https://dash.cloudflare.com/ にログイン
2. **Workers & Pages** → `tsuboi-premium` プロジェクトを選択
3. **Settings** → **Environment variables**
4. 「Add variables」をクリック
5. 以下を追加：

**変数1**:
- Variable name: `RESEND_API_KEY`
- Value: `re_your_actual_api_key_from_resend`
- Environment: `Production`
- Type: `Secret` (暗号化)

**変数2**:
- Variable name: `RESEND_FROM_EMAIL`
- Value: `info@urbandirection.jp`
- Environment: `Production`

6. 「Save」をクリック
7. 再デプロイが自動実行される

#### 方法B: wrangler CLI（APIトークン権限更新後）

```bash
# Resend APIキーを設定
npx wrangler pages secret put RESEND_API_KEY --project-name tsuboi-premium
# プロンプトで: re_your_actual_api_key_from_resend を入力

# 送信元メールを設定
npx wrangler pages secret put RESEND_FROM_EMAIL --project-name tsuboi-premium
# プロンプトで: info@urbandirection.jp を入力

# 確認
npx wrangler pages secret list --project-name tsuboi-premium
```

---

## 🧪 デプロイ後の動作確認

### Step 1: 基本動作確認

```bash
# システムステータス
curl https://tsuboi-premium.pages.dev/api/status

# 期待される応答:
# {
#   "success": true,
#   "data": {
#     "totalReserved": 0,
#     "maxTotal": 1000,
#     "remaining": 1000,
#     "isAccepting": true,
#     "currentPhase": 1,
#     "reservationEnabled": true
#   }
# }
```

```bash
# 店舗情報確認
curl https://tsuboi-premium.pages.dev/api/stores

# 期待される応答:
# {
#   "success": true,
#   "stores": [
#     {
#       "id": 7,
#       "store_name": "一畳屋ショールーム",
#       "address": "熊本県熊本市中央区坪井5丁目2-27",
#       "phone": "096-XXX-XXXX",
#       "business_hours": "営業時間はお問い合わせください",
#       "is_active": 1
#     }
#   ]
# }
```

### Step 2: ブラウザ確認

**2-1. トップページ**
1. https://tsuboi-premium.pages.dev/ にアクセス
2. 確認項目：
   - ✅ ページタイトル: 「坪井繁栄会 プレミアム商品券抽選・応募フォーム」
   - ✅ 冊数選択: 1～3冊のドロップダウン
   - ✅ 店舗表示: 「一畳屋ショールーム」

**2-2. 管理画面**
1. https://tsuboi-premium.pages.dev/admin にアクセス
2. ログイン情報を入力：
   - ユーザー名: `urbandirection`
   - パスワード: `urbandirection`
3. ダッシュボードが表示されることを確認

**2-3. 応募照会ページ**
- https://tsuboi-premium.pages.dev/lookup

**2-4. 抽選結果ページ**
- https://tsuboi-premium.pages.dev/lottery-results

### Step 3: メール送信機能の確認

**3-1. テスト予約を送信**
1. https://tsuboi-premium.pages.dev/ にアクセス
2. フォームに以下を入力：
   - 生年月日: `1990-01-01`
   - 氏名（漢字）: `テスト 太郎`
   - 氏名（かな）: `てすと たろう`
   - 電話番号: `090-1234-5678`
   - メールアドレス: `info.urbandirection@gmail.com`（実際に受信できるアドレス）
   - 冊数: `1冊`
   - 購入日: 表示される日付から選択
   - 購入時間: 表示される時間帯から選択
3. 「予約を確定する」をクリック
4. 予約IDが表示される

**3-2. メール受信確認**
1. 入力したメールアドレスの受信トレイを確認
2. 件名「坪井繁栄会 プレミアム商品券 予約完了のお知らせ」のメールが届くことを確認
3. メール内容を確認：
   - 予約ID
   - 冊数
   - 購入店舗: 一畳屋ショールーム
   - 購入日時

**3-3. Resendダッシュボードで確認**
1. https://resend.com/emails にアクセス
2. 最新の送信ログを確認
3. ステータスが「Delivered」になっているか確認

**3-4. データベースログ確認**

APIトークン権限更新後：
```bash
npx wrangler d1 execute passport24-voucher-production --remote \
  --command="SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 5"
```

---

## 🔧 トラブルシューティング

### 問題1: デプロイは成功したが、ページが表示されない

**原因**: D1/KVバインディングが未設定

**解決策**:
1. Settings → Functions でバインディングを確認
2. 不足しているバインディングを追加
3. 再デプロイを実行

### 問題2: APIが500エラーを返す

**原因**: データベースにテーブルが存在しない

**解決策**:
1. D1コンソールでマイグレーションを手動実行
2. または、APIトークン権限更新後に `npx wrangler d1 migrations apply` を実行

### 問題3: メールが送信されない

**原因1**: Resend APIキーが未設定

**解決策**:
1. Settings → Environment variables で `RESEND_API_KEY` を確認
2. 未設定の場合、追加して再デプロイ

**原因2**: ドメイン未認証

**解決策**:
1. Resendダッシュボードでドメイン認証状態を確認
2. DNS設定を再確認
3. 認証完了まで待機

**原因3**: APIキーの権限不足

**解決策**:
1. Resendダッシュボード → API Keys でキーの権限を確認
2. `Sending access` 権限があるか確認
3. 必要に応じて新しいキーを作成

### 問題4: 管理画面にログインできない

**原因**: データベースに管理者アカウントがない

**解決策**:
```sql
-- D1コンソールで実行
INSERT INTO admin_users (username, password, created_at) 
VALUES ('urbandirection', 'urbandirection', datetime('now', 'localtime'));
```

---

## 📊 デプロイ完了チェックリスト

### 必須確認事項
- [ ] https://tsuboi-premium.pages.dev/ にアクセスできる
- [ ] ページタイトルが「坪井繁栄会 プレミアム商品券抽選・応募フォーム」
- [ ] 冊数選択で1～3冊が選択できる
- [ ] 店舗名が「一畳屋ショールーム」
- [ ] 住所が「熊本県熊本市中央区坪井5丁目2-27」
- [ ] 管理画面（/admin）にログインできる
- [ ] ログイン情報: urbandirection / urbandirection

### メール送信確認
- [ ] Resend APIキーが設定されている
- [ ] RESEND_FROM_EMAIL が info@urbandirection.jp に設定
- [ ] urbandirection.jp ドメインが認証済み
- [ ] テスト予約を送信してメールが届く
- [ ] メール内容が正しい（店舗名、冊数など）

### データベース確認
- [ ] D1バインディングが設定されている
- [ ] すべてのマイグレーションが適用されている
- [ ] 店舗データが1件（一畳屋ショールーム）
- [ ] 管理者アカウントが存在する（urbandirection）

### セキュリティ確認
- [ ] RESEND_API_KEY が Secret として設定されている
- [ ] .dev.vars がGitにコミットされていない
- [ ] 本番環境のパスワードを変更（推奨）

---

## 📞 サポートリソース

### Cloudflare
- ダッシュボード: https://dash.cloudflare.com/
- Pagesドキュメント: https://developers.cloudflare.com/pages/
- D1ドキュメント: https://developers.cloudflare.com/d1/
- KVドキュメント: https://developers.cloudflare.com/kv/

### Resend
- ダッシュボード: https://resend.com/
- APIドキュメント: https://resend.com/docs
- ドメイン認証ガイド: https://resend.com/docs/dashboard/domains/introduction

### プロジェクト情報
- アカウントメール: info.urbandirection@gmail.com
- プロジェクト名: tsuboi-premium
- 送信元メール: info@urbandirection.jp
- アカウントID: e74e780cd3e5705ede60a66c07a3d2bb

---

## 🎯 クイックスタート（権限取得後）

正しいAPIトークンを取得した後：

```bash
# 1. APIトークンを設定
export CLOUDFLARE_API_TOKEN="your_new_token_with_correct_permissions"

# 2. マイグレーション適用
cd /home/user/webapp
npx wrangler d1 migrations apply passport24-voucher-production --remote

# 3. デプロイ
npx wrangler pages deploy dist --project-name tsuboi-premium --branch main

# 4. Resend設定
npx wrangler pages secret put RESEND_API_KEY --project-name tsuboi-premium
npx wrangler pages secret put RESEND_FROM_EMAIL --project-name tsuboi-premium

# 5. 動作確認
curl https://tsuboi-premium.pages.dev/api/status
```

---

**最終更新**: 2026-03-04  
**バージョン**: v2.4.0  
**Git Commit**: 689eb4c

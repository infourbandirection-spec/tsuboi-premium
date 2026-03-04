# 🔗 GitHub → Cloudflare Pages 連携手順

**プロジェクト**: tsuboi-premium  
**GitHubリポジトリ**: https://github.com/infourbandirection-spec/tsuboi-premium  
**本番URL**: https://tsuboi-premium.pages.dev/  
**日付**: 2026-03-04

---

## ✅ GitHub プッシュ完了

コードは正常にGitHubにプッシュされました：
- **リポジトリ**: `infourbandirection-spec/tsuboi-premium`
- **ブランチ**: `main`
- **コミット**: cf5ccbe
- **URL**: https://github.com/infourbandirection-spec/tsuboi-premium

---

## 🚀 Cloudflare Pages 連携手順

### ステップ1: Cloudflareダッシュボードにアクセス

1. https://dash.cloudflare.com/ を開く
2. ログイン（アカウント: `info.urbandirection@gmail.com`）

### ステップ2: Pagesプロジェクトを作成

1. 左側メニュー: **Workers & Pages** をクリック
2. **Create application** ボタンをクリック
3. **Pages** タブを選択
4. **Import an existing Git repository** の **Get started** をクリック

### ステップ3: GitHubリポジトリを接続

1. **Connect to Git** セクションで **GitHub** を選択
2. GitHub認証を許可（初回のみ）
3. リポジトリ選択画面で以下を探す:
   ```
   infourbandirection-spec/tsuboi-premium
   ```
4. **Begin setup** をクリック

### ステップ4: ビルド設定

**Set up builds and deployments** 画面で以下を入力:

| 項目 | 設定値 |
|------|-------|
| **Project name** | `tsuboi-premium` |
| **Production branch** | `main` |
| **Framework preset** | None（または Vite を選択） |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` |

### ステップ5: 環境変数を設定

**Environment variables (optional)** セクションで **Add variable** をクリック:

**変数1:**
- **Variable name**: `RESEND_API_KEY`
- **Value**: `re_C4xHhJzX_F3z8NPPUR26bRxWTVtehDrVT`
- **Environment**: Production（✅チェック）

**変数2:**
- **Variable name**: `RESEND_FROM_EMAIL`
- **Value**: `info@urbandirection.jp`
- **Environment**: Production（✅チェック）

### ステップ6: デプロイ開始

1. **Save and Deploy** ボタンをクリック
2. ビルドプロセスが開始されます（約3～5分）
3. デプロイ完了を待ちます

---

## 🔧 デプロイ後の設定（重要）

デプロイが完了したら、以下の追加設定が必要です:

### 1. D1 Databaseバインディング

1. プロジェクト設定: **Settings** → **Functions**
2. **D1 database bindings** セクション:
   - **Add binding** をクリック
   - **Variable name**: `DB`
   - **D1 database**: `passport24-voucher-production` を選択
   - **Save** をクリック

### 2. KV Namespace バインディング

同じ **Functions** ページで:

**Binding 1:**
- **Variable name**: `CSRF_TOKENS`
- **KV namespace**: KV一覧から選択（ID: 620dcfa3ae4e4c7bbf155e07c1840a93）

**Binding 2:**
- **Variable name**: `RATE_LIMIT`
- **KV namespace**: KV一覧から選択（ID: 8d09805b2d1b4b3db141bbe067e34537）

### 3. 再デプロイ

バインディング設定後、**Deployments** タブから:
1. 最新デプロイの **...** メニュー
2. **Retry deployment** をクリック

---

## 📊 D1 マイグレーション適用

### オプション1: D1 Console（推奨）

1. Cloudflareダッシュボード: **Workers & Pages** → **D1**
2. `passport24-voucher-production` を選択
3. **Console** タブを開く
4. 以下のマイグレーションを順番に実行:

```
migrations/0001_initial_schema.sql
migrations/0002_add_email_field.sql
migrations/0003_add_kana_field.sql
migrations/0004_lottery_system.sql
migrations/0005_admin_users.sql
migrations/0006_email_logs.sql
migrations/0007_add_reservation_phase.sql
migrations/0008_add_pickup_tracking.sql
migrations/0009_add_excluded_fields.sql
migrations/0010_update_store_master.sql
migrations/0011_remove_karashima_stores.sql
migrations/0012_consolidate_stores.sql
migrations/0013_update_store_name_ichinobey.sql
migrations/0014_fix_store_master_table.sql
migrations/0015_simplify_usage_description.sql
migrations/0016_change_quantity_limit_to_3.sql
```

各ファイルの内容をコピー&ペーストして実行してください。

### オプション2: Wrangler CLI

適切な権限を持つAPIトークンを取得後:

```bash
export CLOUDFLARE_API_TOKEN="your_new_token_with_d1_permissions"
cd /home/user/webapp
npx wrangler d1 migrations apply passport24-voucher-production --remote
```

---

## ✅ デプロイ確認チェックリスト

デプロイ完了後、以下を確認してください:

- [ ] https://tsuboi-premium.pages.dev/ にアクセスできる
- [ ] トップページが表示される
- [ ] 冊数選択が1～3冊
- [ ] 店舗名「一畳屋ショールーム」が表示される
- [ ] 予約フォームが動作する
- [ ] D1バインディングが設定されている
- [ ] KVバインディングが設定されている
- [ ] D1マイグレーションが適用されている
- [ ] 管理画面にログインできる（urbandirection/urbandirection）
- [ ] テスト予約でメールが届く

---

## 🔗 重要なURL

### 本番環境:
- **トップページ**: https://tsuboi-premium.pages.dev/
- **管理画面**: https://tsuboi-premium.pages.dev/admin
- **予約照会**: https://tsuboi-premium.pages.dev/lookup
- **抽選結果**: https://tsuboi-premium.pages.dev/lottery-results

### GitHub:
- **リポジトリ**: https://github.com/infourbandirection-spec/tsuboi-premium
- **コミット履歴**: https://github.com/infourbandirection-spec/tsuboi-premium/commits/main

### Cloudflare:
- **ダッシュボード**: https://dash.cloudflare.com/
- **Pages管理**: https://dash.cloudflare.com/e74e780cd3e5705ede60a66c07a3d2bb/pages
- **D1データベース**: https://dash.cloudflare.com/e74e780cd3e5705ede60a66c07a3d2bb/workers/d1

---

## 🎯 次のステップ

1. **Cloudflareダッシュボードで上記手順を実行**
2. **D1とKVのバインディングを設定**
3. **D1マイグレーションを適用**
4. **動作確認を実施**

---

## 📞 トラブルシューティング

### ビルドエラーが発生した場合:

- Node.jsバージョン: 18.x 以上を使用
- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `dist`

### D1バインディングが見つからない場合:

D1データベースは既に作成済み:
- 名前: `passport24-voucher-production`
- ID: `92ba7506-598f-4bb2-baf8-40d07a379224`

Cloudflare D1ダッシュボードから確認してください。

### KVバインディングが見つからない場合:

KVネームスペースも作成済み:
- `CSRF_TOKENS`: 620dcfa3ae4e4c7bbf155e07c1840a93
- `RATE_LIMIT`: 8d09805b2d1b4b3db141bbe067e34537

---

**準備完了！Cloudflareダッシュボードから連携を開始してください。** 🚀

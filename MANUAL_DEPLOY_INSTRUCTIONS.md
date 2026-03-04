# 手動デプロイ手順書

## 📋 概要

**プロジェト名**: tsuboi-premium  
**本番URL**: https://tsuboi-premium.pages.dev/  
**実施日**: 2026-03-04  
**バージョン**: v2.4.0

---

## ✅ 準備完了項目

- [x] Resend APIキー設定完了（`re_C4xHhJzX_F3z8NPPUR26bRxWTVtehDrVT`）
- [x] ローカル環境でメール送信テスト成功（3種類のメール）
- [x] プロジェクト名を`tsuboi-premium`に変更
- [x] ビルド完了（dist/ディレクトリ準備済み）
- [x] デプロイ用アーカイブ作成（`tsuboi-premium-dist.tar.gz`）

---

## 🚀 Cloudflareダッシュボードからの手動デプロイ手順

### ステップ1: Cloudflareダッシュボードにログイン

1. https://dash.cloudflare.com/ にアクセス
2. メールアドレス: `info.urbandirection@gmail.com`
3. アカウントID: `e74e780cd3e5705ede60a66c07a3d2bb`

### ステップ2: Pagesプロジェクトを作成

1. 左側メニュー: **Workers & Pages** をクリック
2. **Create application** ボタンをクリック
3. **Pages** タブを選択
4. **Connect to Git** または **Upload assets** を選択

#### オプションA: GitHubリポジトリから（推奨）

1. **Connect to Git** を選択
2. GitHubアカウントを接続
3. リポジトリを選択: `webapp`（または適切なリポジトリ名）
4. プロジェクト設定:
   - **Project name**: `tsuboi-premium`
   - **Production branch**: `main`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
5. **Environment variables** を設定:
   - `RESEND_API_KEY`: `re_C4xHhJzX_F3z8NPPUR26bRxWTVtehDrVT`
   - `RESEND_FROM_EMAIL`: `info@urbandirection.jp`
6. **Save and Deploy** をクリック

#### オプションB: Zipファイルをアップロード（シンプル）

1. **Upload assets** を選択
2. プロジェクト名: `tsuboi-premium`
3. `dist/`フォルダをZIP化してアップロード
   ```bash
   cd /home/user/webapp/dist
   zip -r ../tsuboi-premium-dist.zip .
   ```
4. ZIPファイルをドラッグ&ドロップ
5. **Deploy site** をクリック

### ステップ3: D1データベースをバインド

1. プロジェクト設定: **Settings** → **Functions**
2. **D1 database bindings** セクション:
   - **Add binding** をクリック
   - Variable name: `DB`
   - D1 database: `passport24-voucher-production`
   - Database ID: `92ba7506-598f-4bb2-baf8-40d07a379224`
3. **Save** をクリック

### ステップ4: KV namespaceをバインド

1. 同じ **Functions** ページで **KV namespace bindings** セクション:
2. **Add binding** を2回実行:
   
   **Binding 1:**
   - Variable name: `CSRF_TOKENS`
   - KV namespace ID: `620dcfa3ae4e4c7bbf155e07c1840a93`
   
   **Binding 2:**
   - Variable name: `RATE_LIMIT`
   - KV namespace ID: `8d09805b2d1b4b3db141bbe067e34537`

3. **Save** をクリック

### ステップ5: 環境変数を設定（GitHubデプロイの場合はスキップ）

1. **Settings** → **Environment variables**
2. **Production (Global)** タブで **Add variables** をクリック:
   - Variable name: `RESEND_API_KEY`
   - Value: `re_C4xHhJzX_F3z8NPPUR26bRxWTVtehDrVT`
   - Type: `Secret` (Encrypt)
3. もう一つ追加:
   - Variable name: `RESEND_FROM_EMAIL`
   - Value: `info@urbandirection.jp`
   - Type: `Text` (Plain text)
4. **Save** をクリック

### ステップ6: D1マイグレーションを適用

**重要**: D1データベースのマイグレーションはCLIから実行する必要があります。

#### オプション1: wrangler d1 execute コマンド（推奨）

Cloudflare D1 Databaseダッシュボードから:
1. `passport24-voucher-production` データベースを選択
2. **Console** タブを開く
3. 各マイグレーションファイルの内容をコピー&ペーストして実行

**マイグレーションファイル一覧（順番に実行）:**
1. `migrations/0001_initial_schema.sql` - 初期スキーマ
2. `migrations/0002_add_email_field.sql` - メールフィールド追加
3. `migrations/0003_add_kana_field.sql` - カナフィールド追加
4. `migrations/0004_lottery_system.sql` - 抽選システム
5. `migrations/0005_admin_users.sql` - 管理者ユーザー
6. `migrations/0006_email_logs.sql` - メールログ
7. `migrations/0007_add_reservation_phase.sql` - 予約フェーズ
8. `migrations/0008_add_pickup_tracking.sql` - 受取追跡
9. `migrations/0009_add_excluded_fields.sql` - 除外フィールド
10. `migrations/0010_update_store_master.sql` - 店舗マスター更新
11. `migrations/0011_remove_karashima_stores.sql` - 辛島店舗削除
12. `migrations/0012_consolidate_stores.sql` - 店舗統合
13. `migrations/0013_update_store_name_ichinobey.sql` - 店舗名変更
14. `migrations/0014_fix_store_master_table.sql` - 店舗マスター修正
15. `migrations/0015_simplify_usage_description.sql` - 使用方法簡素化
16. `migrations/0016_change_quantity_limit_to_3.sql` - 冊数上限変更（6→3）

#### オプション2: APIトークン権限更新後にCLI実行

新しいAPIトークンを取得後:
```bash
export CLOUDFLARE_API_TOKEN="your_new_token_with_permissions"
cd /home/user/webapp
npx wrangler d1 migrations apply passport24-voucher-production --remote
```

### ステップ7: デプロイ完了後の確認

1. **サイトアクセス確認**:
   ```bash
   curl https://tsuboi-premium.pages.dev/
   curl https://tsuboi-premium.pages.dev/api/status
   ```

2. **動作確認項目**:
   - [ ] トップページが表示される
   - [ ] 冊数選択が1～3冊まで
   - [ ] 店舗名が「一畳屋ショールーム」
   - [ ] 予約フォームが動作する
   - [ ] 管理画面にログインできる（user: urbandirection, pass: urbandirection）
   - [ ] メール送信が動作する

3. **管理画面アクセス**:
   - URL: https://tsuboi-premium.pages.dev/admin
   - ユーザー名: `urbandirection`
   - パスワード: `urbandirection`

---

## 📧 メール自動送信の確認

### 送信されるメール種類:

1. **予約完了メール**
   - タイミング: 予約完了直後
   - 件名: "坪井繁栄会 プレミアム商品券 予約完了のお知らせ"
   - 内容: 予約番号、冊数、受取店舗、受取日時

2. **抽選結果メール（当選）**
   - タイミング: 抽選実行後（管理画面から）
   - 件名: "坪井繁栄会 プレミアム商品券 抽選結果のお知らせ（当選）"
   - 内容: 当選通知、受取情報

3. **抽選結果メール（落選）**
   - タイミング: 抽選実行後（管理画面から）
   - 件名: "坪井繁栄会 プレミアム商品券 抽選結果のお知らせ（落選）"
   - 内容: 落選通知、次回募集案内

### メール送信ログの確認:

管理画面の「メールログ」機能で送信履歴を確認できます:
- 送信日時
- 送信先メールアドレス
- メールタイプ
- 送信ステータス（成功/失敗）

---

## 🔧 トラブルシューティング

### D1データベースが見つからない場合:

```bash
# データベース一覧を確認
npx wrangler d1 list

# 新規作成が必要な場合
npx wrangler d1 create passport24-voucher-production
```

### KVネームスペースが見つからない場合:

```bash
# KV一覧を確認
npx wrangler kv:namespace list

# 新規作成が必要な場合
npx wrangler kv:namespace create CSRF_TOKENS
npx wrangler kv:namespace create RATE_LIMIT
```

### メール送信が失敗する場合:

1. Resend APIキーが正しく設定されているか確認
2. 送信元ドメイン（urbandirection.jp）が認証済みか確認
3. 環境変数が正しくバインドされているか確認

---

## 📞 サポート情報

- **Cloudflareダッシュボード**: https://dash.cloudflare.com/
- **アカウントID**: e74e780cd3e5705ede60a66c07a3d2bb
- **Resendダッシュボード**: https://resend.com/emails
- **ローカル開発環境**: https://3000-itmjkthfk3ozh09m7l6pn-c81df28e.sandbox.novita.ai/

---

## 📝 デプロイ後のチェックリスト

- [ ] サイトが https://tsuboi-premium.pages.dev/ でアクセスできる
- [ ] 予約フォームで1～3冊選択できる
- [ ] 店舗名が「一畳屋ショールーム」と表示される
- [ ] 予約が正常に完了する
- [ ] 予約完了メールが届く
- [ ] 管理画面にログインできる（urbandirection/urbandirection）
- [ ] 予約一覧が表示される
- [ ] 抽選実行機能が動作する
- [ ] 抽選結果メールが送信される
- [ ] メールログが記録される

---

**Git コミット**: 689eb4c  
**ビルドサイズ**: 107.16 KB  
**ローカルテスト**: ✅ 全て成功

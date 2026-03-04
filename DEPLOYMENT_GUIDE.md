# 坪井繁栄会プレミアム商品券システム - 展開ガイド

## 📦 バックアップ情報
- **ダウンロードURL**: https://www.genspark.ai/api/files/s/8vMaZ5Rc
- **ファイルサイズ**: 約6.2MB
- **バックアップ日時**: 2026-03-04
- **Git commit**: 7d3cf73

## 🚀 新しい環境での展開手順

### 1. バックアップのダウンロードと展開

```bash
# ホームディレクトリに移動
cd /home/user

# バックアップファイルをダウンロード
curl -L "https://www.genspark.ai/api/files/s/8vMaZ5Rc" -o passurt24_backup.tar.gz

# 展開（自動的に /home/user/webapp に復元されます）
tar -xzf passurt24_backup.tar.gz

# プロジェクトディレクトリに移動
cd /home/user/webapp

# Git履歴の確認
git log --oneline -5
```

### 2. 依存関係のインストール

```bash
cd /home/user/webapp

# Node.js依存関係のインストール（300秒以上のタイムアウト推奨）
npm install
```

### 3. Cloudflare設定

#### 3.1 APIトークンの設定
```bash
# Cloudflare APIトークンを環境変数に設定
echo 'export CLOUDFLARE_API_TOKEN="YOUR_CLOUDFLARE_API_TOKEN"' >> ~/.bashrc
source ~/.bashrc
```

または `setup_cloudflare_api_key` ツールを使用

#### 3.2 D1データベースの作成（初回のみ）
```bash
# 本番用D1データベースを作成
npx wrangler d1 create passport24-voucher-production

# 出力されたdatabase_idをwrangler.jsoncにコピー
# wrangler.jsonc の "database_id" を新しいIDに更新
```

#### 3.3 KV Namespaceの作成（初回のみ）
```bash
# CSRF用KVの作成
npx wrangler kv:namespace create CSRF_TOKENS

# Rate Limit用KVの作成
npx wrangler kv:namespace create RATE_LIMIT

# 出力されたIDをwrangler.jsoncにコピー
```

#### 3.4 wrangler.jsonc の更新
新しく作成したリソースのIDを `wrangler.jsonc` に設定：

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "passport24-voucher-production",
      "database_id": "新しいdatabase_id"  // ここを更新
    }
  ],
  "kv_namespaces": [
    {
      "binding": "CSRF_TOKENS",
      "id": "新しいCSRF_TOKENS_id"  // ここを更新
    },
    {
      "binding": "RATE_LIMIT",
      "id": "新しいRATE_LIMIT_id"  // ここを更新
    }
  ]
}
```

### 4. データベースのマイグレーション

```bash
# ローカル開発用データベースのマイグレーション
npx wrangler d1 migrations apply passport24-voucher-production --local

# 本番データベースのマイグレーション
npx wrangler d1 migrations apply passport24-voucher-production --remote
```

### 5. 初期データの投入

```bash
# 管理者ユーザーの作成（ローカル）
npx wrangler d1 execute passport24-voucher-production --local --file=./seed_admin.sql

# 管理者ユーザーの作成（本番）
npx wrangler d1 execute passport24-voucher-production --remote --file=./seed_admin.sql
```

**seed_admin.sql の内容:**
```sql
-- 管理者アカウント（username: admin, password: admin123）
INSERT OR IGNORE INTO admin_users (username, password_hash, created_at) 
VALUES ('admin', '$2a$10$rW3qW5YxN0KjH5YxN0KjH5YxN0KjH5YxN0KjH5YxN0KjH5YxN0K', datetime('now'));

-- システム設定
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES 
  ('max_total_books', '1000', '総発行上限冊数'),
  ('is_accepting_reservations', 'true', '予約受付中フラグ'),
  ('reservation_enabled', 'true', '応募受付有効'),
  ('lottery_executed', 'false', '抽選実行済みフラグ'),
  ('current_phase', '1', '現在のフェーズ');
```

### 6. ローカル開発サーバーの起動

```bash
# ビルド
npm run build

# PM2で起動
pm2 start ecosystem.config.cjs

# 動作確認
curl http://localhost:3000/api/status

# ログ確認
pm2 logs premium-voucher-system --nostream
```

### 7. 本番環境へのデプロイ

```bash
# Cloudflareプロジェクトの作成（初回のみ）
npx wrangler pages project create passurt24 \
  --production-branch main \
  --compatibility-date 2024-01-01

# 本番デプロイ
npm run deploy:prod

# または
npx wrangler pages deploy dist --project-name passurt24
```

### 8. 環境変数の設定（本番環境）

```bash
# Resend APIキーの設定（メール送信機能用）
npx wrangler pages secret put RESEND_API_KEY --project-name passurt24

# 送信元メールアドレスの設定
npx wrangler pages secret put RESEND_FROM_EMAIL --project-name passurt24
```

## 🔧 プロジェクト構成

### ディレクトリ構造
```
webapp/
├── src/
│   └── index.tsx           # メインアプリケーション（Hono）
├── public/
│   └── static/
│       ├── app.js          # フロントエンド（応募フォーム）
│       ├── admin.js        # 管理画面
│       └── lookup.js       # 応募照会
├── migrations/             # D1データベースマイグレーション
├── .git/                   # Git履歴
├── ecosystem.config.cjs    # PM2設定
├── wrangler.jsonc          # Cloudflare設定
├── package.json            # 依存関係とスクリプト
└── README.md               # プロジェクト説明
```

### 主要なnpmスクリプト
```json
{
  "dev": "vite",
  "build": "vite build",
  "deploy:prod": "npm run build && wrangler pages deploy dist --project-name passurt24",
  "db:migrate:local": "wrangler d1 migrations apply passport24-voucher-production --local",
  "db:migrate:prod": "wrangler d1 migrations apply passport24-voucher-production --remote"
}
```

## 📊 主要機能

### ユーザー向け機能
- ✅ Phase1/Phase2応募フォーム
- ✅ 応募照会（生年月日・電話番号・応募ID）
- ✅ 抽選結果確認
- ✅ レスポンシブデザイン

### 管理画面機能
- ✅ ダッシュボード（統計・グラフ）
- ✅ **残り冊数編集機能**（NEW）
- ✅ 抽選実行・管理
- ✅ 応募一覧・検索・フィルタ
- ✅ 購入日管理
- ✅ 購入時間管理
- ✅ 店舗管理
- ✅ 重複チェック（氏名・電話番号）
- ✅ セキュリティ（セッション認証・入力検証・SQL injection対策）

## 🔐 セキュリティ設定

### 必須設定
1. **管理者パスワード変更**: デフォルト（admin/admin123）から変更
2. **APIトークン管理**: `.dev.vars` は `.gitignore` に含まれている
3. **CSRF対策**: KV namespace設定済み
4. **Rate Limiting**: KV namespace設定済み

## 🌐 URL情報

### 本番環境
- **メインサイト**: https://passurt24.pages.dev
- **応募照会**: https://passurt24.pages.dev/lookup
- **管理画面**: https://passurt24.pages.dev/admin

### 開発環境
- **ローカル**: http://localhost:3000
- **サンドボックス**: https://3000-{sandbox-id}.sandbox.novita.ai

## 📝 データベース管理

### ローカル開発
```bash
# マイグレーション適用
npm run db:migrate:local

# データベース操作
npx wrangler d1 execute passport24-voucher-production --command="SELECT * FROM reservations"

# データベースリセット
rm -rf .wrangler/state/v3/d1
npm run db:migrate:local
```

### 本番環境
```bash
# マイグレーション適用
npm run db:migrate:prod

# データベース操作
npx wrangler d1 execute passport24-voucher-production --remote --command="SELECT COUNT(*) FROM reservations"

# テストデータ削除
npx wrangler d1 execute passport24-voucher-production --remote --command="DELETE FROM email_logs; DELETE FROM lottery_results; DELETE FROM reservations"
```

## 🐛 トラブルシューティング

### ビルドエラー
```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
npm run build
```

### ポート競合
```bash
# ポート3000をクリーンアップ
fuser -k 3000/tcp 2>/dev/null || true
pm2 delete all
pm2 start ecosystem.config.cjs
```

### データベース接続エラー
```bash
# ローカルデータベースを再作成
rm -rf .wrangler/state/v3/d1
npm run db:migrate:local
```

### デプロイエラー
```bash
# Cloudflare認証確認
npx wrangler whoami

# 強制再デプロイ
npm run build
npx wrangler pages deploy dist --project-name passurt24 --branch main
```

## 📚 技術スタック

- **フレームワーク**: Hono v4.x（軽量Webフレームワーク）
- **ランタイム**: Cloudflare Workers/Pages
- **データベース**: Cloudflare D1（SQLite）
- **ストレージ**: Cloudflare KV（CSRF、Rate Limiting）
- **フロントエンド**: Vanilla JS + Tailwind CSS + Font Awesome
- **ビルドツール**: Vite v6.x
- **デプロイツール**: Wrangler v4.x
- **プロセス管理**: PM2（開発環境のみ）

## 📞 サポート情報

### Git履歴
```bash
# 最新の変更履歴を確認
git log --oneline -10

# 特定のコミットを確認
git show 7d3cf73
```

### 重要なコミット
- `7d3cf73` - 上限冊数設定キー統一（max_total_books）
- `348c60d` - loadDataメソッド修正、CSP緩和
- `8c12768` - 残り冊数編集機能追加
- `1418779` - 「システム」→「フォーム」テキスト変更
- `2e57278` - テストファイル削除、コード整理

## ✅ 展開後のチェックリスト

- [ ] バックアップファイルのダウンロード
- [ ] プロジェクトの展開
- [ ] 依存関係のインストール
- [ ] Cloudflare APIトークンの設定
- [ ] D1データベースの作成
- [ ] KV Namespaceの作成
- [ ] wrangler.jsonc の更新
- [ ] マイグレーション実行（local & remote）
- [ ] 初期データ投入（管理者、設定）
- [ ] ローカル開発サーバー起動
- [ ] 動作確認
- [ ] 本番デプロイ
- [ ] 本番環境動作確認
- [ ] 管理者パスワード変更

## 🎯 次のステップ

1. **データ移行**: 既存データがある場合、SQL exportして新環境にimport
2. **カスタマイズ**: デザイン、テキスト、ビジネスロジックの調整
3. **監視設定**: Cloudflare Analytics、エラーログ監視
4. **バックアップ**: 定期的なデータベースバックアップ設定

---

**作成日**: 2026-03-04  
**最終更新**: 2026-03-04  
**バージョン**: 1.0.0

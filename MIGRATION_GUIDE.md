# 📋 別の開発チャットでの展開手順

## 🎯 バックアップファイル

**最新版ダウンロードURL:**
```
https://www.genspark.ai/api/files/s/jxkmc8gw
```

**ファイル情報:**
- サイズ: 約6.2MB
- バージョン: v2.2.0
- 作成日: 2026-03-04
- Git commit: b622a33

---

## 🚀 新しいチャットで実行するコマンド

### 方法1: 自動展開（推奨）

新しいチャットで以下をコピー&ペーストしてください：

```bash
# プロジェクトのダウンロードと展開
cd /home/user
curl -L "https://www.genspark.ai/api/files/s/jxkmc8gw" -o passurt24.tar.gz
tar -xzf passurt24.tar.gz
cd /home/user/webapp

# 自動セットアップ実行
chmod +x deploy.sh
./deploy.sh
```

このスクリプトが自動的に以下を実行します：
1. ✅ プロジェクトの展開確認
2. ✅ Git履歴の確認
3. ✅ npm依存関係のインストール
4. ✅ プロジェクトのビルド
5. ✅ 次のステップの表示

---

### 方法2: 手動展開

```bash
# 1. ダウンロード
cd /home/user
curl -L "https://www.genspark.ai/api/files/s/jxkmc8gw" -o passurt24.tar.gz

# 2. 展開
tar -xzf passurt24.tar.gz
cd /home/user/webapp

# 3. 依存関係インストール（300秒タイムアウト推奨）
npm install

# 4. ビルド
npm run build
```

---

## ⚙️ Cloudflare設定（必須）

```bash
# Cloudflare APIトークン設定
export CLOUDFLARE_API_TOKEN='あなたのトークン'
echo 'export CLOUDFLARE_API_TOKEN="あなたのトークン"' >> ~/.bashrc
source ~/.bashrc

# D1データベース作成
npx wrangler d1 create passport24-voucher-production
# → 出力されたdatabase_idをコピー

# KV Namespace作成
npx wrangler kv:namespace create CSRF_TOKENS
# → 出力されたidをコピー
npx wrangler kv:namespace create RATE_LIMIT
# → 出力されたidをコピー
```

**wrangler.jsonc を編集:**
```jsonc
{
  "d1_databases": [
    {
      "database_id": "ここに新しいdatabase_id"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "CSRF_TOKENS",
      "id": "ここに新しいCSRF_TOKENS_id"
    },
    {
      "binding": "RATE_LIMIT",
      "id": "ここに新しいRATE_LIMIT_id"
    }
  ]
}
```

**マイグレーション実行:**
```bash
npm run db:migrate:local
npm run db:migrate:prod
```

---

## 🏃 起動とデプロイ

```bash
# ローカル開発サーバー起動
pm2 start ecosystem.config.cjs

# 動作確認
curl http://localhost:3000/api/status

# 本番デプロイ
npm run deploy:prod
```

---

## ✅ 展開完了後の確認

### URLアクセス確認
- ✅ メイン: https://passurt24.pages.dev
- ✅ 管理: https://passurt24.pages.dev/admin
- ✅ 照会: https://passurt24.pages.dev/lookup

### 機能確認
- ✅ 応募フォームが表示される
- ✅ 管理画面にログインできる（admin/admin123）
- ✅ ダッシュボードが表示される
- ✅ **残り冊数の「上限編集」ボタンが機能する**
- ✅ 統計グラフが表示される

---

## 📚 含まれているドキュメント

プロジェクト内の以下のファイルを参照：

1. **README.md** - プロジェクト全体の説明
2. **DEPLOYMENT_GUIDE.md** - 詳細な展開手順
3. **QUICKSTART.md** - クイックスタートガイド
4. **deploy.sh** - 自動展開スクリプト

---

## 🎁 含まれているもの

### ソースコード
- ✅ src/index.tsx（メインアプリケーション）
- ✅ public/static/app.js（応募フォーム）
- ✅ public/static/admin.js（管理画面）
- ✅ public/static/lookup.js（応募照会）

### 設定ファイル
- ✅ wrangler.jsonc（Cloudflare設定）
- ✅ package.json（依存関係）
- ✅ ecosystem.config.cjs（PM2設定）
- ✅ vite.config.ts（ビルド設定）
- ✅ tsconfig.json（TypeScript設定）

### データベース
- ✅ migrations/（D1マイグレーション）
- ✅ .wrangler/（ローカルDB、Git管理外）

### Git履歴
- ✅ .git/（全コミット履歴）
- ✅ 最新commit: b622a33

---

## 🔧 カスタマイズ

展開後、以下をカスタマイズできます：

1. **プロジェクト名**: wrangler.jsonc の `name` を変更
2. **上限冊数**: 管理画面から変更可能（デフォルト: 990冊）
3. **店舗情報**: DBで直接編集
4. **購入日時**: 管理画面から追加/編集
5. **デザイン**: Tailwind CSSクラスで調整

---

## 💬 新しいチャットでのメッセージ例

新しいチャットを開いて、以下のようにメッセージを送信してください：

```
パスート24システムを展開したいです。
バックアップURL: https://www.genspark.ai/api/files/s/jxkmc8gw

以下のコマンドを実行してください：
cd /home/user
curl -L "https://www.genspark.ai/api/files/s/jxkmc8gw" -o passurt24.tar.gz
tar -xzf passurt24.tar.gz
cd /home/user/webapp
chmod +x deploy.sh
./deploy.sh
```

スクリプト実行後、画面の指示に従ってCloudflare設定を完了させてください。

---

**所要時間**: 約10分  
**必要なもの**: Cloudflare APIトークン  
**サポート**: DEPLOYMENT_GUIDE.md 参照

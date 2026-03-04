# 🚀 クイックスタートガイド

別の開発チャットで即座にシステムを展開する方法

## 📦 バックアップファイル

**最新版（v2.2.0）**:
```
https://www.genspark.ai/api/files/s/3cN4xwNT
```

サイズ: 約6.2MB  
日時: 2026-03-04  
Git commit: a59b94c

## ⚡ 3ステップ展開

### Step 1: ダウンロードして展開（1分）

新しいチャットで以下のコマンドを実行：

```bash
# 自動展開スクリプトをダウンロード
cd /home/user
curl -L "https://www.genspark.ai/api/files/s/3cN4xwNT" -o passurt24_backup.tar.gz

# 展開
tar -xzf passurt24_backup.tar.gz
cd /home/user/webapp

# 自動セットアップ実行
chmod +x deploy.sh
./deploy.sh
```

これで以下が自動実行されます：
- ✅ プロジェクトの展開
- ✅ Git履歴の確認
- ✅ 依存関係のインストール
- ✅ プロジェクトのビルド

### Step 2: Cloudflare設定（5分）

```bash
# 1. APIトークン設定
export CLOUDFLARE_API_TOKEN='your-token-here'
echo 'export CLOUDFLARE_API_TOKEN="your-token"' >> ~/.bashrc
source ~/.bashrc

# 2. D1データベース作成
npx wrangler d1 create passport24-voucher-production
# → database_idをコピー

# 3. KV Namespace作成
npx wrangler kv:namespace create CSRF_TOKENS
# → idをコピー
npx wrangler kv:namespace create RATE_LIMIT
# → idをコピー

# 4. wrangler.jsoncを編集
# database_id と kv_namespaces[].id を更新

# 5. マイグレーション実行
npm run db:migrate:local
npm run db:migrate:prod
```

### Step 3: 起動とデプロイ（2分）

```bash
# ローカル起動
pm2 start ecosystem.config.cjs

# 動作確認
curl http://localhost:3000/api/status

# 本番デプロイ
npm run deploy:prod
```

## ✅ 完了！

システムが稼働しました：
- 🌐 本番: https://passurt24.pages.dev
- 🔧 管理: https://passurt24.pages.dev/admin
- 🔍 照会: https://passurt24.pages.dev/lookup

管理者ログイン: `admin` / `admin123`

---

詳細な手順は `DEPLOYMENT_GUIDE.md` を参照してください。

## 🎯 主要機能チェックリスト

展開後、以下の機能が動作することを確認：

- [ ] メインページ表示
- [ ] 応募フォーム動作
- [ ] 応募照会機能
- [ ] 管理画面ログイン
- [ ] ダッシュボード表示
- [ ] **残り冊数編集機能**（NEW!）
- [ ] 抽選実行機能
- [ ] 購入日時管理
- [ ] 重複チェック

## 💡 トラブルシューティング

### ビルドエラー
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### データベースエラー
```bash
rm -rf .wrangler
npm run db:migrate:local
```

### ポート競合
```bash
fuser -k 3000/tcp 2>/dev/null || true
pm2 delete all
pm2 start ecosystem.config.cjs
```

---

**所要時間**: 約10分  
**難易度**: ⭐⭐☆☆☆（中級）

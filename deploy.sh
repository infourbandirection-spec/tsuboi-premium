#!/bin/bash
# 坪井繁栄会システム - 簡易展開スクリプト
# このスクリプトは新しい開発環境で自動的にプロジェクトをセットアップします

set -e  # エラーで停止

echo "================================================"
echo "  坪井繁栄会プレミアム商品券システム 展開"
echo "================================================"
echo ""

# 1. バックアップのダウンロード
echo "📦 Step 1: バックアップファイルのダウンロード..."
cd /home/user
curl -L "https://www.genspark.ai/api/files/s/8vMaZ5Rc" -o passurt24_backup.tar.gz
echo "✅ ダウンロード完了"
echo ""

# 2. 展開
echo "📂 Step 2: プロジェクトの展開..."
tar -xzf passurt24_backup.tar.gz
cd /home/user/webapp
echo "✅ 展開完了"
echo ""

# 3. Git確認
echo "🔍 Step 3: Git履歴の確認..."
git log --oneline -5
echo ""

# 4. 依存関係のインストール
echo "📦 Step 4: 依存関係のインストール（これには数分かかります）..."
npm install
echo "✅ インストール完了"
echo ""

# 5. PM2設定確認
echo "🔧 Step 5: PM2設定の確認..."
if [ -f "ecosystem.config.cjs" ]; then
    echo "✅ ecosystem.config.cjs が見つかりました"
else
    echo "⚠️ ecosystem.config.cjs が見つかりません"
fi
echo ""

# 6. ビルド
echo "🏗️  Step 6: プロジェクトのビルド..."
npm run build
echo "✅ ビルド完了"
echo ""

# 7. 完了メッセージ
echo "================================================"
echo "  ✅ 展開完了！"
echo "================================================"
echo ""
echo "📋 次の手順:"
echo ""
echo "1. Cloudflare APIトークンの設定:"
echo "   export CLOUDFLARE_API_TOKEN='your-token-here'"
echo "   echo 'export CLOUDFLARE_API_TOKEN=\"your-token\"' >> ~/.bashrc"
echo ""
echo "2. D1データベースとKVの作成:"
echo "   npx wrangler d1 create passport24-voucher-production"
echo "   npx wrangler kv:namespace create CSRF_TOKENS"
echo "   npx wrangler kv:namespace create RATE_LIMIT"
echo ""
echo "3. wrangler.jsonc のID更新:"
echo "   - database_id"
echo "   - kv_namespaces[].id"
echo ""
echo "4. マイグレーション実行:"
echo "   npm run db:migrate:local"
echo "   npm run db:migrate:prod"
echo ""
echo "5. ローカルサーバー起動:"
echo "   pm2 start ecosystem.config.cjs"
echo "   curl http://localhost:3000/api/status"
echo ""
echo "6. 本番デプロイ:"
echo "   npm run deploy:prod"
echo ""
echo "詳細は DEPLOYMENT_GUIDE.md をご確認ください"
echo ""
echo "📍 プロジェクトパス: /home/user/webapp"
echo "🌐 本番URL: https://passurt24.pages.dev"
echo "👤 デフォルト管理者: admin / admin123"
echo ""

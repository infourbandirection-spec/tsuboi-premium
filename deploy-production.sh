#!/bin/bash

# 本番環境デプロイスクリプト
# Passurt24 Premium Voucher System - Production Deployment

set -e  # エラー時に停止

echo "=================================================="
echo "坪井繁栄会 プレミアム商品券予約システム"
echo "本番環境デプロイスクリプト v2.4.0"
echo "=================================================="
echo ""

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_NAME="tsuboi-premium"
DB_NAME="passport24-voucher-production"

echo "Step 1: 認証確認"
echo "----------------------------"
if npx wrangler whoami; then
    echo -e "${GREEN}✓ Cloudflare認証成功${NC}"
else
    echo -e "${RED}✗ Cloudflare認証失敗${NC}"
    echo "CLOUDFLARE_API_TOKEN が正しく設定されているか確認してください"
    echo "詳細: PRODUCTION_SETUP.md を参照"
    exit 1
fi
echo ""

echo "Step 2: プロジェクトビルド"
echo "----------------------------"
npm run build
echo -e "${GREEN}✓ ビルド完了${NC}"
echo ""

echo "Step 3: 本番D1データベースへマイグレーション適用"
echo "----------------------------"
echo "⚠️  データベースに16個のマイグレーションを適用します"
echo "   既存データがある場合、バックアップを取ることを推奨します"
read -p "続行しますか？ (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if npx wrangler d1 migrations apply $DB_NAME --remote; then
        echo -e "${GREEN}✓ マイグレーション適用完了${NC}"
    else
        echo -e "${YELLOW}⚠️  マイグレーション適用に失敗またはスキップされました${NC}"
        echo "既にマイグレーションが適用されている可能性があります"
    fi
else
    echo "マイグレーション適用をスキップしました"
fi
echo ""

echo "Step 4: Cloudflare Pagesにデプロイ"
echo "----------------------------"
if npx wrangler pages deploy dist --project-name $PROJECT_NAME --branch main; then
    echo -e "${GREEN}✓ デプロイ完了${NC}"
    echo ""
    echo "🎉 デプロイ成功！"
    echo ""
    echo "📍 アクセスURL:"
    echo "   本番環境: https://$PROJECT_NAME.pages.dev/"
    echo "   管理画面: https://$PROJECT_NAME.pages.dev/admin"
    echo "   応募照会: https://$PROJECT_NAME.pages.dev/lookup"
    echo "   抽選結果: https://$PROJECT_NAME.pages.dev/lottery-results"
else
    echo -e "${RED}✗ デプロイ失敗${NC}"
    echo "詳細: PRODUCTION_SETUP.md を参照"
    exit 1
fi
echo ""

echo "Step 5: 環境変数の設定確認"
echo "----------------------------"
echo "⚠️  以下の環境変数が本番環境に設定されているか確認してください："
echo ""
echo "必須:"
echo "  - RESEND_API_KEY (Resend APIキー、re_で始まる)"
echo "  - RESEND_FROM_EMAIL (info@urbandirection.jp)"
echo ""
echo "シークレットを確認:"
npx wrangler pages secret list --project-name $PROJECT_NAME || echo "シークレット一覧の取得に失敗しました"
echo ""
echo "シークレットを設定する場合:"
echo "  npx wrangler pages secret put RESEND_API_KEY --project-name $PROJECT_NAME"
echo "  npx wrangler pages secret put RESEND_FROM_EMAIL --project-name $PROJECT_NAME"
echo ""

echo "Step 6: 動作確認"
echo "----------------------------"
echo "システムステータスを確認中..."
sleep 5  # デプロイ反映待ち
if curl -s https://$PROJECT_NAME.pages.dev/api/status | grep -q "success"; then
    echo -e "${GREEN}✓ APIが正常に動作しています${NC}"
    curl -s https://$PROJECT_NAME.pages.dev/api/status | jq
else
    echo -e "${YELLOW}⚠️  APIの応答を確認できませんでした（デプロイ反映待ちの可能性）${NC}"
    echo "数分後に以下のURLで確認してください："
    echo "https://$PROJECT_NAME.pages.dev/api/status"
fi
echo ""

echo "店舗情報を確認中..."
if curl -s https://$PROJECT_NAME.pages.dev/api/stores | grep -q "一畳屋ショールーム"; then
    echo -e "${GREEN}✓ 店舗情報が正しく設定されています${NC}"
    curl -s https://$PROJECT_NAME.pages.dev/api/stores | jq
else
    echo -e "${YELLOW}⚠️  店舗情報の確認に失敗しました${NC}"
fi
echo ""

echo "=================================================="
echo "デプロイ完了チェックリスト"
echo "=================================================="
echo ""
echo "✓ 必須確認事項:"
echo "  □ https://$PROJECT_NAME.pages.dev/ にアクセスできる"
echo "  □ フォームで冊数1～3が選択できる"
echo "  □ 店舗名が「一畳屋ショールーム」になっている"
echo "  □ 管理画面（/admin）にログインできる（urbandirection/urbandirection）"
echo "  □ RESEND_API_KEY が設定されている"
echo "  □ RESEND_FROM_EMAIL が設定されている"
echo ""
echo "✓ メール送信テスト:"
echo "  1. テスト予約を送信（メールアドレス入力）"
echo "  2. 予約完了メールが届くか確認"
echo "  3. Resendダッシュボードでログ確認"
echo "  4. email_logs テーブルで送信履歴確認"
echo ""
echo "📚 詳細なセットアップ手順:"
echo "  - PRODUCTION_SETUP.md を参照"
echo "  - README.md を参照"
echo ""
echo "🎉 デプロイスクリプト完了"
echo "=================================================="

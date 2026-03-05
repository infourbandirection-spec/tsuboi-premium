#!/bin/bash
echo "=== セキュリティチェック開始 ==="
echo ""

echo "1️⃣ 環境ファイルのGit追跡チェック"
echo "----------------------------------------"
if git ls-files | grep -q "\.dev\.vars$"; then
  echo "❌ WARNING: .dev.vars がGitに追跡されています"
else
  echo "✅ .dev.vars はGitに追跡されていません"
fi

echo ""
echo "2️⃣ ハードコードされた認証情報チェック"
echo "----------------------------------------"
if grep -r "re_[A-Za-z0-9_-]\{20,\}" src/ public/ 2>/dev/null | grep -v "YOUR_API_KEY"; then
  echo "❌ WARNING: Resend APIキーがハードコードされている可能性"
else
  echo "✅ APIキーのハードコードなし"
fi

echo ""
echo "3️⃣ パスワードのハードコードチェック"
echo "----------------------------------------"
if grep -r "urbandirection" src/ public/ --include="*.js" --include="*.tsx" | grep -i "password.*="; then
  echo "⚠️  パスワード参照が見つかりました（要確認）"
else
  echo "✅ パスワードのハードコードなし"
fi

echo ""
echo "4️⃣ .gitignoreの確認"
echo "----------------------------------------"
if grep -q ".dev.vars" .gitignore && grep -q ".env" .gitignore; then
  echo "✅ .gitignoreに環境ファイルが登録されています"
else
  echo "❌ WARNING: .gitignoreの設定を確認してください"
fi

echo ""
echo "5️⃣ 本番環境の動作確認"
echo "----------------------------------------"
STATUS=$(curl -s https://tsuboi-premium.pages.dev/api/status | jq -r '.success')
if [ "$STATUS" = "true" ]; then
  echo "✅ APIステータス正常"
else
  echo "❌ APIステータス異常"
fi

STORE=$(curl -s https://tsuboi-premium.pages.dev/api/stores | jq -r '.data[0].store_name')
if [ "$STORE" = "一畳屋ショールーム" ]; then
  echo "✅ 店舗名正常: $STORE"
else
  echo "❌ 店舗名異常: $STORE"
fi

echo ""
echo "=== セキュリティチェック完了 ==="

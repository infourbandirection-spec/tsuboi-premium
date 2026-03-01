#!/bin/bash

echo "============================================================"
echo "🔍 DNS設定確認スクリプト"
echo "============================================================"
echo ""

echo "【1】DKIM レコード確認"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
dig TXT resend._domainkey.urbandirection.jp +short
if [ $? -eq 0 ] && [ -n "$(dig TXT resend._domainkey.urbandirection.jp +short)" ]; then
    echo "✅ DKIM レコードが反映されています"
else
    echo "⏳ DKIM レコードはまだ反映されていません"
fi
echo ""

echo "【2】SPF レコード確認"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
dig TXT send.urbandirection.jp +short
if [ $? -eq 0 ] && [ -n "$(dig TXT send.urbandirection.jp +short)" ]; then
    echo "✅ SPF レコードが反映されています"
else
    echo "⏳ SPF レコードはまだ反映されていません"
fi
echo ""

echo "【3】DMARC レコード確認"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
dig TXT _dmarc.urbandirection.jp +short
if [ $? -eq 0 ] && [ -n "$(dig TXT _dmarc.urbandirection.jp +short)" ]; then
    echo "✅ DMARC レコードが反映されています"
else
    echo "⏳ DMARC レコードはまだ反映されていません"
fi
echo ""

echo "============================================================"
echo "📝 注意事項"
echo "============================================================"
echo "• DNS反映には通常5〜30分かかります"
echo "• 最大で24時間かかる場合があります"
echo "• すべてのレコードが反映されるまで待機してください"
echo ""

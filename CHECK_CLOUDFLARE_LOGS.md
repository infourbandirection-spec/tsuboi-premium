# Cloudflare Workersのログ確認手順

## 問題
メールが届かない原因を特定するため、バックエンド（Cloudflare Workers）のログを確認する必要があります。

## 手順

### 方法1: Cloudflareダッシュボードでリアルタイムログを確認

1. **Cloudflareダッシュボードにアクセス**  
   https://dash.cloudflare.com/e74e780cd3e5705ede60a66c07a3d2bb/pages/view/tsuboi-premium

2. **「Logs」タブまたは「Real-time Logs」を開く**
   - 左側メニューまたは上部タブで「Logs」を探す
   - または「Analytics」→「Logs」

3. **ログストリーミングを開始**
   - 「Begin log stream」または「Start」ボタンをクリック

4. **もう一度応募フォームを送信**
   - https://tsuboi-premium.pages.dev/ で応募送信
   - リアルタイムでログが表示される

5. **探すべきログ**:
   - ✅ `Attempting to send email to: [メールアドレス]`
   - ✅ `Sending email via Resend API...`
   - ✅ `Email sent successfully: [message_id]`
   - ❌ `Resend API key not configured`
   - ❌ `Resend API error: [エラー詳細]`

---

### 方法2: Wrangler CLIでログを確認（ローカル環境）

**注意**: この方法は本番環境のログではなく、ローカル開発環境のログです。

```bash
# ローカルでテストする場合
cd /home/user/webapp
npm run dev:sandbox

# 別のターミナルでテスト
curl -X POST http://localhost:3000/api/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990-01-01",
    "fullName": "テスト太郎",
    "kana": "テストタロウ",
    "phoneNumber": "090-1234-5678",
    "email": "test@example.com",
    "quantity": 1,
    "store": "一畳屋ショールーム（熊本県熊本市中央区坪井5丁目2-27）",
    "pickupDate": "2026-03-15",
    "pickupTime": "10:00～10:30"
  }'
```

---

### 方法3: 管理画面のメールログを確認

1. https://tsuboi-premium.pages.dev/admin にログイン
2. **「メールログ」タブ**を開く
3. 最新のエントリを確認：
   - **Status**: success / failed
   - **Error**: エラーメッセージ（ある場合）
   - **Sent At**: 送信時刻

---

## チェックリスト

- [ ] Cloudflare Pagesのログストリーミングを開始
- [ ] 応募フォームを再送信
- [ ] ログに「Attempting to send email」が表示されるか確認
- [ ] エラーメッセージを記録
- [ ] 管理画面のメールログを確認

---

## 次のステップ

ログを確認して以下の情報を共有してください：
1. Cloudflare Workersのログのスクリーンショット
2. または管理画面のメールログのスクリーンショット

これで正確な原因が特定できます。

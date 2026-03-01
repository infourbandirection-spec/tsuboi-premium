# 📧 Resend ドメイン認証ガイド

## 現在の状態

- ✅ コード設定完了：送信元アドレスを `info@urbandirection.jp` に設定済み
- ⚠️ **ドメイン認証が必要**：現在は開発モードのため実際の送信はできません

---

## 🎯 ドメイン認証完了後に可能になること

1. **`info@urbandirection.jp` からメール送信**
2. **`s.izumi@urbandirection.jp` など任意のアドレスへ送信**
3. **送信制限の大幅緩和**（月間10万通まで無料）
4. **高い到達率**（SPF/DKIM認証済み）
5. **送信元アドレスのカスタマイズ**

---

## 📋 ドメイン認証手順

### ステップ1: Resendダッシュボードにアクセス

**URL**: https://resend.com/domains

### ステップ2: ドメインを追加

1. **「Add Domain」** ボタンをクリック
2. **ドメイン名を入力**: `urbandirection.jp`
3. **確認**をクリック

### ステップ3: DNSレコードを追加

Resendが提供するDNSレコードをドメイン管理画面（お名前.com、ムームードメインなど）で設定します。

#### 必須レコード

##### 1️⃣ **SPF認証（TXT レコード）**

```
タイプ: TXT
名前: @ (または空欄)
値: v=spf1 include:_spf.resend.com ~all
TTL: 3600 (1時間)
```

##### 2️⃣ **DKIM認証（CNAME レコード）**

```
タイプ: CNAME
名前: resend._domainkey
値: resend._domainkey.u.resend.com
TTL: 3600 (1時間)
```

※ Resendが提供する実際の値を使用してください（上記は例です）

#### 推奨レコード

##### 3️⃣ **DMARC（TXT レコード）**

```
タイプ: TXT
名前: _dmarc
値: v=DMARC1; p=none; rua=mailto:dmarc@urbandirection.jp
TTL: 3600 (1時間)
```

---

### ステップ4: DNS設定例（お名前.comの場合）

1. **お名前.comにログイン**
2. **「ドメイン設定」→「DNS設定/転送設定」**を選択
3. **`urbandirection.jp`** を選択
4. **「DNSレコード設定を利用する」**をクリック
5. **上記のレコードを追加**
6. **「確認画面へ進む」→「設定する」**

### ステップ5: 認証を確認

1. **Resendダッシュボード**に戻る
2. **「Verify」**ボタンをクリック
3. **認証完了を確認**（数分〜24時間）

✅ 緑色のチェックマークが表示されれば完了！

---

## 🚀 認証完了後の設定

### ローカル開発環境

**`.dev.vars`** は既に設定済み：
```bash
RESEND_API_KEY=re_2oYH4UPg_GTPFCMFneHTws4WCzfLPGH9N
RESEND_FROM_EMAIL=info@urbandirection.jp
```

### 本番環境（Cloudflare Pages）

```bash
# APIキーを設定
npx wrangler secret put RESEND_API_KEY
# 入力: re_2oYH4UPg_GTPFCMFneHTws4WCzfLPGH9N

# 送信元アドレスはwrangler.jsonc に設定済み
```

---

## 🧪 テスト方法

### ドメイン認証完了後のテスト

```bash
cd /home/user/webapp

# テストメール送信（s.izumi@urbandirection.jp宛て）
node send_test_emails_to_izumi.mjs
```

**作成するテストスクリプト**：

```javascript
// send_test_emails_to_izumi.mjs
const RESEND_API_KEY = 're_2oYH4UPg_GTPFCMFneHTws4WCzfLPGH9N';
const TEST_EMAIL = 's.izumi@urbandirection.jp'; // ドメイン認証後に有効

async function sendTestEmail() {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'info@urbandirection.jp',
      to: [TEST_EMAIL],
      subject: 'テスト送信（ドメイン認証後）',
      html: '<h1>テスト成功！</h1><p>info@urbandirection.jpからの送信が正常に動作しています。</p>'
    })
  });

  const data = await response.json();
  console.log(response.ok ? '✅ 成功' : '❌ 失敗', data);
}

sendTestEmail();
```

---

## ⚠️ 認証前の動作

**現在の状態**（認証前）：
- ❌ `info@urbandirection.jp` からは送信**できません**
- ⚠️ エラーメッセージ：`Domain not verified`

**一時的な対応**：
- `.dev.vars` と `wrangler.jsonc` の `RESEND_FROM_EMAIL` を `onboarding@resend.dev` に戻す
- または、認証完了を待つ

---

## 📊 設定状況

### 環境変数

| 変数名 | 値 | 場所 |
|--------|-----|------|
| `RESEND_API_KEY` | `re_2oYH4UPg_...` | `.dev.vars`, Cloudflare Secret |
| `RESEND_FROM_EMAIL` | `info@urbandirection.jp` | `.dev.vars`, `wrangler.jsonc` |

### コード

- ✅ `src/index.tsx` (48行目)：環境変数から送信元アドレスを読み込み
- ✅ `Bindings` 型に `RESEND_FROM_EMAIL` 定義済み（11行目）
- ✅ すべてのメール送信で自動的に使用

---

## 🔧 トラブルシューティング

### エラー: `Domain not verified`

**原因**: ドメイン認証が未完了

**解決策**:
1. Resendダッシュボードで認証状態を確認
2. DNSレコードが正しく設定されているか確認
3. DNSの反映を待つ（最大24時間）

### エラー: `Invalid from address`

**原因**: 送信元アドレスのフォーマットが間違っている

**解決策**:
```jsonc
// 正しい形式
"RESEND_FROM_EMAIL": "info@urbandirection.jp"

// または名前付き
"RESEND_FROM_EMAIL": "パスート24事務局 <info@urbandirection.jp>"
```

---

## 📚 参考資料

- **Resend公式ドキュメント**: https://resend.com/docs
- **ドメイン認証ガイド**: https://resend.com/docs/send-with-domains
- **API リファレンス**: https://resend.com/docs/api-reference/introduction

---

## 📞 サポート

ドメイン認証に関する質問やサポートが必要な場合：
- **Resendサポート**: https://resend.com/support
- **メール**: support@resend.com

---

**最終更新**: 2026-03-01  
**ステータス**: ⚠️ ドメイン認証待ち

# メール配信問題の診断と解決策

## 🔍 問題の特定

### 現状
- **送信元**: `info.urbandirection@gmail.com`
- **送信先**: ユーザーが応募時に入力したメールアドレス（例: `izumishigeru.h6@gmail.com`）
- **結果**: ❌ メール送信失敗

### エラー内容
```
"The gmail.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"
```

### 原因
**Resend APIの制限**により、検証されていないドメイン（gmail.com）からは、**APIキー所有者の同じメールアドレスにしか送信できません**。

つまり：
- ✅ `info.urbandirection@gmail.com` → `info.urbandirection@gmail.com`（自分自身）: **送信可能**
- ❌ `info.urbandirection@gmail.com` → `izumishigeru.h6@gmail.com`（他のユーザー）: **送信不可**
- ❌ `info.urbandirection@gmail.com` → 任意のメールアドレス: **送信不可**

---

## ✅ 解決策（3つのオプション）

### オプション1: 独自ドメインを検証する（推奨）

**手順**:

1. **Resendダッシュボードにログイン**: [https://resend.com/domains](https://resend.com/domains)

2. **ドメイン追加**:
   - 「Add Domain」ボタンをクリック
   - ドメイン名を入力（例: `passurt24.jp`）

3. **DNSレコード設定**:
   Resendが提供する以下のDNSレコードを、ドメインのDNS設定画面で追加：
   
   ```
   # SPFレコード（送信者認証）
   Type: TXT
   Name: @
   Value: v=spf1 include:_spf.resend.com ~all
   
   # DKIMレコード（メール署名）
   Type: TXT
   Name: resend._domainkey
   Value: [Resendが提供する値]
   
   # DMARCレコード（ポリシー設定）
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:dmarc@passurt24.jp
   ```

4. **検証完了を待つ**: 24-48時間

5. **送信元メールアドレス変更**:
   ```bash
   # 例: info@passurt24.jp に変更
   echo "info@passurt24.jp" | npx wrangler pages secret put RESEND_FROM_EMAIL --project-name passurt24
   ```

**メリット**:
- ✅ 任意のメールアドレスに送信可能
- ✅ プロフェッショナルな印象
- ✅ 配信率向上（SPF/DKIM設定済み）
- ✅ 本番運用に最適

**デメリット**:
- ❌ 独自ドメインが必要（費用発生）
- ❌ DNS設定が必要（技術的知識）
- ❌ 検証まで24-48時間必要

---

### オプション2: Resend APIをテストモードで使用（一時的）

**現在の状態**: すでにテストモードです

**制限**:
- ❌ `info.urbandirection@gmail.com` にしかメールを送信できません
- ❌ 他のユーザーには送信できません

**用途**:
- 開発・テスト環境のみ
- 本番運用には不適切

**テスト方法**:
```bash
# テストメール送信（自分自身宛て）
curl -X POST https://passurt24.pages.dev/api/test/email/reservation \
  -H "Content-Type: application/json" \
  -d '{
    "email": "info.urbandirection@gmail.com",
    "fullName": "テスト 太郎",
    "reservationId": "PRE-20260304-TEST",
    "quantity": 1,
    "store": "株式会社パスート24",
    "pickupDate": "2026-03-16",
    "pickupTime": "15:00～16:00"
  }'
```

---

### オプション3: 他のメール送信サービスに変更

**代替サービス**:

1. **SendGrid**
   - 無料プラン: 月100通まで
   - ドメイン検証必要
   - API互換性高い

2. **Mailgun**
   - 無料プラン: 月5,000通まで
   - ドメイン検証必要
   - API互換性高い

3. **AWS SES**
   - 従量課金: $0.10/1,000通
   - ドメイン検証必要
   - 設定が複雑

**実装変更**: `sendEmail()` 関数のAPIエンドポイントとヘッダーを変更する必要があります。

---

## 📊 現在の状況

### データベース確認結果

#### メールログ
```sql
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 5;
```
結果: **1件のみ記録**
- ID 1: `info.urbandirection@gmail.com` 宛て（自分自身）- ✅ 成功

#### 最近の応募
```sql
SELECT id, reservation_id, email, created_at FROM reservations ORDER BY created_at DESC LIMIT 5;
```
結果:
- ID 36: `izumishigeru.h6@gmail.com` - ❌ メール送信記録なし
- ID 35: `izumishigeru.h6@gmail.com` - ❌ メール送信記録なし
- ID 34: `test-email-save@example.com` - ❌ メール送信記録なし
- ID 33: `null` - メールアドレス未入力
- ID 32: `null` - メールアドレス未入力

**結論**: ID 34, 35, 36 の応募では、メール送信が試みられましたが、Resend APIの制限により失敗し、ログに記録されていません。

---

## 🔧 推奨アクション

### 短期的対応（テスト環境）
1. ✅ 現状のままテストモードで運用
2. ✅ `info.urbandirection@gmail.com` にのみメール送信
3. ✅ 他のユーザーには「メール送信機能は準備中」と案内

### 長期的対応（本番運用）
1. ✅ **独自ドメインを取得**（例: `passurt24.jp`）
2. ✅ **Resendでドメイン検証**（SPF, DKIM, DMARC設定）
3. ✅ **送信元メールアドレスを変更**（`info@passurt24.jp`）
4. ✅ **本番運用開始**

---

## 📝 チェックリスト

### 現在完了していること
- [x] Resend APIキー設定
- [x] 送信元メールアドレス設定（`info.urbandirection@gmail.com`）
- [x] メール送信ロジック実装
- [x] メールログ記録機能実装
- [x] エラーハンドリング実装

### 未完了（本番運用に必要）
- [ ] 独自ドメイン取得
- [ ] Resendでドメイン検証
- [ ] DNS設定（SPF, DKIM, DMARC）
- [ ] 送信元メールアドレス変更
- [ ] 本番環境でのメール送信テスト

---

## 🆘 サポート

### Resendサポート
- **ドキュメント**: [https://resend.com/docs](https://resend.com/docs)
- **ダッシュボード**: [https://resend.com/domains](https://resend.com/domains)
- **サポート**: support@resend.com

### ドメイン取得
- **お名前.com**: [https://www.onamae.com/](https://www.onamae.com/)
- **ムームードメイン**: [https://muumuu-domain.com/](https://muumuu-domain.com/)
- **Cloudflare Registrar**: [https://www.cloudflare.com/products/registrar/](https://www.cloudflare.com/products/registrar/)

---

**作成日**: 2026-03-04  
**問い合わせ**: info.urbandirection@gmail.com  
**バージョン**: 1.0.0

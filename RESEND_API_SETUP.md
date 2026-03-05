# Resend APIキー設定手順

## 📋 準備
スクリーンショットに表示されているAPIキー:
- **名前**: 坪井連絡会プレミアム商品券
- **トークン**: `re_C4xHhJzX...` （一部のみ表示）
- **許可**: フルアクセス
- **最終使用**: 3分前（約2週間前）

---

## 🔧 Cloudflare Pagesへの設定手順

### ステップ1: ResendでAPIキーの完全な値を取得

1. **Resendダッシュボードで、APIキー行の右側 "..." メニューをクリック**
2. **"View" または "Copy" を選択**してAPIキー全体をコピー
   - 形式: `re_XXXXXXXXXXXXXXXXXXXXXXXX` (約40文字)
   - 重要: 完全な文字列をコピーしてください

---

### ステップ2: Cloudflare Pagesに環境変数を追加

1. **Cloudflareダッシュボードにアクセス**
   ```
   https://dash.cloudflare.com/e74e780cd3e5705ede60a66c07a3d2bb/pages/view/tsuboi-premium
   ```

2. **"Settings" タブをクリック**

3. **下にスクロールして "Environment variables" セクションを探す**

4. **"Add variable" ボタンをクリック**

5. **変数を追加**:
   ```
   Variable name: RESEND_API_KEY
   Value: [コピーしたAPIキーを貼り付け]
   
   Environment: 
   ☑ Production
   ☑ Preview
   ```

6. **"Save" をクリック**

---

### ステップ3: オプション - 送信元メールアドレスを設定

1. **もう一度 "Add variable" をクリック**

2. **送信元メールを設定**:
   ```
   Variable name: RESEND_FROM_EMAIL
   Value: info@urbandirection.jp
   
   Environment:
   ☑ Production
   ☑ Preview
   ```

3. **"Save" をクリック**

---

### ステップ4: 再デプロイ

環境変数を追加したら、再デプロイが必要です：

1. **"Deployments" タブをクリック**

2. **最新のデプロイ（一番上）を探す**
   - コミット: `c3770ff` または `2ac636b`
   - 日時: 2026-03-05

3. **右側の "..." メニュー → "Retry deployment"**

4. **デプロイ完了を待つ（約30秒）**

---

### ステップ5: メール送信テスト

1. **応募フォームにアクセス**
   ```
   https://tsuboi-premium.pages.dev/
   ```

2. **テストデータで応募**
   - チェックボックス: 両方チェック
   - 生年月日: 任意
   - 氏名: テスト 太郎
   - 電話番号: 090-1234-5678
   - **メールアドレス: ご自身のメールアドレス**
   - 冊数: 1冊
   - 購入日時: 選択

3. **応募完了後、メールを確認**
   - 件名: 「坪井繁栄会 プレミアム商品券 応募完了」
   - 送信元: info@urbandirection.jp
   - 内容: 応募ID、冊数、購入日時など

---

## 🔍 トラブルシューティング

### メールが届かない場合

1. **迷惑メールフォルダを確認**
   - Gmail, Outlook等の迷惑メールフォルダ

2. **ブラウザコンソールでエラー確認**
   - F12 → Console タブ
   - 応募完了後のログを確認

3. **管理画面でログ確認**
   - https://tsuboi-premium.pages.dev/admin
   - 応募一覧で該当応募を確認
   - コンソールログにエラーメッセージがあるか確認

4. **Resendダッシュボードで送信状況確認**
   - https://resend.com/emails
   - 送信試行のログが表示される

---

## 📊 環境変数設定後の期待動作

### メール送信フロー

```
ユーザー応募
    ↓
データベースに保存
    ↓
sendEmail() 関数実行
    ↓
RESEND_API_KEY チェック ← 🔑 ここで設定値を使用
    ↓
Resend API呼び出し
    ↓
メール送信成功
    ↓
email_logs テーブルに記録
```

### 設定前と設定後の違い

| 項目 | 設定前 | 設定後 |
|------|--------|--------|
| 応募処理 | ✅ 成功 | ✅ 成功 |
| データ保存 | ✅ 保存 | ✅ 保存 |
| メール送信 | ❌ スキップ | ✅ 送信 |
| ログ | "API key not configured" | "Email sent successfully" |

---

## 📝 重要な注意事項

1. **APIキーは秘密情報**
   - Gitにコミットしない
   - スクリーンショットで共有しない
   - Cloudflare環境変数のみに設定

2. **両方の環境を設定**
   - Production: 本番環境用
   - Preview: プレビュー/テスト環境用

3. **再デプロイ必須**
   - 環境変数追加後は必ず再デプロイ
   - 再デプロイしないと反映されない

---

## ✅ 設定完了チェックリスト

- [ ] ResendでAPIキー全体をコピー
- [ ] Cloudflare Pages → Settings → Environment variables を開く
- [ ] RESEND_API_KEY を追加（Production & Preview）
- [ ] RESEND_FROM_EMAIL を追加（オプション）
- [ ] 環境変数を保存
- [ ] Deployments → Retry deployment で再デプロイ
- [ ] 応募フォームでテスト
- [ ] メール受信を確認

---

## 🚀 次のアクション

1. **Resendダッシュボードで "..." メニュー → "Copy" または "View"**
2. **APIキー全体をコピー** (`re_` で始まる40文字程度)
3. **上記の手順に従ってCloudflare Pagesに設定**
4. **再デプロイ実行**
5. **テスト応募でメール受信確認**

設定中にスクリーンショットが必要な場合は、お知らせください！📧


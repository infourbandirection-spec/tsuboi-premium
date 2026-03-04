# 🔧 デプロイエラー修正手順

**日時**: 2026-03-05 08:55 JST  
**エラー**: Cloudflare Pages ビルドエラー（Unterminated string literal）  
**原因**: GitHubキャッシュまたはビルドキャッシュの問題  
**解決方法**: 手動で「Retry deployment」を実行

---

## ✅ 修正完了済み

**ローカル環境:**
- ✅ URL修正完了（passurt24 → tsuboi-premium）
- ✅ ビルド成功: `dist/_worker.js  107.17 kB`
- ✅ GitHubプッシュ完了: コミット `a2e3d4d`

**検証済み:**
```bash
cd /home/user/webapp && npm run build
→ ✓ built in 663ms  ← 成功！
```

---

## 🔄 Retry Deployment 手順

### ステップ1: 画面右下の「Retry deployment」ボタンをクリック

**現在の画面**（Build log画面）の右下に、青い **「Retry deployment」** ボタンが表示されています。

👉 **このボタンをクリックしてください。**

---

## ⏳ デプロイ進行状況の確認

クリック後、以下の流れで進行します：

1. **Initializing build environment** (2〜3秒)
2. **Cloning git repository** (2〜3秒)
3. **Building application** (15〜20秒)
   - ✅ 今回は成功するはずです
4. **Deploying to Cloudflare's global network** (10〜15秒)
5. **Success** ✅

**合計所要時間**: 約30〜40秒

---

## ✅ 成功の確認方法

デプロイが完了すると：

1. **Status** が **「Success」** に変わる
2. **デプロイURL** が表示される: `https://xxx.tsuboi-premium.pages.dev/`
3. **本番URL** が更新される: https://tsuboi-premium.pages.dev/

---

## 🎯 デプロイ成功後の確認

### 1. メールテンプレートURL確認（重要）

デプロイ成功後、テストメールを送信してURLが正しいか確認します：

```bash
# ローカル環境でテストメール送信
cd /home/user/webapp
node test-emails.js
```

メール内のリンクが以下のようになっていればOK：
- ❌ 旧: `https://passurt24.pages.dev/lookup`
- ✅ 新: `https://tsuboi-premium.pages.dev/lookup`

### 2. 本番サイト動作確認

```bash
curl https://tsuboi-premium.pages.dev/api/stores
curl https://tsuboi-premium.pages.dev/api/status
```

---

## 📝 トラブルシューティング

### もし再度ビルドエラーが発生した場合

**原因:** Cloudflare Pagesのビルドキャッシュが古い

**解決方法:**
1. Cloudflare Pages → **Settings** タブ
2. **「Builds & deployments」** セクション
3. **「Clear build cache」** をクリック
4. 再度 **「Retry deployment」** を実行

---

## 🎉 期待される結果

**Retry deployment** 実行後：

✅ ビルドが成功  
✅ デプロイが完了  
✅ 本番URL（https://tsuboi-premium.pages.dev/）が更新される  
✅ メールテンプレート内URLが修正される  

---

**今すぐ実施:** 画面右下の青い **「Retry deployment」** ボタンをクリックしてください！ 🚀

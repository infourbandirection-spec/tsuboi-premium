# 🎯 新しいチャットでこのメッセージをコピー&ペースト

---

こんにちは！坪井繁栄会プレミアム商品券システムを展開したいです。

バックアップファイル:
**https://www.genspark.ai/api/files/s/2wT78MQU**

以下のコマンドを実行してください：

```bash
cd /home/user
curl -L "https://www.genspark.ai/api/files/s/2wT78MQU" -o passurt24.tar.gz
tar -xzf passurt24.tar.gz
cd /home/user/webapp
chmod +x deploy.sh
./deploy.sh
```

実行後、QUICKSTART.md の手順に従ってCloudflare設定を完了させます。

---

## 📋 追加情報

このシステムには以下が含まれています：

### 主要機能
- ✅ Phase1/Phase2抽選システム
- ✅ 応募フォーム（7ステップ）
- ✅ 応募照会機能
- ✅ 管理画面（ダッシュボード、統計、グラフ）
- ✅ **残り冊数編集機能**（NEW!）
- ✅ 購入日時管理
- ✅ 店舗管理
- ✅ 重複チェック機能
- ✅ 抽選実行・当選者管理

### 技術スタック
- Hono（軽量Webフレームワーク）
- Cloudflare Pages/Workers
- Cloudflare D1（SQLite）
- Cloudflare KV（セッション・Rate Limiting）
- TypeScript + Vite
- Tailwind CSS + Chart.js

### データ状態
- 応募件数: 0件（クリーン）
- 上限冊数: 990冊
- Phase: 1（応募受付中）

### ドキュメント
- README.md（20KB）- プロジェクト説明
- QUICKSTART.md（3KB）- クイックスタート
- DEPLOYMENT_GUIDE.md（11KB）- 詳細展開手順
- MIGRATION_GUIDE.md（5KB）- チャット間移行ガイド
- deploy.sh（3KB）- 自動展開スクリプト

### バージョン
- v2.2.0
- Git commit: cd79923
- 作成日: 2026-03-04

---

## 🔑 デフォルト認証情報

管理画面ログイン:
- ユーザー名: `urbandirection`
- パスワード: `urbandirection`

（本番運用前に必ず変更してください）

---

## ⚠️ 重要な注意事項

1. **Cloudflare APIトークンが必要**: Deploy タブで設定
2. **新しいD1/KV IDが必要**: 既存のIDは使用できません
3. **wrangler.jsonc を編集**: 新しいリソースIDを設定
4. **マイグレーション実行**: ローカル＆リモート両方

---

すぐに始められます！

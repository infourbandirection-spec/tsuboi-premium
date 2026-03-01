# 坪井繁栄会版カスタマイズガイド

## 📦 バックアップURL
```
https://www.genspark.ai/api/files/s/Ggv6L3Xs
```

**ファイル名**: `passport24-premium-voucher-complete.tar.gz`

---

## 🔧 カスタマイズ項目

### 1. プロジェクト基本情報

| 項目 | パスート24版 | 坪井繁栄会版 |
|---|---|---|
| **プロジェクト名** | `webapp` | `tsuboi-hanei-kai` |
| **システム名** | パスート24 プレミアム商品券 | 坪井繁栄会 商品券 |
| **組織名** | パスート24事務局 | 坪井繁栄会事務局 |
| **メール送信元** | `info@urbandirection.jp` | `tsuboi@urbandirection.jp` |

---

### 2. 環境変数の変更

#### `.dev.vars`
```env
RESEND_API_KEY=re_2oYH4UPg_GTPFCMFneHTws4WCzfLPGH9N
RESEND_FROM_EMAIL=tsuboi@urbandirection.jp
```

#### `wrangler.jsonc`
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "tsuboi-hanei-kai",
  "compatibility_date": "2026-02-25",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "tsuboi-hanei-kai-production",
      "database_id": ""
    }
  ],
  "vars": {
    "RESEND_FROM_EMAIL": "tsuboi@urbandirection.jp"
  }
}
```

---

### 3. メールテンプレートの変更

#### 件名の変更
| メール種別 | パスート24版 | 坪井繁栄会版 |
|---|---|---|
| **予約完了** | パスート24 プレミアム商品券 予約完了のお知らせ | 坪井繁栄会 商品券 予約完了のお知らせ |
| **当選通知** | パスート24 プレミアム商品券 抽選結果のお知らせ（当選） | 坪井繁栄会 商品券 抽選結果のお知らせ（当選） |
| **落選通知** | パスート24 プレミアム商品券 抽選結果のお知らせ | 坪井繁栄会 商品券 抽選結果のお知らせ |

#### 本文内の組織名変更
- `パスート24` → `坪井繁栄会`
- `パスート24プレミアム付商品券` → `坪井繁栄会商品券`
- `パスート24事務局` → `坪井繁栄会事務局`

---

### 4. フロントエンドの変更

#### `public/static/app.js`
```javascript
// システム名
const SYSTEM_NAME = '坪井繁栄会 商品券抽選システム';

// ヘッダータイトル
<h1>坪井繁栄会 商品券 抽選・応募システム</h1>
```

#### HTMLタイトル
```html
<title>坪井繁栄会 商品券抽選システム</title>
```

---

### 5. データベース設定

#### D1データベース作成
```bash
# 新規データベース作成
npx wrangler d1 create tsuboi-hanei-kai-production

# マイグレーション実行
npx wrangler d1 migrations apply tsuboi-hanei-kai-production --local
```

---

### 6. メール設定（重要）

#### ⚠️ DNS設定は不要
- ドメイン `urbandirection.jp` は**既に認証済み**
- 同一ドメインの別メールアドレス `tsuboi@urbandirection.jp` を使用
- **追加のDNS設定は一切不要**

#### Resend設定
- API Key: **パスート24と同じキーを使用**（`re_2oYH4UPg_GTPFCMFneHTws4WCzfLPGH9N`）
- From Address: `tsuboi@urbandirection.jp`
- 送信上限: パスート24と共有（月間3,000通）

---

## 🚀 セットアップ手順

### Step 1: バックアップのダウンロード
```bash
# 新しいAI Developer環境で実行
curl -o passport24-complete.tar.gz https://www.genspark.ai/api/files/s/Ggv6L3Xs
```

### Step 2: 解凍とリネーム
```bash
tar -xzf passport24-complete.tar.gz
mv home/user/webapp tsuboi-hanei-kai
cd tsuboi-hanei-kai
```

### Step 3: プロジェクト名の一括置換
```bash
# wrangler.jsonc
sed -i 's/"name": "webapp"/"name": "tsuboi-hanei-kai"/g' wrangler.jsonc
sed -i 's/webapp-production/tsuboi-hanei-kai-production/g' wrangler.jsonc

# .dev.vars
sed -i 's/info@urbandirection.jp/tsuboi@urbandirection.jp/g' .dev.vars
```

### Step 4: ソースコード内の置換
```bash
# src/index.tsx 内の文言置換
sed -i 's/パスート24/坪井繁栄会/g' src/index.tsx
sed -i 's/プレミアム商品券/商品券/g' src/index.tsx
```

### Step 5: Git初期化
```bash
git init
git add .
git commit -m "坪井繁栄会版の初期セットアップ"
```

### Step 6: 依存関係インストールとビルド
```bash
npm install
npm run build
```

### Step 7: ローカル起動
```bash
pm2 start ecosystem.config.cjs
```

### Step 8: テストメール送信
```bash
# メールアドレスを tsuboi@urbandirection.jp に変更して実行
node send_test_emails_to_account.mjs
```

---

## 📝 置換が必要な文言リスト

### 高優先度（必須）
- [x] `パスート24` → `坪井繁栄会`
- [x] `プレミアム商品券` → `商品券`
- [x] `info@urbandirection.jp` → `tsuboi@urbandirection.jp`
- [x] `webapp` → `tsuboi-hanei-kai`
- [x] `webapp-production` → `tsuboi-hanei-kai-production`

### 中優先度（推奨）
- [ ] カラースキーム変更（グラデーション色など）
- [ ] ロゴ・アイコンの変更
- [ ] フッターの組織名
- [ ] 管理画面のタイトル

### 低優先度（オプション）
- [ ] サンプルデータの店舗名
- [ ] テストスクリプトの表示名
- [ ] README.mdの内容

---

## ⚠️ 注意事項

### 1. 同一ドメイン・別アドレス運用
- **メリット**: DNS設定不要、即使用可能、コストゼロ
- **デメリット**: 送信上限を共有（月間3,000通）
- **対策**: 件名に組織名を含めてユーザーが区別可能

### 2. データベース分離
- パスート24: `webapp-production`
- 坪井繁栄会: `tsuboi-hanei-kai-production`
- **完全に独立したデータベース**なので混在なし

### 3. Cloudflare Pages デプロイ
```bash
# プロジェクト名を変更してデプロイ
npx wrangler pages deploy dist --project-name tsuboi-hanei-kai
```

---

## 🔗 参考資料

- パスート24版リポジトリ: `/home/user/webapp`
- バックアップURL: https://www.genspark.ai/api/files/s/Ggv6L3Xs
- Resendダッシュボード: https://resend.com/emails
- Cloudflareダッシュボード: https://dash.cloudflare.com

---

## 💡 新しいチャットでの依頼文テンプレート

```
以下のバックアップから坪井繁栄会版の商品券システムを作成してください。

バックアップURL: https://www.genspark.ai/api/files/s/Ggv6L3Xs

カスタマイズ内容:
1. プロジェクト名: tsuboi-hanei-kai
2. システム名: 坪井繁栄会 商品券抽選システム
3. 組織名: 坪井繁栄会事務局
4. メール送信元: tsuboi@urbandirection.jp
5. 文言置換:
   - パスート24 → 坪井繁栄会
   - プレミアム商品券 → 商品券
   - パスート24事務局 → 坪井繁栄会事務局

注意事項:
- ドメイン urbandirection.jp は認証済みなので DNS設定不要
- Resend API Key: re_2oYH4UPg_GTPFCMFneHTws4WCzfLPGH9N
- データベース名: tsuboi-hanei-kai-production

参考ドキュメント: TSUBOI_CUSTOMIZATION_GUIDE.md
```

---

**このガイドを使って新しいAI Developer環境で作業を開始できます！** 🚀

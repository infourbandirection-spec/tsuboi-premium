# ✅ デプロイ後チェックリスト

**プロジェクト**: tsuboi-premium  
**本番URL**: https://tsuboi-premium.pages.dev/  
**日付**: 2026-03-04  
**ステータス**: ⚠️ デプロイ完了、追加設定が必要

---

## 🎉 デプロイ成功！

Cloudflare Pagesへのデプロイが完了しました。
現在、基本的なページは表示されていますが、**データベース設定が必要**です。

---

## ⚠️ 現在の状況

### 確認した結果:
- ✅ サイトアクセス: OK - https://tsuboi-premium.pages.dev/
- ✅ APIステータス: OK - /api/status が正常応答
- ❌ **データベース: 古いデータ** - 店舗マスターが更新前の状態

**問題**: 本番D1データベースにマイグレーションが適用されていません。

---

## 🔧 必須設定（すぐに実行）

### 1️⃣ D1 Database バインディング設定

1. Cloudflareダッシュボード: https://dash.cloudflare.com/
2. **Workers & Pages** → **tsuboi-premium** プロジェクト
3. **Settings** → **Functions**
4. **D1 database bindings** セクション:
   - **Add binding** をクリック
   - **Variable name**: `DB`
   - **D1 database**: `passport24-voucher-production` を選択
   - **Save** をクリック

**データベース情報:**
- 名前: `passport24-voucher-production`
- ID: `92ba7506-598f-4bb2-baf8-40d07a379224`

### 2️⃣ KV Namespace バインディング設定

同じ **Functions** ページで:

**Binding 1:**
- **Add binding** をクリック
- **Variable name**: `CSRF_TOKENS`
- **KV namespace**: ID `620dcfa3ae4e4c7bbf155e07c1840a93` を選択
- **Save**

**Binding 2:**
- **Add binding** をクリック
- **Variable name**: `RATE_LIMIT`
- **KV namespace**: ID `8d09805b2d1b4b3db141bbe067e34537` を選択
- **Save**

### 3️⃣ 再デプロイ

バインディング設定後:
1. **Deployments** タブを開く
2. 最新デプロイの **...** メニュー → **Retry deployment**
3. デプロイ完了を待つ（1～2分）

---

## 📊 D1 マイグレーション適用（最重要）

### 手順:

1. **Workers & Pages** → **D1** → `passport24-voucher-production`
2. **Console** タブを開く
3. GitHubリポジトリから各マイグレーションファイルを開く:
   - https://github.com/infourbandirection-spec/tsuboi-premium/tree/main/migrations

4. **順番に16個のマイグレーションを実行:**

```
0001_initial_schema.sql
0002_add_email_field.sql
0003_add_kana_field.sql
0004_lottery_system.sql
0005_admin_users.sql
0006_email_logs.sql
0007_add_reservation_phase.sql
0008_add_pickup_tracking.sql
0009_add_excluded_fields.sql
0010_update_store_master.sql
0011_remove_karashima_stores.sql
0012_consolidate_stores.sql
0013_update_store_name_ichinobey.sql
0014_fix_store_master_table.sql
0015_simplify_usage_description.sql
0016_change_quantity_limit_to_3.sql
```

**各ファイルの内容をコピー&ペーストして実行してください。**

---

## ✅ 完了確認チェックリスト

すべての設定が完了したら、以下を確認:

### 基本機能:
- [ ] https://tsuboi-premium.pages.dev/ が表示される
- [ ] 店舗名が「一畳屋ショールーム」
- [ ] 冊数選択が1～3冊
- [ ] 予約フォームが動作する

### データベース:
- [ ] D1バインディングが設定されている
- [ ] 16個のマイグレーションすべて実行済み
- [ ] `/api/stores` で正しい店舗情報が返る

### KV Storage:
- [ ] CSRF_TOKENSバインディングが設定されている
- [ ] RATE_LIMITバインディングが設定されている

### メール機能:
- [ ] 環境変数 RESEND_API_KEY が設定されている
- [ ] 環境変数 RESEND_FROM_EMAIL が設定されている
- [ ] テスト予約でメールが届く

### 管理機能:
- [ ] `/admin` にログインできる（urbandirection/urbandirection）
- [ ] 予約一覧が表示される
- [ ] ステータス変更が動作する
- [ ] メールログが表示される

---

## 📞 確認方法

### 店舗情報の確認:

```bash
curl https://tsuboi-premium.pages.dev/api/stores
```

**期待される結果:**
```json
{
  "success": true,
  "data": [
    {
      "store_name": "一畳屋ショールーム",
      "address": "熊本県熊本市中央区坪井5丁目2-27"
    }
  ]
}
```

**現在の結果（不正確）:**
- 5店舗が表示される（正しくは1店舗のみ）
- 店舗名が「パスート24」（正しくは「一畳屋ショールーム」）

---

## 🔗 必要なURL

### Cloudflare設定:
- **Pages管理**: https://dash.cloudflare.com/e74e780cd3e5705ede60a66c07a3d2bb/pages/view/tsuboi-premium
- **D1 Console**: https://dash.cloudflare.com/e74e780cd3e5705ede60a66c07a3d2bb/workers/d1

### GitHub:
- **マイグレーションフォルダ**: https://github.com/infourbandirection-spec/tsuboi-premium/tree/main/migrations

---

## 🎯 今すぐ実行すること

1. **D1バインディングを設定** → Settings → Functions → D1 database bindings
2. **KVバインディングを設定** → 同じページでKV namespace bindings
3. **再デプロイ** → Deployments → Retry deployment
4. **D1マイグレーション適用** → D1 Console で16個のファイルを実行
5. **動作確認** → 店舗名が「一畳屋ショールーム」になっているか確認

---

**設定完了後、システムが完全に動作可能になります！** 🚀

# 重複チェック除外機能のテスト手順

## 📋 確認内容

抽選から除外した応募が、重複チェックリストに表示されなくなることを確認します。

---

## ✅ 実装内容

### 修正箇所
- **ファイル**: `src/index.tsx`
- **API**: `/api/admin/reservations/check-duplicates/name`（氏名での重複チェック）
- **API**: `/api/admin/reservations/check-duplicates/phone`（電話番号での重複チェック）

### 修正内容
```sql
-- 修正前
WHERE status = 'reserved'

-- 修正後  
WHERE status = 'reserved' AND (excluded_from_lottery = 0 OR excluded_from_lottery IS NULL)
```

### ビルド確認
```bash
cd /home/user/webapp/dist
grep "WHERE status = 'reserved' AND (excluded_from_lottery" _worker.js
```

✅ 結果: 2箇所で確認済み（氏名・電話番号の両方）

---

## 🧪 テスト手順

### 前提条件
- 本番DBに重複応募データが存在すること
- 管理画面にログインできること

---

### ステップ1: 現在の重複リストを確認

1. **管理画面にアクセス**
   ```
   https://tsuboi-premium.pages.dev/admin
   ```

2. **キャッシュをクリア**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

3. **重複チェックタブをクリック**

4. **重複応募を確認**
   - 氏名での重複
   - 電話番号での重複

📸 **スクリーンショットを撮影**（テスト前の状態）

---

### ステップ2: 抽選除外を実行

1. **重複リストから1つ選択**
   - 例: 氏名「山田太郎」が2件重複

2. **いずれかの応募の「抽選から除外」ボタンをクリック**

3. **除外理由を入力**
   ```
   重複応募のため除外
   ```

4. **確認ボタンをクリック**

5. **成功メッセージを確認**
   ```
   ✓ 抽選除外を設定しました
   ```

---

### ステップ3: 重複リストを再確認

1. **ブラウザをリフレッシュ**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **重複チェックタブを再度確認**

3. **除外した応募が消えているか確認**
   - ✅ 除外した応募がリストから消えている
   - ✅ 残りの応募のみが表示されている

📸 **スクリーンショットを撮影**（テスト後の状態）

---

### ステップ4: データベースで確認（オプション）

Cloudflare D1 Console で直接確認:

```sql
-- 除外された応募を確認
SELECT reservation_id, full_name, phone_number, excluded_from_lottery, excluded_reason
FROM reservations
WHERE excluded_from_lottery = 1;

-- 重複チェック対象の応募を確認
SELECT full_name, COUNT(*) as count
FROM reservations
WHERE status = 'reserved' AND (excluded_from_lottery = 0 OR excluded_from_lottery IS NULL)
GROUP BY full_name
HAVING COUNT(*) > 1;
```

---

## ❌ 問題が発生した場合

### 症状1: 除外しても重複リストに表示される

**原因**: キャッシュが残っている

**解決策**:
1. ハードリフレッシュ（Ctrl+Shift+R / Cmd+Shift+R）
2. ブラウザのキャッシュをクリア
3. シークレットモードで確認

---

### 症状2: 除外ボタンが動作しない

**原因**: セッションが切れている

**解決策**:
1. 一度ログアウト
2. 再度ログイン
3. 重複チェックタブで再実行

---

### 症状3: デプロイが反映されていない

**確認方法**:
1. Git commit ID を確認
   ```bash
   cd /home/user/webapp
   git log --oneline -1
   ```
   期待: `8a02f5b Exclude lottery-excluded reservations from duplicate check list`

2. ビルドファイルを確認
   ```bash
   cd /home/user/webapp/dist
   grep "excluded_from_lottery" _worker.js | wc -l
   ```
   期待: `4`

3. Cloudflare Pages のデプロイ履歴を確認
   - https://dash.cloudflare.com/
   - Workers & Pages → tsuboi-premium → Deployments
   - 最新デプロイが `8a02f5b` であることを確認

---

## 📞 サポート

問題が解決しない場合は、以下の情報を共有してください:

1. スクリーンショット（テスト前・テスト後）
2. 実行したステップ
3. エラーメッセージ（あれば）
4. ブラウザの種類とバージョン

---

**作成日**: 2026-03-05  
**Git Commit**: 8a02f5b  
**デプロイ状況**: ✅ 完了

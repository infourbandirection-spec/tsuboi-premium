# 用語統一：「予約」→「応募」への変更完了報告

## 📋 変更概要
**2026-03-04 実施**

パスート24プレミアム商品券システム全体で、ユーザー向け用語を「予約」から「応募」に統一しました。

---

## ✅ 変更完了箇所

### 1. **フロントエンド（ユーザー向け）**
- ✅ トップページ：「予約」→「応募」
- ✅ 応募フォーム：全てのラベルとボタン
- ✅ 応募完了ページ：「予約ID」→「応募ID」
- ✅ 検索ページ：「予約IDで検索」→「応募IDで検索」

### 2. **管理画面**
- ✅ メニュータブ：「予約一覧」→「応募一覧」
- ✅ メニュータブ：「予約検索」→「応募検索」
- ✅ テーブルヘッダー：「予約ID」→「応募ID」
- ✅ 検索UI：全ての「予約ID」→「応募ID」
- ✅ 詳細表示：全ての「予約ID」→「応募ID」
- ✅ CSVエクスポート：ヘッダーを「応募ID」に統一

### 3. **バックエンド（内部）**
- ⚠️ **データベース**: テーブル名 `reservations`、カラム名 `reservation_id` は内部実装のため変更なし
- ⚠️ **API変数**: バックエンド変数名は互換性のため `reservation_id` のまま
- ✅ **APIレスポンス**: フロントエンドでは「応募ID」として表示

---

## 🔍 検証方法

### ユーザー側の確認
1. **トップページ**: https://passurt24.pages.dev
   - タイトルに「応募」と表示
   - ボタンが「今すぐ応募」

2. **応募完了ページ**: https://passurt24.pages.dev/success?id=PRE-20260304-5SHY6Q
   - 「応募ID」と表示
   - コピーボタンが機能

3. **検索ページ**: https://passurt24.pages.dev/lookup
   - 「応募IDで検索」と表示

### 管理画面の確認
1. **管理画面**: https://passurt24.pages.dev/admin
2. ログイン後、ブラウザキャッシュをクリア（Ctrl + Shift + R）
3. 確認項目：
   - ✅ タブが「応募一覧」
   - ✅ タブが「応募検索」
   - ✅ テーブルヘッダーが「応募ID」
   - ✅ 検索結果で「応募ID」表示
   - ✅ 詳細モーダルで「応募ID」表示

---

## ⚠️ ブラウザキャッシュに関する注意

### 問題
管理画面で古い表記（「予約ID」「予約検索」）が表示される場合があります。

### 原因
ブラウザが古い `admin.js` をキャッシュしているため。

### 解決方法

#### 1. **ハードリフレッシュ（推奨）**
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Command + Shift + R`

#### 2. **完全なキャッシュクリア**
- Chrome/Edge: `Ctrl + Shift + Delete` → 「キャッシュされた画像とファイル」を削除
- Firefox: `Ctrl + Shift + Delete` → 「キャッシュ」を削除
- Safari: 開発 → 「キャッシュを空にする」

#### 3. **確認用URL**
最新のデプロイURL（キャッシュなし）:
- https://533312bc.passurt24.pages.dev/admin

---

## 📊 データベース構造（内部）

### reservations テーブル
```sql
CREATE TABLE reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id TEXT NOT NULL,  -- 内部実装（変更なし）
  birth_date TEXT NOT NULL,
  full_name TEXT NOT NULL,
  kana TEXT,
  phone_number TEXT NOT NULL,
  email TEXT,
  quantity INTEGER NOT NULL,
  store_location TEXT NOT NULL,
  pickup_date TEXT NOT NULL,
  pickup_time_slot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved',
  reservation_phase INTEGER NOT NULL DEFAULT 1,
  lottery_status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**重要**: データベース構造は互換性のため変更していません。フロントエンドで「応募ID」として表示しています。

---

## 🚀 デプロイ情報

- **本番URL**: https://passurt24.pages.dev
- **最新デプロイ**: https://533312bc.passurt24.pages.dev
- **デプロイ日時**: 2026-03-04
- **ビルドサイズ**: 95.44 kB

---

## 📝 Git コミット履歴

```
200e4c3 - refactor: 管理画面「予約検索」を「応募検索」に統一
350db80 - refactor: 検索結果表示から氏名・電話番号・受取店舗を削除し、その他情報を追加
d60a024 - fix: 応募時にメールアドレスがDBに保存されない問題を修正
6a45246 - fix: 応募IDコピーボタンのJavaScriptエラー修正
a2d4390 - docs: メール送信元アドレス変更ドキュメント作成
65651dc - refactor: 管理画面の用語統一 - 予約→応募に変更
9337916 - refactor: システム全体で「予約」を「応募」に統一
```

---

## 📞 サポート

問題が発生した場合:
1. ブラウザキャッシュをクリア
2. 最新デプロイURL（https://533312bc.passurt24.pages.dev）で確認
3. それでも問題がある場合は info.urbandirection@gmail.com へ連絡

---

## 📅 更新履歴

- **2026-03-04**: 用語統一完了、管理画面タブ名修正
- **2026-03-03**: システム全体の「予約」→「応募」変更開始

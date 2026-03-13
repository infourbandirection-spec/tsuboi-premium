# 応募一覧の検索機能改善

## 修正日時
2026-03-13

## 問題
応募一覧の検索入力フィールドで文字を入力している途中で検索が実行され、入力がリセットされる問題がありました。

**原因**:
- `oninput` イベントで 300ms のデバウンスを使用して自動検索を実行
- 検索実行時に `loadData()` → `render()` が呼ばれ、DOM が再描画される
- 再描画により入力フィールドがリセットされ、ユーザーの入力が中断される

---

## 修正内容

### 1. 検索ボタンの追加

**UI の変更**:
```javascript
// 修正前: 入力フィールドのみ
<input type="text" id="filterSearch" 
       placeholder="応募ID、氏名、または電話番号で検索..." 
       oninput="adminApp.applyFilters()"
       class="w-full px-4 py-2 ...">

// 修正後: 入力フィールド + 検索ボタン
<div class="flex gap-2">
  <input type="text" id="filterSearch" 
         placeholder="応募ID、氏名、または電話番号で検索..." 
         onkeypress="if(event.key === 'Enter') adminApp.applySearchFilter()"
         class="flex-1 px-4 py-2 ...">
  <button onclick="adminApp.applySearchFilter()" 
          class="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-bold whitespace-nowrap">
    <i class="fas fa-search mr-1"></i> 検索
  </button>
</div>
```

---

### 2. 検索ロジックの分離

**関数の変更**:

#### **新しい関数: `applySearchFilter()`**
```javascript
async applySearchFilter() {
  // 検索ボタン専用の関数
  this.filters.search = document.getElementById('filterSearch')?.value || ''
  await this.loadData()
  this.render()
}
```

#### **修正した関数: `applyFilters()`**
```javascript
// 修正前: 全てのフィルタを適用（デバウンス付き）
async applyFilters(immediate = false) {
  if (!immediate) {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer)
    }
    
    this.searchDebounceTimer = setTimeout(async () => {
      await this.applyFilters(true)
    }, 300)
    return
  }
  
  this.filters.status = document.getElementById('filterStatus')?.value || ''
  this.filters.lottery_status = document.getElementById('filterLotteryStatus')?.value || ''
  this.filters.date = document.getElementById('filterDate')?.value || ''
  this.filters.search = document.getElementById('filterSearch')?.value || ''
  await this.loadData()
  this.render()
}

// 修正後: ドロップダウンのみ（検索ボックスは含まない）
async applyFilters() {
  this.filters.status = document.getElementById('filterStatus')?.value || ''
  this.filters.lottery_status = document.getElementById('filterLotteryStatus')?.value || ''
  this.filters.date = document.getElementById('filterDate')?.value || ''
  // 検索ボックスの値は変更しない（既存の値を保持）
  await this.loadData()
  this.render()
}
```

---

### 3. デバウンス機能の削除

```javascript
// 修正前: constructor に searchDebounceTimer を追加
constructor() {
  // ...
  this.searchDebounceTimer = null  // デバウンス用タイマー
  // ...
}

// 修正後: searchDebounceTimer を削除
constructor() {
  // ...（searchDebounceTimer なし）
  // ...
}
```

---

## 動作の変更

### **修正前**
| アクション | 動作 |
|-----------|------|
| 検索ボックスに入力 | 300ms 後に自動検索実行 → DOM 再描画 → 入力がリセット ❌ |
| ドロップダウン変更 | 即座にフィルタ実行 |
| 日付選択 | 即座にフィルタ実行 |

### **修正後**
| アクション | 動作 |
|-----------|------|
| 検索ボックスに入力 | 何も起こらない（自由に入力可能） ✅ |
| 検索ボタンをクリック | 検索実行 → 結果表示 ✅ |
| Enter キーを押す | 検索実行 → 結果表示 ✅ |
| ドロップダウン変更 | 即座にフィルタ実行（検索ボックスの値は保持） ✅ |
| 日付選択 | 即座にフィルタ実行（検索ボックスの値は保持） ✅ |

---

## ユーザー体験の改善

### **問題点の解消**
✅ 入力中に検索がかからない  
✅ 入力フィールドがリセットされない  
✅ ユーザーが意図したタイミングで検索できる  
✅ Enter キーでも検索できる（キーボード操作）  

### **操作の流れ**
1. 検索ボックスに応募ID・氏名・電話番号を入力
2. **検索ボタンをクリック** または **Enter キーを押す**
3. 検索結果が表示される
4. 必要に応じてドロップダウン（ステータス・抽選結果・日付）で絞り込み
5. 検索ボックスの値は保持されたまま

---

## 検証手順

1. **管理画面にアクセス**
   - URL: https://tsuboi-premium.pages.dev/admin
   - キャッシュクリア (Ctrl+Shift+R / Cmd+Shift+R)

2. **応募一覧タブを開く**

3. **検索ボックスに文字を入力**
   - 例: 応募ID「A1234567」を入力
   - **途中で検索が実行されないことを確認** ✅
   - **入力がリセットされないことを確認** ✅

4. **検索ボタンをクリック**
   - 検索結果が表示される ✅

5. **Enter キーでも検索できることを確認**
   - 検索ボックスにカーソルがある状態で Enter を押す
   - 検索結果が表示される ✅

6. **ドロップダウンと組み合わせ**
   - 検索後にステータスや抽選結果で絞り込み
   - 検索ボックスの値は保持されたまま ✅

7. **リセットボタンで全てクリア**
   - 全てのフィルタがリセットされる ✅

---

## デプロイ情報
- **ビルド**: `dist/_worker.js` (120.21 kB)
- **Git コミット**: `94dcd2e`
- **GitHub リポジトリ**: https://github.com/infourbandirection-spec/tsuboi-premium
- **Cloudflare Pages**: 自動デプロイ完了（約90秒待機）

---

## 関連ドキュメント
- [管理画面の修正記録](./ADMIN_FIXES.md)
- [除外応募の統計処理](./ADMIN_STATISTICS_EXCLUSION.md)
- [GitHub リポジトリ](https://github.com/infourbandirection-spec/tsuboi-premium)

---

## まとめ

✅ **問題解決**: 入力中に検索が実行されることがなくなった  
✅ **操作性向上**: 検索ボタンで明示的に検索実行  
✅ **キーボード操作**: Enter キーでも検索可能  
✅ **フィルタの保持**: ドロップダウン変更時も検索条件を保持  

**キャッシュをクリアして動作確認をお願いします！** (Ctrl+Shift+R / Cmd+Shift+R)

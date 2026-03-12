# 失敗メール再送機能 実装指示書

## 概要
メール送信失敗時に、管理画面から失敗したメールのみを再送できる機能を実装します。最新の送信結果のみを確認するため、重複送信を防止します。

---

## 前提条件

### 必要なテーブル
- **reservations**: 予約情報テーブル
- **email_logs**: メール送信ログテーブル

### email_logs テーブル構造
```sql
CREATE TABLE email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'confirmation', 'winner', 'loser' など
  subject TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failed'
  message_id TEXT,
  error_message TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);
```

---

## 実装手順

### 1. バックエンドAPI実装

#### ファイル: `src/index.tsx`

メール送信ログAPI（`/api/admin/email-logs`）の後に、以下のAPIを追加してください：

```typescript
// 失敗したメールを再送するAPI
app.post('/api/admin/resend-failed-emails', async (c) => {
  const authResponse = await verifySessionToken(c)
  if (authResponse) return authResponse

  try {
    const db = c.env.DB
    
    // 失敗したメールログを取得（当選メールのみ、最新の送信結果のみ）
    // サブクエリで各reservation_idの最新sent_atを取得し、そのステータスがfailedのものだけを抽出
    const failedEmails = await db.prepare(`
      SELECT DISTINCT r.reservation_id, e.recipient_email, r.full_name, r.quantity, 
             r.store_location, r.pickup_date, r.pickup_time_slot
      FROM reservations r
      INNER JOIN email_logs e ON r.reservation_id = e.reservation_id
      WHERE r.lottery_status = 'won'
      AND e.email_type = 'winner'
      AND e.sent_at = (
        SELECT MAX(sent_at) 
        FROM email_logs 
        WHERE reservation_id = r.reservation_id 
        AND email_type = 'winner'
      )
      AND e.status = 'failed'
      ORDER BY e.sent_at DESC
    `).all()

    if (!failedEmails.results || failedEmails.results.length === 0) {
      return c.json({
        success: true,
        message: '再送対象のメールがありません',
        sent: 0,
        failed: 0
      })
    }

    let successCount = 0
    let failCount = 0
    const failedRecipients: string[] = []

    // 各メールを再送
    for (const record of failedEmails.results) {
      const r = record as any
      
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html lang="ja">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>当選のお知らせ</title>
          </head>
          <body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎉 当選おめでとうございます！</h1>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                ${r.full_name} 様
              </p>
              
              <p style="font-size: 14px; margin-bottom: 20px;">
                プレミアム商品券の抽選に当選されました！<br>
                以下の内容をご確認ください。
              </p>
              
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
                <h2 style="color: #667eea; font-size: 18px; margin-top: 0;">📋 当選内容</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 10px 0; font-weight: bold; color: #495057;">応募ID</td>
                    <td style="padding: 10px 0; text-align: right;">${r.reservation_id}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 10px 0; font-weight: bold; color: #495057;">当選冊数</td>
                    <td style="padding: 10px 0; text-align: right; color: #667eea; font-size: 18px; font-weight: bold;">${r.quantity}冊</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 10px 0; font-weight: bold; color: #495057;">購入場所</td>
                    <td style="padding: 10px 0; text-align: right;">${r.store_location}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 10px 0; font-weight: bold; color: #495057;">購入日</td>
                    <td style="padding: 10px 0; text-align: right;">${r.pickup_date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #495057;">購入時間</td>
                    <td style="padding: 10px 0; text-align: right;">${r.pickup_time_slot}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
                <h3 style="color: #856404; font-size: 16px; margin-top: 0;">⚠️ 重要なお知らせ</h3>
                <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
                  <li>指定の購入日・時間帯に必ずご来店ください</li>
                  <li>本人確認書類（免許証・保険証等）をご持参ください</li>
                  <li>購入期限を過ぎると無効となりますのでご注意ください</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <p style="font-size: 12px; color: #6c757d; margin: 5px 0;">
                  坪井繁栄会 プレミアム商品券事務局
                </p>
                <p style="font-size: 12px; color: #6c757d; margin: 5px 0;">
                  このメールは自動送信されています
                </p>
              </div>
            </div>
          </body>
          </html>
        `

        const result = await sendEmail(
          r.recipient_email,
          '【プレミアム商品券】当選のお知らせ',
          emailHtml,
          c.env,
          r.reservation_id,
          'winner'
        )

        if (result.success) {
          successCount++
        } else {
          failCount++
          failedRecipients.push(`${r.recipient_email} (${r.full_name})`)
        }

        // レート制限対策：50msの待機
        await new Promise(resolve => setTimeout(resolve, 50))

      } catch (error) {
        console.error(`Failed to resend email to ${r.recipient_email}:`, error)
        failCount++
        failedRecipients.push(`${r.recipient_email} (${r.full_name})`)
      }
    }

    return c.json({
      success: true,
      message: `メール再送完了: 成功 ${successCount}件、失敗 ${failCount}件`,
      sent: successCount,
      failed: failCount,
      failedRecipients: failedRecipients
    })

  } catch (error) {
    logSecureError('ResendFailedEmails', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})
```

**重要ポイント**:
- `WHERE r.lottery_status = 'won'` の部分は、プロジェクトに応じて変更してください
- `e.email_type = 'winner'` の部分も、再送対象のメールタイプに合わせて変更してください
- メールHTMLテンプレートは、プロジェクトのデザインに合わせてカスタマイズしてください
- `sendEmail()` 関数は既存の実装を使用してください

---

### 2. フロントエンド実装

#### ファイル: `public/static/admin.js`

既存の抽選管理関数の後に、以下の関数を追加してください：

```javascript
// 失敗したメールを再送
async resendFailedEmails() {
  if (!confirm('失敗したメールを再送しますか？\n\n当選メールのうち、送信に失敗したものを再送信します。')) {
    return
  }

  try {
    const resendButton = document.getElementById('resend-failed-emails-btn')
    if (resendButton) {
      resendButton.disabled = true
      resendButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>再送信中...'
    }

    const token = localStorage.getItem('adminToken')
    const response = await fetch('/api/admin/resend-failed-emails', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const data = await response.json()

    if (data.success) {
      let message = `メール再送が完了しました！\n\n`
      message += `成功: ${data.sent}件\n`
      message += `失敗: ${data.failed}件\n`
      
      if (data.failed > 0 && data.failedRecipients && data.failedRecipients.length > 0) {
        message += `\n⚠️ 失敗した宛先:\n`
        message += data.failedRecipients.slice(0, 10).join('\n')
        if (data.failedRecipients.length > 10) {
          message += `\n...他 ${data.failedRecipients.length - 10}件`
        }
      } else if (data.sent === 0) {
        message = '再送対象のメールがありません'
      } else {
        message += `\n✅ 全てのメールが正常に送信されました`
      }

      alert(message)
      await this.loadData()
      this.render()
    } else {
      alert('エラー: ' + data.error)
    }
  } catch (error) {
    console.error('Resend failed emails error:', error)
    alert('システムエラーが発生しました')
  } finally {
    const resendButton = document.getElementById('resend-failed-emails-btn')
    if (resendButton) {
      resendButton.disabled = false
      resendButton.innerHTML = '<i class="fas fa-redo mr-2"></i>失敗メール再送'
    }
  }
}
```

---

### 3. UI ボタンの追加

抽選管理画面の「メール一括送信」ボタンの後に、再送ボタンを追加してください：

```javascript
// renderLottery() メソッド内のメール送信ボタンの後に追加
<button id="send-lottery-emails-btn" onclick="adminApp.sendLotteryEmails()" 
        class="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 font-bold text-lg shadow-lg transition">
  <i class="fas fa-envelope-open-text mr-2"></i>
  メール一括送信
</button>

<!-- 再送ボタンを追加 -->
<button id="resend-failed-emails-btn" onclick="adminApp.resendFailedEmails()" 
        class="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 font-bold text-lg shadow-lg transition">
  <i class="fas fa-redo mr-2"></i>
  失敗メール再送
</button>
```

---

## カスタマイズポイント

### 1. 再送対象の条件変更
プロジェクトに応じて、SQLクエリの `WHERE` 句を変更してください：

```sql
-- 例1: 予約確認メールの失敗を再送
WHERE e.email_type = 'confirmation'
AND e.status = 'failed'

-- 例2: 特定の日付以降の失敗メールを再送
WHERE e.email_type = 'winner'
AND e.status = 'failed'
AND e.sent_at >= '2026-03-01'

-- 例3: 特定のエラーメッセージの失敗メールのみ再送
WHERE e.email_type = 'winner'
AND e.status = 'failed'
AND e.error_message LIKE '%rate limit%'
```

### 2. メールテンプレートの変更
`emailHtml` 変数の内容を、プロジェクトのデザインに合わせて変更してください。

### 3. レート制限の調整
メール送信API（Resend, SendGrid等）のレート制限に応じて、待機時間を調整してください：

```typescript
// 待機時間を変更（ミリ秒）
await new Promise(resolve => setTimeout(resolve, 100))  // 100ms待機
```

### 4. エラーハンドリングの追加
プロジェクトのログ記録方式に合わせて、エラーハンドリングをカスタマイズしてください。

---

## 動作確認

### 1. 失敗メールの作成（テスト）
テスト環境で意図的に失敗メールを作成してください：

```sql
-- テスト用の失敗ログを手動で挿入
INSERT INTO email_logs (reservation_id, recipient_email, email_type, subject, status, error_message)
VALUES ('TEST-001', 'test@example.com', 'winner', 'テスト当選メール', 'failed', 'Test error');
```

### 2. 再送ボタンのテスト
1. 管理画面にアクセス
2. 抽選管理タブを開く
3. 「失敗メール再送」ボタンをクリック
4. 結果を確認

### 3. 重複送信の確認
以下のSQLで重複送信がないことを確認してください：

```sql
-- 同じ応募IDに複数回成功メールが送信されていないか確認
SELECT 
  reservation_id,
  recipient_email,
  COUNT(*) as success_count,
  GROUP_CONCAT(sent_at) as sent_times
FROM email_logs
WHERE email_type = 'winner'
AND status = 'success'
GROUP BY reservation_id, recipient_email
HAVING COUNT(*) > 1
ORDER BY success_count DESC;
```

**期待される結果**: 0件（重複送信がない）

---

## トラブルシューティング

### Q1: 「再送対象のメールがありません」と表示される
**原因**: 失敗したメールログが存在しない、または全て再送済み
**対処**: データベースで `SELECT * FROM email_logs WHERE status='failed'` を実行して確認

### Q2: 再送しても同じメールアドレスで失敗し続ける
**原因**: メールアドレスが無効、または受信拒否設定
**対処**: 
- メールアドレスの正当性を確認
- 別の連絡手段（電話、SMS等）を検討

### Q3: 再送ボタンが動作しない
**原因**: JavaScriptエラー、または認証トークン期限切れ
**対処**:
- ブラウザのコンソールでエラーを確認
- ログアウト→再ログイン
- キャッシュクリア

### Q4: レート制限エラーが発生
**原因**: メール送信APIの制限を超過
**対処**:
- 待機時間を長くする（`setTimeout` の値を増やす）
- または有料プランにアップグレード

---

## セキュリティ考慮事項

1. **認証チェック**: `verifySessionToken()` で管理者権限を確認
2. **SQLインジェクション対策**: プリペアドステートメントを使用
3. **レート制限**: 連続送信を防ぐため、50ms の待機時間を設定
4. **エラーログ**: 機密情報（メールアドレス等）をログに記録しない

---

## 参考情報

### 最新の送信結果のみを確認するロジック
```sql
-- サブクエリで各reservation_idの最新sent_atを取得
e.sent_at = (
  SELECT MAX(sent_at) 
  FROM email_logs 
  WHERE reservation_id = r.reservation_id 
  AND email_type = 'winner'
)
```

このロジックにより：
- 再送で成功した人は、次回の再送対象から除外される
- 古い失敗レコードが残っていても、重複送信されない
- 最新の送信結果のみが判定される

---

## まとめ

この実装により：
- ✅ 失敗したメールのみを再送できる
- ✅ 重複送信を防止できる
- ✅ 管理画面から簡単に操作できる
- ✅ 送信結果を即座に確認できる

実装後は、必ずテスト環境で動作確認してから本番環境にデプロイしてください。

// メール送信関数
async function sendEmail(to, subject, html, apiKey, fromEmail) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: html
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', data)
      return { 
        success: false, 
        error: data.message || 'Failed to send email' 
      }
    }

    console.log('Email sent successfully:', data.id)
    return { 
      success: true, 
      messageId: data.id 
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}

// Phase 1予約完了メールテンプレート
function getPhase1ReservationEmail() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>予約完了のお知らせ</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #10b981, #3b82f6); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🎫 プレミアム商品券 予約完了</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p><strong>泉様</strong></p>
    
    <p>プレミアム商品券の予約が完了しました。</p>
    
    <p style="color: #ef4444; font-weight: bold;">※抽選結果は後日メールでお知らせいたします。</p>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <h2 style="color: #1f2937; font-size: 18px; margin-top: 0;">予約内容</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">予約ID:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #3b82f6;">TEST-20260301-ABC123</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">予約区分:</td>
          <td style="padding: 8px 0; font-weight: bold;">Phase 1（抽選）</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">冊数:</td>
          <td style="padding: 8px 0; font-weight: bold;">3冊</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取店舗:</td>
          <td style="padding: 8px 0;">株式会社パスート24（熊本県熊本市中央区中央街4-29）</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取日:</td>
          <td style="padding: 8px 0;">2026年3月16日</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取時間:</td>
          <td style="padding: 8px 0;">12:00-13:00</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">⚠️ 重要な注意事項</h3>
      <ul style="margin: 10px 0; padding-left: 20px; color: #78350f;">
        <li>予約IDは必ず控えてください</li>
        <li>受取時には身分証明証をご持参ください</li>
        <li>ご本人様のみ受け取り可能です（代理人不可）</li>
        <li>受取予定日を過ぎると自動的にキャンセルされます</li>
      </ul>
    </div>
    
    <p style="text-align: center; margin-top: 30px;">
      <a href="https://3000-ias0xb1bnq0w0e36xso19-cc2fbc16.sandbox.novita.ai/lookup" 
         style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        予約内容を確認する
      </a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      これはテストメールです。<br>
      実際のシステムからは自動送信されます。
    </p>
  </div>
</body>
</html>
  `.trim()
}

// Phase 2予約完了メールテンプレート
function getPhase2ReservationEmail() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>予約完了のお知らせ</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #10b981, #3b82f6); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🎫 プレミアム商品券 予約完了</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p><strong>泉様</strong></p>
    
    <p>プレミアム商品券の予約が完了しました。</p>
    
    <p style="color: #10b981; font-weight: bold;">※先着順での予約が確定しました。</p>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <h2 style="color: #1f2937; font-size: 18px; margin-top: 0;">予約内容</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">予約ID:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #3b82f6;">TEST-20260301-XYZ789</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">予約区分:</td>
          <td style="padding: 8px 0; font-weight: bold;">Phase 2（先着順）</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">冊数:</td>
          <td style="padding: 8px 0; font-weight: bold;">2冊</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取店舗:</td>
          <td style="padding: 8px 0;">株式会社パスート24（熊本県熊本市中央区中央街4-29）</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取日:</td>
          <td style="padding: 8px 0;">2026年3月20日</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取時間:</td>
          <td style="padding: 8px 0;">15:00-16:00</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">⚠️ 重要な注意事項</h3>
      <ul style="margin: 10px 0; padding-left: 20px; color: #78350f;">
        <li>予約IDは必ず控えてください</li>
        <li>受取時には身分証明証をご持参ください</li>
        <li>ご本人様のみ受け取り可能です（代理人不可）</li>
        <li>受取予定日を過ぎると自動的にキャンセルされます</li>
      </ul>
    </div>
    
    <p style="text-align: center; margin-top: 30px;">
      <a href="https://3000-ias0xb1bnq0w0e36xso19-cc2fbc16.sandbox.novita.ai/lookup" 
         style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        予約内容を確認する
      </a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      これはテストメールです。<br>
      実際のシステムからは自動送信されます。
    </p>
  </div>
</body>
</html>
  `.trim()
}

// 当選メールテンプレート
function getWinnerEmail() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>抽選結果のお知らせ（当選）</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #10b981, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🎉 抽選結果のお知らせ</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p><strong>泉様</strong></p>
    
    <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <h2 style="color: #065f46; font-size: 28px; margin: 0;">✅ おめでとうございます！</h2>
      <p style="color: #047857; font-size: 18px; font-weight: bold; margin: 10px 0;">当選されました</p>
    </div>
    
    <p>プレミアム商品券の抽選に当選いたしました。<br>
    以下の日時にご来店いただき、商品券をお受け取りください。</p>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h2 style="color: #1f2937; font-size: 18px; margin-top: 0;">受取情報</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">予約ID:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #10b981;">TEST-20260301-ABC123</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">冊数:</td>
          <td style="padding: 8px 0; font-weight: bold;">3冊</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取店舗:</td>
          <td style="padding: 8px 0;">株式会社パスート24（熊本県熊本市中央区中央街4-29）</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取日:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">2026年3月16日</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取時間:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">12:00-13:00</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">⚠️ 受取時の注意事項</h3>
      <ul style="margin: 10px 0; padding-left: 20px; color: #78350f;">
        <li><strong>身分証明証を必ずご持参ください</strong></li>
        <li><strong>ご本人様のみ受け取り可能です</strong>（代理人不可）</li>
        <li>受取予定日を過ぎると自動的にキャンセルされます</li>
        <li>予約IDをお控えください</li>
      </ul>
    </div>
    
    <p style="text-align: center; margin-top: 30px;">
      <a href="https://3000-ias0xb1bnq0w0e36xso19-cc2fbc16.sandbox.novita.ai/lookup" 
         style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        予約内容を確認する
      </a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      これはテストメールです。<br>
      実際のシステムからは自動送信されます。
    </p>
  </div>
</body>
</html>
  `.trim()
}

// 落選メールテンプレート
function getLoserEmail() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>抽選結果のお知らせ</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #6b7280, #4b5563); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">抽選結果のお知らせ</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p><strong>泉様</strong></p>
    
    <div style="background: #f3f4f6; border-left: 4px solid #6b7280; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="color: #374151; font-size: 16px; margin: 0;">
        誠に申し訳ございませんが、今回の抽選では残念ながら落選となりました。
      </p>
    </div>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6b7280;">
      <h2 style="color: #1f2937; font-size: 18px; margin-top: 0;">応募情報</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">予約ID:</td>
          <td style="padding: 8px 0; font-weight: bold;">TEST-20260301-DEF456</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">応募冊数:</td>
          <td style="padding: 8px 0; font-weight: bold;">2冊</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #1e40af; margin-top: 0; font-size: 16px;">📢 Phase 2（先着順）のご案内</h3>
      <p style="color: #1e3a8a; margin: 10px 0;">
        現在、Phase 2の先着順予約を受付中です。<br>
        引き続きご応募いただけますので、ぜひご検討ください。
      </p>
    </div>
    
    <p style="text-align: center; margin-top: 30px;">
      <a href="https://3000-ias0xb1bnq0w0e36xso19-cc2fbc16.sandbox.novita.ai/" 
         style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Phase 2 予約ページへ
      </a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      これはテストメールです。<br>
      実際のシステムからは自動送信されます。
    </p>
  </div>
</body>
</html>
  `.trim()
}

// メイン関数
async function main() {
  const apiKey = 're_2oYH4UPg_GTPFCMFneHTws4WCzfLPGH9N'
  const fromEmail = 'onboarding@resend.dev'
  const toEmail = 's.izumi@urbandirection.jp'

  console.log('📧 テストメール送信を開始します...')
  console.log(`送信先: ${toEmail}\n`)

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  // 1. Phase 1予約完了メール
  console.log('1️⃣ Phase 1 予約完了メール送信中...')
  const result1 = await sendEmail(
    toEmail,
    '[テスト] プレミアム商品券 予約完了のお知らせ（Phase 1）',
    getPhase1ReservationEmail(),
    apiKey,
    fromEmail
  )
  console.log(result1.success ? `✅ 送信成功: ${result1.messageId}` : `❌ 送信失敗: ${result1.error}`)
  await sleep(2000)

  // 2. Phase 2予約完了メール
  console.log('\n2️⃣ Phase 2 予約完了メール送信中...')
  const result2 = await sendEmail(
    toEmail,
    '[テスト] プレミアム商品券 予約完了のお知らせ（Phase 2）',
    getPhase2ReservationEmail(),
    apiKey,
    fromEmail
  )
  console.log(result2.success ? `✅ 送信成功: ${result2.messageId}` : `❌ 送信失敗: ${result2.error}`)
  await sleep(2000)

  // 3. 当選メール
  console.log('\n3️⃣ 抽選結果（当選）メール送信中...')
  const result3 = await sendEmail(
    toEmail,
    '[テスト] プレミアム商品券 抽選結果のお知らせ（当選）',
    getWinnerEmail(),
    apiKey,
    fromEmail
  )
  console.log(result3.success ? `✅ 送信成功: ${result3.messageId}` : `❌ 送信失敗: ${result3.error}`)
  await sleep(2000)

  // 4. 落選メール
  console.log('\n4️⃣ 抽選結果（落選）メール送信中...')
  const result4 = await sendEmail(
    toEmail,
    '[テスト] プレミアム商品券 抽選結果のお知らせ（落選）',
    getLoserEmail(),
    apiKey,
    fromEmail
  )
  console.log(result4.success ? `✅ 送信成功: ${result4.messageId}` : `❌ 送信失敗: ${result4.error}`)

  console.log('\n✅ すべてのテストメール送信が完了しました！')
  console.log(`\n📬 ${toEmail} の受信トレイをご確認ください。`)
  console.log('\n送信されたメール：')
  console.log('1. Phase 1 予約完了メール（抽選待ち）')
  console.log('2. Phase 2 予約完了メール（先着順確定）')
  console.log('3. 抽選結果メール（当選）')
  console.log('4. 抽選結果メール（落選）')
}

main()

// 落選メールのみをテスト送信
const RESEND_API_KEY = 're_2oYH4UPg_GTPFCMFneHTws4WCzfLPGH9N';
const FROM_EMAIL = 'info@urbandirection.jp';
const TEST_EMAIL = 'info.urbandirection@gmail.com';

// 落選メール
function getLoserEmail() {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>抽選結果のお知らせ</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📋 抽選結果のお知らせ</h1>
        </div>
        
        <div style="padding: 40px 20px;">
            <p style="font-size: 16px; line-height: 1.8; color: #333; margin-bottom: 20px;">
                テスト 様<br>
                パスート24プレミアム付商品券の抽選結果をお知らせいたします。
            </p>
            
            <div style="background: linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 30px;">
                <p style="color: #666; font-size: 16px; margin: 0;">
                    誠に申し訳ございませんが、<br>
                    <strong style="font-size: 18px;">今回は落選となりました</strong>
                </p>
            </div>
            
            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 30px 0;">
                <h2 style="color: #667eea; margin-top: 0; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">📋 応募内容</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666; width: 40%;">予約番号</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">TEST-LOSE-${Date.now()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666;">お名前</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">テスト 太郎</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; color: #666;">応募冊数</td>
                        <td style="padding: 12px 0; font-weight: bold;">2冊</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 30px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #333;">
                    <strong>📢 キャンセル待ちについて</strong><br>
                    当選者のキャンセルが発生した場合、落選者の中から順次ご連絡させていただく場合がございます。<br>
                    その際は、メールまたはお電話にてご案内いたします。
                </p>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.8; margin-top: 30px;">
                多数のご応募をいただき、誠にありがとうございました。<br>
                またの機会をお待ちしております。
            </p>
            
            <p style="font-size: 14px; color: #999; line-height: 1.8; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                ※このメールは自動送信されています。返信はできません。<br>
                ※テストメールのため、実際の抽選結果は含まれていません。
            </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; font-size: 13px; color: #999;">
                © 2026 パスート24プレミアム付商品券事務局
            </p>
        </div>
    </div>
</body>
</html>`;
}

// メール送信
async function sendLoserEmail() {
  console.log('============================================================');
  console.log('📧 落選メールテスト送信');
  console.log('============================================================');
  console.log(`送信元: ${FROM_EMAIL}`);
  console.log(`宛先: ${TEST_EMAIL}`);
  console.log(`件名: パスート24 プレミアム商品券 抽選結果のお知らせ\n`);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TEST_EMAIL],
        subject: 'パスート24 プレミアム商品券 抽選結果のお知らせ',
        html: getLoserEmail()
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ 送信成功！');
      console.log(`Email ID: ${data.id}\n`);
      console.log('============================================================');
      console.log(`📬 ${TEST_EMAIL} の受信トレイを確認してください`);
      console.log('============================================================');
    } else {
      console.error('❌ 送信失敗');
      console.error(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

sendLoserEmail();

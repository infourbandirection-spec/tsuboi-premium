// Resendドメイン認証完了後のテストスクリプト
// s.izumi@urbandirection.jp へテストメール送信

const RESEND_API_KEY = 're_2oYH4UPg_GTPFCMFneHTws4WCzfLPGH9N';
const FROM_EMAIL = 'info@urbandirection.jp';
const TO_EMAIL = 's.izumi@urbandirection.jp';

async function sendTestEmail() {
  console.log('='.repeat(60));
  console.log('📧 Resend ドメイン認証テスト');
  console.log('='.repeat(60));
  console.log(`送信元: ${FROM_EMAIL}`);
  console.log(`宛先: ${TO_EMAIL}`);
  console.log('');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `パスート24事務局 <${FROM_EMAIL}>`,
        to: [TO_EMAIL],
        subject: '【テスト】ドメイン認証完了確認',
        html: `
          <!DOCTYPE html>
          <html lang="ja">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>ドメイン認証テスト</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
                  <div style="background: linear-gradient(135deg, #4caf50 0%, #81c784 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: white; margin: 0; font-size: 28px;">✅ ドメイン認証成功！</h1>
                  </div>
                  
                  <div style="padding: 40px 20px;">
                      <h2 style="color: #4caf50; margin-top: 0;">おめでとうございます！</h2>
                      
                      <p style="font-size: 16px; line-height: 1.8; color: #333;">
                          <strong>${FROM_EMAIL}</strong> からのメール送信が正常に動作しています。
                      </p>
                      
                      <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 30px 0;">
                          <h3 style="color: #667eea; margin-top: 0; font-size: 18px;">✅ 確認事項</h3>
                          <ul style="line-height: 2; color: #333;">
                              <li>送信元アドレス: ${FROM_EMAIL}</li>
                              <li>受信先アドレス: ${TO_EMAIL}</li>
                              <li>DNS設定: SPF + DKIM 認証済み</li>
                              <li>メールが迷惑メールフォルダに入っていないか確認</li>
                          </ul>
                      </div>
                      
                      <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 12px; padding: 20px; margin: 30px 0; border-left: 4px solid #2196f3;">
                          <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #333;">
                              <strong>💡 次のステップ</strong><br>
                              • プレミアム商品券予約システムの本番デプロイ<br>
                              • 予約完了メールの実際の送信テスト<br>
                              • 抽選結果メールのテスト送信
                          </p>
                      </div>
                      
                      <p style="font-size: 14px; color: #666; line-height: 1.8; margin-top: 30px;">
                          このメールは Resend API によって送信されています。<br>
                          送信日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                      </p>
                  </div>
                  
                  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                      <p style="margin: 0; font-size: 13px; color: #999;">
                          © 2026 パスート24プレミアム付商品券事務局
                      </p>
                  </div>
              </div>
          </body>
          </html>
        `
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ 送信成功！');
      console.log(`   Email ID: ${data.id}`);
      console.log('');
      console.log('='.repeat(60));
      console.log(`📬 ${TO_EMAIL} の受信トレイを確認してください`);
      console.log('='.repeat(60));
      console.log('');
      console.log('【確認事項】');
      console.log('1. メールが受信トレイに届いているか');
      console.log('2. 迷惑メールフォルダに入っていないか');
      console.log('3. 送信元が「パスート24事務局 <info@urbandirection.jp>」になっているか');
      console.log('4. メールの内容が正しく表示されているか');
    } else {
      console.error('❌ 送信失敗');
      console.error('エラー詳細:', JSON.stringify(data, null, 2));
      console.log('');
      
      if (data.message && data.message.includes('not verified')) {
        console.log('⚠️  ドメインがまだ認証されていません');
        console.log('');
        console.log('【対処方法】');
        console.log('1. https://resend.com/domains にアクセス');
        console.log('2. urbandirection.jp の認証状態を確認');
        console.log('3. DNSレコードが正しく設定されているか確認');
        console.log('4. DNS反映を待つ（最大24時間）');
      }
    }
  } catch (error) {
    console.error('❌ 送信エラー:', error.message);
  }
}

sendTestEmail();

// Node.js 18+ にはfetchが組み込まれているため、importは不要
const RESEND_API_KEY = 're_2oYH4UPg_GTPFCMFneHTws4WCzfLPGH9N';
const FROM_EMAIL = 'info@urbandirection.jp';
// 開発モードでは自分のアカウントアドレスのみ送信可能
const TEST_EMAIL = 'info.urbandirection@gmail.com';

// メールテンプレート
const templates = [
  {
    name: '【Phase 1】予約完了メール',
    subject: 'パスート24 プレミアム商品券 予約完了のお知らせ',
    html: getReservationConfirmationEmail('Phase1')
  },
  {
    name: '【Phase 2】予約完了メール',
    subject: 'パスート24 プレミアム商品券 予約完了のお知らせ',
    html: getReservationConfirmationEmail('Phase2')
  },
  {
    name: '【当選】抽選結果メール',
    subject: 'パスート24 プレミアム商品券 抽選結果のお知らせ（当選）',
    html: getWinnerEmail()
  },
  {
    name: '【落選】抽選結果メール',
    subject: 'パスート24 プレミアム商品券 抽選結果のお知らせ',
    html: getLoserEmail()
  }
];

// Phase 1 予約完了メール
function getReservationConfirmationEmail(phase) {
  const isPhase1 = phase === 'Phase1';
  const phaseText = isPhase1 ? 'Phase 1（抽選）' : 'Phase 2（先着順）';
  const lotteryNote = isPhase1
    ? '<p style="margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%); border-left: 4px solid #f44336; border-radius: 8px;"><strong style="color: #f44336;">※抽選結果は後日メールでお知らせいたします。</strong></p>'
    : '<p style="margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border-left: 4px solid #4caf50; border-radius: 8px;"><strong style="color: #4caf50;">※先着順での予約が確定しました。</strong></p>';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>予約完了のお知らせ</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎫 予約完了のお知らせ</h1>
        </div>
        
        <div style="padding: 40px 20px;">
            <p style="font-size: 16px; line-height: 1.8; color: #333; margin-bottom: 20px;">
                テスト 様<br>
                パスート24プレミアム付商品券の予約が完了しました。
            </p>
            
            ${lotteryNote}
            
            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 30px 0;">
                <h2 style="color: #667eea; margin-top: 0; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">📋 予約内容</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666; width: 40%;">予約番号</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">TEST-${Date.now()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666;">フェーズ</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">${phaseText}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666;">お名前</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">テスト 太郎</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666;">購入冊数</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">2冊 (20,000円分)</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666;">受取店舗</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">株式会社パスート24</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; color: #666;">受取日時</td>
                        <td style="padding: 12px 0; font-weight: bold;">2026年4月15日 10:00-12:00</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); border-radius: 12px; padding: 20px; margin: 30px 0; border-left: 4px solid #ff9800;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #333;">
                    <strong>📌 予約照会について</strong><br>
                    予約内容の確認は以下のURLから可能です：<br>
                    <a href="https://3000-ias0xb1bnq0w0e36xso19-cc2fbc16.sandbox.novita.ai/lookup" style="color: #667eea; text-decoration: none;">
                        予約照会ページ
                    </a>
                </p>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.8; margin-top: 30px;">
                ※このメールは自動送信されています。返信はできません。<br>
                ※テストメールのため、実際の予約は含まれていません。
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

// 当選メール
function getWinnerEmail() {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>抽選結果のお知らせ（当選）</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #4caf50 0%, #81c784 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 抽選結果のお知らせ</h1>
        </div>
        
        <div style="padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 30px;">
                <p style="font-size: 32px; margin: 0 0 15px 0;">🎊</p>
                <h2 style="color: #2e7d32; margin: 0; font-size: 24px;">おめでとうございます！</h2>
                <p style="color: #2e7d32; font-size: 18px; margin: 10px 0 0 0; font-weight: bold;">当選されました</p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.8; color: #333; margin-bottom: 20px;">
                テスト 様<br>
                プレミアム商品券の抽選に当選されました。
            </p>
            
            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 30px 0;">
                <h2 style="color: #4caf50; margin-top: 0; font-size: 20px; border-bottom: 2px solid #4caf50; padding-bottom: 10px;">📋 当選内容</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666; width: 40%;">予約番号</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">TEST-WIN-${Date.now()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666;">お名前</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">テスト 太郎</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666;">当選冊数</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">2冊 (20,000円分)</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666;">受取店舗</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">株式会社パスート24</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; color: #666;">受取日時</td>
                        <td style="padding: 12px 0; font-weight: bold;">2026年4月15日 10:00-12:00</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); border-radius: 12px; padding: 20px; margin: 30px 0; border-left: 4px solid #ff9800;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #333;">
                    <strong>⚠️ 重要なお知らせ</strong><br>
                    • 指定の受取日時に必ずお越しください<br>
                    • 受取時には予約番号または本人確認書類をご提示ください<br>
                    • 期限までに受け取られない場合、当選は無効となります
                </p>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.8; margin-top: 30px;">
                ※このメールは自動送信されています。返信はできません。<br>
                ※テストメールのため、実際の当選は含まれていません。
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
            
            <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 12px; padding: 20px; margin: 30px 0; border-left: 4px solid #2196f3;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #333;">
                    <strong>💡 Phase 2（先着順）のご案内</strong><br>
                    Phase 2では先着順での予約を受け付けております。<br>
                    在庫がある場合、ご予約いただけます。<br><br>
                    <a href="https://3000-ias0xb1bnq0w0e36xso19-cc2fbc16.sandbox.novita.ai" style="color: #667eea; text-decoration: none; font-weight: bold;">
                        🔗 予約ページはこちら
                    </a>
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

// メール送信関数
async function sendEmail(template) {
  try {
    console.log(`\n📤 送信中: ${template.name}`);
    console.log(`   宛先: ${TEST_EMAIL}`);
    console.log(`   件名: ${template.subject}`);
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TEST_EMAIL],
        subject: template.subject,
        html: template.html
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ 成功: ${template.name}`);
      console.log(`   Email ID: ${data.id}`);
      return { success: true, id: data.id };
    } else {
      console.error(`❌ 失敗: ${template.name}`);
      console.error(`   エラー: ${JSON.stringify(data)}`);
      return { success: false, error: data };
    }
  } catch (error) {
    console.error(`❌ 送信エラー: ${template.name}`);
    console.error(`   ${error.message}`);
    return { success: false, error: error.message };
  }
}

// すべてのテストメールを送信
async function sendAllTestEmails() {
  console.log('='.repeat(60));
  console.log('📧 テストメール送信開始');
  console.log('='.repeat(60));
  console.log(`宛先: ${TEST_EMAIL} (開発モード - アカウントメールのみ)`);
  console.log(`送信数: ${templates.length}通\n`);

  const results = [];
  for (const template of templates) {
    const result = await sendEmail(template);
    results.push({ name: template.name, ...result });
    
    // 連続送信を避けるため少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 送信結果サマリー');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ 成功: ${successCount}通`);
  console.log(`❌ 失敗: ${results.length - successCount}通\n`);

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${result.name}`);
    if (result.id) {
      console.log(`   ID: ${result.id}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`📬 ${TEST_EMAIL} の受信トレイを確認してください`);
  console.log('='.repeat(60));
}

// 実行
sendAllTestEmails().catch(console.error);

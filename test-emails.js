// テストメール送信スクリプト
const testEmailAddress = 'info.urbandirection@gmail.com'; // テスト送信先

console.log('🎯 メールテスト送信を開始します...\n');
console.log(`📧 送信先: ${testEmailAddress}\n`);

// テストデータ
const testData = {
  // 予約完了メール用
  reservation: {
    reservationId: 'TEST-20260302-ABCD12',
    fullName: 'テスト 太郎',
    quantity: 3,
    store: '一畳屋ショールーム（熊本県熊本市中央区坪井5丁目2-27）',
    pickupDate: '2026-03-17',
    pickupTime: '15:00～16:00',
    reservationPhase: 1,
    lotteryStatus: 'pending'
  },
  
  // 抽選当選メール用
  winner: {
    reservationId: 'TEST-20260302-WINNER',
    fullName: 'テスト 花子',
    quantity: 2,
    store: '一畳屋ショールーム（熊本県熊本市中央区坪井5丁目2-27）',
    pickupDate: '2026-03-18',
    pickupTime: '16:00～17:00'
  },
  
  // 抽選落選メール用
  loser: {
    reservationId: 'TEST-20260302-LOSER',
    fullName: 'テスト 次郎',
    quantity: 1
  }
};

async function testEmail(type, endpoint, body) {
  console.log(`\n📮 ${type}メールのテスト送信中...`);
  
  try {
    const response = await fetch(`https://passurt24.pages.dev${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${type}メール送信成功`);
      console.log(`   予約ID: ${body.reservationId || body.reservation?.reservationId || 'N/A'}`);
    } else {
      console.log(`❌ ${type}メール送信失敗: ${data.error}`);
    }
    
    return data;
  } catch (error) {
    console.log(`❌ ${type}メール送信エラー: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════\n');
  
  // 1. 予約完了メール（Phase 1 - 抽選対象）
  console.log('【1/3】予約完了メール（Phase 1 - 抽選対象）');
  console.log('─────────────────────────────────────────────────────');
  await testEmail(
    '予約完了（Phase 1）',
    '/api/test/email/reservation',
    {
      email: testEmailAddress,
      ...testData.reservation
    }
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 2. 抽選当選メール
  console.log('\n【2/3】抽選当選メール');
  console.log('─────────────────────────────────────────────────────');
  await testEmail(
    '抽選当選',
    '/api/test/email/winner',
    {
      email: testEmailAddress,
      ...testData.winner
    }
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 3. 抽選落選メール
  console.log('\n【3/3】抽選落選メール');
  console.log('─────────────────────────────────────────────────────');
  await testEmail(
    '抽選落選',
    '/api/test/email/loser',
    {
      email: testEmailAddress,
      ...testData.loser
    }
  );
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('\n✨ テスト送信完了！');
  console.log(`\n📬 ${testEmailAddress} の受信トレイを確認してください。`);
  console.log('\n※ 迷惑メールフォルダも確認してください。');
}

// 実行
runTests().catch(console.error);

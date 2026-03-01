// DNS確認スクリプト（Node.js版）
import { Resolver } from 'dns';
import { promisify } from 'util';

const resolver = new Resolver();
const resolveTxt = promisify(resolver.resolveTxt.bind(resolver));

async function checkDNS() {
  console.log('='.repeat(60));
  console.log('🔍 DNS設定確認スクリプト');
  console.log('='.repeat(60));
  console.log('');

  const records = [
    { name: 'DKIM', host: 'resend._domainkey.urbandirection.jp' },
    { name: 'SPF', host: 'send.urbandirection.jp' },
    { name: 'DMARC', host: '_dmarc.urbandirection.jp' }
  ];

  for (const record of records) {
    console.log(`【${record.name}】 ${record.host}`);
    console.log('━'.repeat(60));
    
    try {
      const txtRecords = await resolveTxt(record.host);
      if (txtRecords.length > 0) {
        console.log('✅ レコードが反映されています');
        txtRecords.forEach((txt, index) => {
          const value = txt.join('');
          console.log(`   ${index + 1}. ${value.substring(0, 80)}...`);
        });
      } else {
        console.log('⏳ レコードはまだ反映されていません');
      }
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        console.log('⏳ レコードはまだ反映されていません');
      } else {
        console.log(`❌ エラー: ${error.message}`);
      }
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('📝 注意事項');
  console.log('='.repeat(60));
  console.log('• DNS反映には通常5〜30分かかります');
  console.log('• 最大で24時間かかる場合があります');
  console.log('• すべてのレコードが反映されたら、Resendで認証してください');
  console.log('');
}

checkDNS();

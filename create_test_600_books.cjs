// 600冊のテストデータ生成スクリプト（抽選前・日時ランダム分散）

const stores = [
  'パスート24辛島公園',
  '熊本市辛島公園地下駐車場',
  'パスート24上通',
  'パスート24熊本中央',
  'パスート24銀座プレス'
];

const dates = [
  '2026-03-16',
  '2026-03-17', 
  '2026-03-18'
];

const timeSlots = [
  '12:00-13:00',
  '13:00-14:00',
  '15:00-16:00',
  '16:00-17:00',
  '17:00-18:00',
  '18:00-19:00',
  '19:00-20:00'
];

const lastNames = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '林', '斎藤', '清水'];
const firstNames = ['太郎', '次郎', '三郎', '花子', '美咲', '健太', '翔太', '結衣', '陽菜', '大翔', '蓮', '悠真', '陽斗', '颯太', '葵', 'さくら', '凜', '愛梨', '美優', '心春'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhoneNumber() {
  const prefix = ['080', '090', '070'][Math.floor(Math.random() * 3)];
  const part1 = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const part2 = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${prefix}-${part1}-${part2}`;
}

function generateBirthDate() {
  const year = 1950 + Math.floor(Math.random() * 55); // 1950-2004
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateReservationId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PRE-20260227-${id}`;
}

// 600冊を達成するための予約を生成
let totalBooks = 0;
const reservations = [];
let reservationCount = 0;

while (totalBooks < 600) {
  const quantity = Math.floor(Math.random() * 5) + 1; // 1-5冊
  
  if (totalBooks + quantity > 600) {
    // 最後の予約で600冊ちょうどになるように調整
    const remaining = 600 - totalBooks;
    if (remaining > 0) {
      reservations.push({
        quantity: remaining,
        date: randomElement(dates),
        timeSlot: randomElement(timeSlots),
        store: randomElement(stores)
      });
      totalBooks += remaining;
      reservationCount++;
    }
    break;
  }
  
  reservations.push({
    quantity,
    date: randomElement(dates),
    timeSlot: randomElement(timeSlots),
    store: randomElement(stores)
  });
  
  totalBooks += quantity;
  reservationCount++;
}

console.log(`総予約件数: ${reservationCount}件`);
console.log(`総予約冊数: ${totalBooks}冊`);

// 日付別・時間帯別の統計
const distribution = {};
dates.forEach(date => {
  distribution[date] = {};
  timeSlots.forEach(slot => {
    distribution[date][slot] = { count: 0, books: 0 };
  });
});

reservations.forEach(r => {
  distribution[r.date][r.timeSlot].count++;
  distribution[r.date][r.timeSlot].books += r.quantity;
});

console.log('\n=== 日時別分布 ===');
dates.forEach(date => {
  console.log(`\n${date}:`);
  timeSlots.forEach(slot => {
    const d = distribution[date][slot];
    if (d.count > 0) {
      console.log(`  ${slot}: ${d.count}件 / ${d.books}冊`);
    }
  });
});

// SQL生成
let sql = '';
reservations.forEach(r => {
  const reservationId = generateReservationId();
  const fullName = randomElement(lastNames) + randomElement(firstNames);
  const phoneNumber = generatePhoneNumber();
  const birthDate = generateBirthDate();
  
  sql += `INSERT INTO reservations (
    reservation_id, birth_date, full_name, phone_number, quantity,
    store_location, pickup_date, pickup_time_slot,
    status, reservation_phase, lottery_status, created_at
  ) VALUES (
    '${reservationId}', '${birthDate}', '${fullName}', '${phoneNumber}', ${r.quantity},
    '${r.store}', '${r.date}', '${r.timeSlot}',
    'reserved', 1, 'pending', datetime('now', '-${Math.floor(Math.random() * 10)} hours')
  );\n`;
});

console.log('\n=== SQL ===');
console.log(sql);

const http = require('http');

const reservations = [];
const stores = [
  'パスート24辛島公園',
  '熊本市辛島公園地下駐車場',
  'パスート24上通',
  'パスート24熊本中央',
  'パスート24銀座プレス'
];

const dates = ['2026-03-16', '2026-03-17', '2026-03-18'];
const timeSlots = ['12:00-13:00', '13:00-14:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00'];
const lastNames = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤'];
const firstNames = ['太郎', '花子', '健太', '翔太', '結衣', '陽菜', '大翔', '蓮', '颯太', '葵'];

function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function genPhone() {
  const pre = ['080', '090', '070'][Math.floor(Math.random() * 3)];
  return `${pre}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}
function genBirth() {
  const y = 1950 + Math.floor(Math.random() * 55);
  const m = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const d = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

let total = 0, count = 0;
while (total < 600) {
  const qty = Math.min(Math.floor(Math.random() * 5) + 1, 600 - total);
  reservations.push({
    birth_date: genBirth(),
    full_name: random(lastNames) + random(firstNames),
    phone_number: genPhone(),
    quantity: qty,
    store_location: random(stores),
    pickup_date: random(dates),
    pickup_time_slot: random(timeSlots)
  });
  total += qty;
  count++;
}

console.log(`Generated ${count} reservations, ${total} books total`);

// Post to API
let posted = 0;
async function postOne(res) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(res);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/reserve',
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': data.length}
    }, (response) => {
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => {
        posted++;
        if (posted % 10 === 0) console.log(`Posted: ${posted}/${count}`);
        resolve();
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  for (const r of reservations) {
    await postOne(r);
    await new Promise(res => setTimeout(res, 50)); // 50ms delay
  }
  console.log(`Done! Posted ${posted} reservations`);
})();

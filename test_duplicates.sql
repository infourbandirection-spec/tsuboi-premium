-- テスト用の重複データを挿入（氏名の重複）
INSERT INTO reservations (
  reservation_id, birth_date, full_name, kana, phone_number, email, quantity, 
  store_location, pickup_date, pickup_time_slot, status, lottery_status
) VALUES 
  ('TEST-DUP-001', '1990-01-01', '山田太郎', 'ヤマダタロウ', '090-1111-1111', 'yamada1@test.com', 2, 
   '株式会社パスート24（熊本県熊本市中央区中央街4-29）', '2026-03-16', '10:00～11:00', 'reserved', 'pending'),
  ('TEST-DUP-002', '1990-01-01', '山田太郎', 'ヤマダタロウ', '090-2222-2222', 'yamada2@test.com', 3, 
   '株式会社パスート24（熊本県熊本市中央区中央街4-29）', '2026-03-17', '11:00～12:00', 'reserved', 'pending');

-- テスト用の重複データを挿入（電話番号の重複）
INSERT INTO reservations (
  reservation_id, birth_date, full_name, kana, phone_number, email, quantity, 
  store_location, pickup_date, pickup_time_slot, status, lottery_status
) VALUES 
  ('TEST-DUP-003', '1985-05-10', '佐藤花子', 'サトウハナコ', '090-3333-3333', 'sato1@test.com', 1, 
   '株式会社パスート24（熊本県熊本市中央区中央街4-29）', '2026-03-18', '13:00～14:00', 'reserved', 'pending'),
  ('TEST-DUP-004', '1985-05-10', '田中一郎', 'タナカイチロウ', '090-3333-3333', 'tanaka@test.com', 2, 
   '株式会社パスート24（熊本県熊本市中央区中央街4-29）', '2026-03-19', '14:00～15:00', 'reserved', 'pending');

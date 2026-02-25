-- テスト用に在庫を998冊に調整（複数の予約で合計998冊）
DELETE FROM reservations;

-- 996冊分の予約を作成（166件 × 6冊）
INSERT INTO reservations (reservation_id, birth_date, full_name, phone_number, quantity, store_location, pickup_date, pickup_time_slot, status) 
SELECT 
    'PRE-20260225-' || substr('000000' || seq, -6, 6) as reservation_id,
    '1985-03-15' as birth_date,
    'テスト予約' || seq as full_name,
    '090-' || substr('00000000' || seq, -8, 4) || '-' || substr('00000000' || seq, -4, 4) as phone_number,
    6 as quantity,
    'パスート24上通' as store_location,
    '2026-03-01' as pickup_date,
    '10:00～11:00' as pickup_time_slot,
    'reserved' as status
FROM (
    WITH RECURSIVE cnt(x) AS (
        SELECT 1
        UNION ALL
        SELECT x+1 FROM cnt WHERE x < 166
    )
    SELECT x as seq FROM cnt
);

-- 残り2冊分の予約
INSERT INTO reservations (reservation_id, birth_date, full_name, phone_number, quantity, store_location, pickup_date, pickup_time_slot, status) VALUES
('PRE-20260225-TEST98', '1985-03-15', 'テスト最後', '090-9999-9998', 2, 'パスート24上通', '2026-03-01', '11:00～12:00', 'reserved');

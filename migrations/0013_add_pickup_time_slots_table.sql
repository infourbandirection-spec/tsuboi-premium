-- 購入時間帯管理テーブル
CREATE TABLE IF NOT EXISTS pickup_time_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  time_slot TEXT NOT NULL UNIQUE,
  display_label TEXT NOT NULL,
  phase INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_pickup_time_slots_phase ON pickup_time_slots(phase);
CREATE INDEX IF NOT EXISTS idx_pickup_time_slots_active ON pickup_time_slots(is_active);
CREATE INDEX IF NOT EXISTS idx_pickup_time_slots_order ON pickup_time_slots(display_order);

-- 初期データ投入（Phase 1 の時間帯）
INSERT INTO pickup_time_slots (time_slot, display_label, phase, is_active, display_order) VALUES
  ('10:00～11:00', '10:00～11:00', 1, 1, 1),
  ('11:00～12:00', '11:00～12:00', 1, 1, 2),
  ('12:00～13:00', '12:00～13:00', 1, 1, 3),
  ('13:00～14:00', '13:00～14:00', 1, 1, 4),
  ('14:00～15:00', '14:00～15:00', 1, 1, 5),
  ('15:00～16:00', '15:00～16:00', 1, 1, 6),
  ('16:00～17:00', '16:00～17:00', 1, 1, 7),
  ('17:00～18:00', '17:00～18:00', 1, 1, 8),
  ('18:00～19:00', '18:00～19:00', 1, 1, 9),
  ('19:00～20:00', '19:00～20:00', 1, 1, 10);

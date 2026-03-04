-- メール送信履歴テーブル
CREATE TABLE IF NOT EXISTS email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'confirmation', 'winner', 'loser'
  subject TEXT NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL, -- 'success', 'failed'
  message_id TEXT,
  error_message TEXT,
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_email_logs_reservation_id ON email_logs(reservation_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

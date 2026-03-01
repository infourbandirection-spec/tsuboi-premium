-- 管理者ユーザーテーブル
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初期管理者アカウント（パスワードはハッシュ化せずそのまま保存 - 簡易実装）
INSERT INTO admin_users (username, password_hash) VALUES 
  ('urbandirection', 'urbandirection'),
  ('passport24', 'passport24');

-- セッショントークンテーブル
CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (username) REFERENCES admin_users(username)
);

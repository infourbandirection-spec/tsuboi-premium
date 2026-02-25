#!/bin/bash

# 残り2冊の状態で3人同時に予約を試みるテストスクリプト

echo "=== 在庫確認 ==="
curl -s http://localhost:3000/api/status | python3 -m json.tool

echo ""
echo "=== 3人同時予約シミュレーション ==="
echo "User A: 2冊予約を試行..."
echo "User B: 1冊予約を試行..."
echo "User C: 1冊予約を試行..."

# 並列実行（3つのリクエストをほぼ同時に送信）
curl -s -X POST http://localhost:3000/api/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990-01-01",
    "fullName": "テストユーザーA",
    "phoneNumber": "090-1234-5678",
    "quantity": 2,
    "store": "パスート24上通",
    "pickupDate": "2026-03-01",
    "pickupTime": "10:00-11:00"
  }' > /tmp/result_a.json &

curl -s -X POST http://localhost:3000/api/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990-01-02",
    "fullName": "テストユーザーB",
    "phoneNumber": "090-1234-5679",
    "quantity": 1,
    "store": "パスート24上通",
    "pickupDate": "2026-03-01",
    "pickupTime": "10:00-11:00"
  }' > /tmp/result_b.json &

curl -s -X POST http://localhost:3000/api/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990-01-03",
    "fullName": "テストユーザーC",
    "phoneNumber": "090-1234-5680",
    "quantity": 1,
    "store": "パスート24上通",
    "pickupDate": "2026-03-01",
    "pickupTime": "10:00-11:00"
  }' > /tmp/result_c.json &

# 全てのリクエストの完了を待つ
wait

echo ""
echo "=== User A の結果 ==="
cat /tmp/result_a.json | python3 -m json.tool

echo ""
echo "=== User B の結果 ==="
cat /tmp/result_b.json | python3 -m json.tool

echo ""
echo "=== User C の結果 ==="
cat /tmp/result_c.json | python3 -m json.tool

echo ""
echo "=== 最終在庫確認 ==="
curl -s http://localhost:3000/api/status | python3 -m json.tool

echo ""
echo "=== 予約一覧確認 ==="
curl -s http://localhost:3000/api/admin/statistics | python3 -m json.tool | head -20

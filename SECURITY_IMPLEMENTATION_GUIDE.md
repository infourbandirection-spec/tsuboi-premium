# セキュリティ改善実装ガイド

## 即座に実装可能な対策（30分以内）

### 1. XSS対策 - HTMLエスケープ関数

**public/static/app.js に追加:**

```javascript
// HTMLエスケープ関数
escapeHtml(text) {
  if (!text) return ''
  const map = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }
  return String(text).replace(/[<>&"'/]/g, (m) => map[m])
}

// 使用例: renderStep8() 確認画面
renderStep8() {
  return `
    <div class="bg-gray-50 p-4 rounded-lg">
      <p class="text-sm text-gray-600 mb-1">氏名</p>
      <p class="text-lg font-bold">${this.escapeHtml(this.formData.fullName)}</p>
    </div>
  `
}
```

---

### 2. アクセスログ実装

**src/index.tsx に追加:**

```typescript
// アクセスログミドルウェア
app.use('*', async (c, next) => {
  const startTime = Date.now()
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  const userAgent = c.req.header('User-Agent') || 'unknown'
  const path = c.req.path
  const method = c.req.method

  await next()

  const duration = Date.now() - startTime
  const status = c.res.status

  // ログ出力（Cloudflare Workers Logs で確認可能）
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    ip,
    method,
    path,
    status,
    duration: `${duration}ms`,
    userAgent: userAgent.substring(0, 100)
  }))
})
```

---

### 3. レート制限（Cloudflare KV使用）

**wrangler.jsonc に KV 追加:**

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "RATE_LIMIT",
      "id": "your-kv-id",
      "preview_id": "your-preview-kv-id"
    }
  ]
}
```

**src/index.tsx にレート制限追加:**

```typescript
type Bindings = {
  DB: D1Database
  RATE_LIMIT?: KVNamespace
  ADMIN_PASSWORD?: string
}

// レート制限ミドルウェア
async function checkRateLimit(c: any, limit: number = 10, window: number = 60): Promise<boolean> {
  if (!c.env.RATE_LIMIT) return true // KV未設定時はスキップ

  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  const key = `ratelimit:${ip}`
  
  const current = await c.env.RATE_LIMIT.get(key)
  const count = current ? parseInt(current) : 0

  if (count >= limit) {
    return false
  }

  await c.env.RATE_LIMIT.put(key, (count + 1).toString(), { expirationTtl: window })
  return true
}

// 予約エンドポイントに適用
app.post('/api/reserve', async (c) => {
  // レート制限チェック
  if (!await checkRateLimit(c, 5, 60)) {
    return c.json({
      success: false,
      error: 'アクセスが集中しています。1分後に再度お試しください。'
    }, 429)
  }

  // 通常の予約処理
  // ...
})
```

---

## 中期的な対策（1週間以内）

### 4. セキュリティヘッダー追加

**src/index.tsx に追加:**

```typescript
// セキュリティヘッダーミドルウェア
app.use('*', async (c, next) => {
  await next()

  // セキュリティヘッダー設定
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'DENY')
  c.res.headers.set('X-XSS-Protection', '1; mode=block')
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  // Content Security Policy
  c.res.headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; " +
    "font-src 'self' https://cdn.jsdelivr.net; " +
    "img-src 'self' data:; " +
    "connect-src 'self'"
  )
})
```

---

### 5. 入力サニタイゼーション強化

**src/index.tsx のバリデーション強化:**

```typescript
// サニタイゼーション関数
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // HTML タグ除去
    .substring(0, 100) // 最大長制限
}

// バリデーション関数に適用
function validateReservation(data: any): { valid: boolean; error?: string } {
  // サニタイゼーション
  if (data.fullName) data.fullName = sanitizeInput(data.fullName)
  if (data.phoneNumber) data.phoneNumber = sanitizeInput(data.phoneNumber)

  // 既存のバリデーション
  // ...
}
```

---

## プライバシーポリシーの追加

**プライバシーポリシーページ作成:**

```typescript
// src/index.tsx に追加
app.get('/privacy', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <title>プライバシーポリシー</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50 p-8">
        <div class="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
            <h1 class="text-3xl font-bold mb-6">プライバシーポリシー</h1>
            
            <section class="mb-6">
                <h2 class="text-xl font-bold mb-3">1. 個人情報の収集</h2>
                <p class="text-gray-700">
                    当システムでは、以下の個人情報を収集します：
                </p>
                <ul class="list-disc list-inside text-gray-700 mt-2">
                    <li>氏名</li>
                    <li>生年月日</li>
                    <li>電話番号</li>
                    <li>受取店舗・日時</li>
                </ul>
            </section>

            <section class="mb-6">
                <h2 class="text-xl font-bold mb-3">2. 利用目的</h2>
                <p class="text-gray-700">
                    収集した個人情報は、以下の目的でのみ使用します：
                </p>
                <ul class="list-disc list-inside text-gray-700 mt-2">
                    <li>プレミアム商品券の予約管理</li>
                    <li>本人確認</li>
                    <li>予約内容の確認・変更</li>
                </ul>
            </section>

            <section class="mb-6">
                <h2 class="text-xl font-bold mb-3">3. 第三者提供</h2>
                <p class="text-gray-700">
                    個人情報は、法令に基づく場合を除き、第三者に提供しません。
                </p>
            </section>

            <section class="mb-6">
                <h2 class="text-xl font-bold mb-3">4. 安全管理措置</h2>
                <p class="text-gray-700">
                    個人情報の安全管理のため、以下の措置を講じています：
                </p>
                <ul class="list-disc list-inside text-gray-700 mt-2">
                    <li>HTTPS通信による暗号化</li>
                    <li>アクセス制限</li>
                    <li>定期的なセキュリティ監査</li>
                </ul>
            </section>

            <section class="mb-6">
                <h2 class="text-xl font-bold mb-3">5. お問い合わせ</h2>
                <p class="text-gray-700">
                    個人情報の取扱いに関するお問い合わせは、以下までご連絡ください：<br>
                    Email: privacy@example.com
                </p>
            </section>

            <div class="mt-8 text-center">
                <a href="/" class="text-blue-600 hover:underline">トップページに戻る</a>
            </div>
        </div>
    </body>
    </html>
  `)
})
```

---

## データベース暗号化（推奨）

### アプリケーションレベル暗号化

**暗号化ユーティリティ作成:**

```typescript
// src/crypto.ts
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-me'

export function encrypt(text: string): string {
  // 簡易暗号化（本番では@noble/ciphers等を使用）
  const buffer = new TextEncoder().encode(text)
  const keyBuffer = new TextEncoder().encode(ENCRYPTION_KEY)
  
  const encrypted = buffer.map((byte, i) => 
    byte ^ keyBuffer[i % keyBuffer.length]
  )
  
  return btoa(String.fromCharCode(...encrypted))
}

export function decrypt(encryptedText: string): string {
  const encrypted = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0))
  const keyBuffer = new TextEncoder().encode(ENCRYPTION_KEY)
  
  const decrypted = encrypted.map((byte, i) => 
    byte ^ keyBuffer[i % keyBuffer.length]
  )
  
  return new TextDecoder().decode(decrypted)
}
```

**使用例:**

```typescript
import { encrypt, decrypt } from './crypto'

// 保存時
const encryptedName = encrypt(data.fullName)
await db.prepare(`INSERT INTO reservations (full_name) VALUES (?)`).bind(encryptedName).run()

// 取得時
const result = await db.prepare(`SELECT * FROM reservations WHERE id = ?`).bind(id).first()
const decryptedName = decrypt(result.full_name)
```

---

## 実装の優先順位

### 今すぐ実装（30分）
1. ✅ XSS対策（HTMLエスケープ）
2. ✅ アクセスログ
3. ✅ セキュリティヘッダー

### 1週間以内
4. ⚠️ レート制限（KV使用）
5. ⚠️ プライバシーポリシー
6. ⚠️ 入力サニタイゼーション

### 1ヶ月以内
7. ⚠️ データベース暗号化
8. ⚠️ 管理画面のセッション管理改善
9. ⚠️ 定期的なセキュリティ監査

---

## まとめ

個人情報を扱うシステムとして、最低限のセキュリティ対策は**必須**です。

**すぐに実装すべき対策:**
1. XSS対策
2. アクセスログ
3. セキュリティヘッダー
4. プライバシーポリシー

**これらを実装しますか？**

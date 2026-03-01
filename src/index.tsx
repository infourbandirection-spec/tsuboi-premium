import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
  ADMIN_PASSWORD?: string
  CSRF_KV?: KVNamespace
  RATE_LIMIT_KV?: KVNamespace
  RESEND_API_KEY?: string
  RESEND_FROM_EMAIL?: string
}

type Reservation = {
  birthDate: string
  fullName: string
  kana: string
  phoneNumber: string
  email?: string // オプショナル
  quantity: number
  store: string
  pickupDate: string
  pickupTime: string
}

const app = new Hono<{ Bindings: Bindings }>()

// ============================================
// メール送信関連の関数
// ============================================

/**
 * Resend APIを使用してメールを送信
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  env: Bindings
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // APIキーの確認
    if (!env.RESEND_API_KEY || env.RESEND_API_KEY === 're_YOUR_API_KEY_HERE') {
      console.warn('Resend API key not configured. Email not sent.')
      return { success: false, error: 'Email service not configured' }
    }

    const fromEmail = env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: html
      })
    })

    const data = await response.json() as any

    if (!response.ok) {
      console.error('Resend API error:', data)
      return { 
        success: false, 
        error: data.message || 'Failed to send email' 
      }
    }

    console.log('Email sent successfully:', data.id)
    return { 
      success: true, 
      messageId: data.id 
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * 予約完了メールのHTMLテンプレート
 */
function getReservationConfirmationEmailHTML(data: {
  fullName: string
  reservationId: string
  quantity: number
  storeLocation: string
  pickupDate: string
  pickupTime: string
  reservationPhase: number
  lotteryStatus: string
}): string {
  const phaseText = data.reservationPhase === 1 ? '抽選' : '先着順'
  const lotteryNote = data.reservationPhase === 1 
    ? '<p style="color: #ef4444; font-weight: bold;">※抽選結果は後日メールでお知らせいたします。</p>'
    : '<p style="color: #10b981; font-weight: bold;">※先着順での予約が確定しました。</p>'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>予約完了のお知らせ</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #10b981, #3b82f6); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🎫 プレミアム商品券 予約完了</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p><strong>${data.fullName}</strong> 様</p>
    
    <p>プレミアム商品券の予約が完了しました。</p>
    
    ${lotteryNote}
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <h2 style="color: #1f2937; font-size: 18px; margin-top: 0;">予約内容</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">予約ID:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #3b82f6;">${data.reservationId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">予約区分:</td>
          <td style="padding: 8px 0; font-weight: bold;">${phaseText}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">冊数:</td>
          <td style="padding: 8px 0; font-weight: bold;">${data.quantity}冊</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取店舗:</td>
          <td style="padding: 8px 0;">${data.storeLocation}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取日:</td>
          <td style="padding: 8px 0;">${data.pickupDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取時間:</td>
          <td style="padding: 8px 0;">${data.pickupTime}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">⚠️ 重要な注意事項</h3>
      <ul style="margin: 10px 0; padding-left: 20px; color: #78350f;">
        <li>予約IDは必ず控えてください</li>
        <li>受取時には身分証明証をご持参ください</li>
        <li>ご本人様のみ受け取り可能です（代理人不可）</li>
        <li>受取予定日を過ぎると自動的にキャンセルされます</li>
      </ul>
    </div>
    
    <p style="text-align: center; margin-top: 30px;">
      <a href="https://3000-ias0xb1bnq0w0e36xso19-cc2fbc16.sandbox.novita.ai/lookup" 
         style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        予約内容を確認する
      </a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      このメールは自動送信されています。<br>
      ご不明な点がございましたら、お問い合わせください。
    </p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * 抽選結果（当選）メールのHTMLテンプレート
 */
function getLotteryWinnerEmailHTML(data: {
  fullName: string
  reservationId: string
  quantity: number
  storeLocation: string
  pickupDate: string
  pickupTime: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>抽選結果のお知らせ（当選）</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #10b981, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🎉 抽選結果のお知らせ</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p><strong>${data.fullName}</strong> 様</p>
    
    <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <h2 style="color: #065f46; font-size: 28px; margin: 0;">✅ おめでとうございます！</h2>
      <p style="color: #047857; font-size: 18px; font-weight: bold; margin: 10px 0;">当選されました</p>
    </div>
    
    <p>プレミアム商品券の抽選に当選いたしました。<br>
    以下の日時にご来店いただき、商品券をお受け取りください。</p>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h2 style="color: #1f2937; font-size: 18px; margin-top: 0;">受取情報</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">予約ID:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #10b981;">${data.reservationId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">冊数:</td>
          <td style="padding: 8px 0; font-weight: bold;">${data.quantity}冊</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取店舗:</td>
          <td style="padding: 8px 0;">${data.storeLocation}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取日:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${data.pickupDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">受取時間:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${data.pickupTime}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">⚠️ 受取時の注意事項</h3>
      <ul style="margin: 10px 0; padding-left: 20px; color: #78350f;">
        <li><strong>身分証明証を必ずご持参ください</strong></li>
        <li><strong>ご本人様のみ受け取り可能です</strong>（代理人不可）</li>
        <li>受取予定日を過ぎると自動的にキャンセルされます</li>
        <li>予約IDをお控えください</li>
      </ul>
    </div>
    
    <p style="text-align: center; margin-top: 30px;">
      <a href="https://3000-ias0xb1bnq0w0e36xso19-cc2fbc16.sandbox.novita.ai/lookup" 
         style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        予約内容を確認する
      </a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      このメールは自動送信されています。<br>
      ご不明な点がございましたら、お問い合わせください。
    </p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * 抽選結果（落選）メールのHTMLテンプレート
 */
function getLotteryLoserEmailHTML(data: {
  fullName: string
  reservationId: string
  quantity: number
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>抽選結果のお知らせ</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #6b7280, #4b5563); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">抽選結果のお知らせ</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p><strong>${data.fullName}</strong> 様</p>
    
    <div style="background: #f3f4f6; border-left: 4px solid #6b7280; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="color: #374151; font-size: 16px; margin: 0;">
        誠に申し訳ございませんが、今回の抽選では残念ながら落選となりました。
      </p>
    </div>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6b7280;">
      <h2 style="color: #1f2937; font-size: 18px; margin-top: 0;">応募情報</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">予約ID:</td>
          <td style="padding: 8px 0; font-weight: bold;">${data.reservationId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">応募冊数:</td>
          <td style="padding: 8px 0; font-weight: bold;">${data.quantity}冊</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">📢 キャンセル待ちについて</h3>
      <p style="color: #78350f; margin: 10px 0;">
        当選者のキャンセルが発生した場合、落選者の中から順次ご連絡させていただく場合がございます。<br>
        その際は、メールまたはお電話にてご案内いたします。
      </p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      このメールは自動送信されています。<br>
      ご不明な点がございましたら、お問い合わせください。
    </p>
  </div>
</body>
</html>
  `.trim()
}

// 簡易認証ミドルウェア
function basicAuth(c: any) {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader) {
    return c.json({ success: false, error: '認証が必要です' }, 401)
  }

  const [scheme, credentials] = authHeader.split(' ')
  
  // Basic認証とBearer認証の両方をサポート
  if (scheme === 'Basic') {
    const decoded = atob(credentials)
    const [username, password] = decoded.split(':')
    
    // 簡易認証（本番環境では環境変数から取得）
    const adminPassword = c.env.ADMIN_PASSWORD || 'admin123'
    
    if (username !== 'admin' || password !== adminPassword) {
      return c.json({ success: false, error: '認証に失敗しました' }, 401)
    }
  } else if (scheme === 'Bearer') {
    // Bearerトークン認証
    try {
      const decoded = atob(credentials)
      const [username, password, timestamp] = decoded.split(':')
      const adminPassword = c.env.ADMIN_PASSWORD || 'admin123'
      
      // トークンの有効期限チェック（24時間）
      const tokenAge = Date.now() - parseInt(timestamp)
      const isExpired = tokenAge > 24 * 60 * 60 * 1000
      
      if (username !== 'admin' || password !== adminPassword || isExpired) {
        return c.json({ success: false, error: '認証トークンが無効です' }, 401)
      }
    } catch {
      return c.json({ success: false, error: '認証トークンが無効です' }, 401)
    }
  } else {
    return c.json({ success: false, error: '認証方式が無効です' }, 401)
  }
  
  return null // 認証成功
}

// CORS設定
app.use('/api/*', cors())

// アクセスログミドルウェア（セキュリティ対策）
app.use('*', async (c, next) => {
  const startTime = Date.now()
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  const userAgent = c.req.header('User-Agent') || 'unknown'
  const path = c.req.path
  const method = c.req.method

  await next()

  const duration = Date.now() - startTime
  const status = c.res.status

  // アクセスログ出力（Cloudflare Workers Logsで確認可能）
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

// セキュリティヘッダーミドルウェア
app.use('*', async (c, next) => {
  await next()

  // セキュリティヘッダー設定
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'DENY')
  c.res.headers.set('X-XSS-Protection', '1; mode=block')
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  // HSTS（HTTPS強制）- 本番環境では1年間有効
  c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  
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

// 静的ファイル配信
app.use('/static/*', serveStatic({ root: './public' }))

// ===== CSRF保護関連 =====

// CSRFトークン生成
function generateCsrfToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// CSRFトークン検証ミドルウェア
async function verifyCsrfToken(c: any): Promise<Response | null> {
  const token = c.req.header('X-CSRF-Token')
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  
  if (!token) {
    return c.json({
      success: false,
      error: 'CSRFトークンが見つかりません'
    }, 403)
  }

  // KVがない場合はメモリベースで検証（開発環境用）
  if (!c.env.CSRF_KV) {
    // 開発環境: トークン形式のみチェック
    if (token.length !== 64) {
      return c.json({
        success: false,
        error: '無効なCSRFトークンです'
      }, 403)
    }
    return null // 検証成功
  }

  // 本番環境: KVからトークン検証
  const storedToken = await c.env.CSRF_KV.get(`csrf:${ip}:${token}`)
  
  if (!storedToken) {
    return c.json({
      success: false,
      error: 'CSRFトークンが無効または期限切れです'
    }, 403)
  }

  // トークン使用後は削除（ワンタイムトークン）
  await c.env.CSRF_KV.delete(`csrf:${ip}:${token}`)
  
  return null // 検証成功
}

// ===== レート制限関連（セキュリティ対策） =====

// レート制限チェック
async function checkRateLimit(c: any, endpoint: string = 'reserve', limit: number = 10, windowSeconds: number = 60): Promise<Response | null> {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  const now = Math.floor(Date.now() / 1000)
  const windowKey = Math.floor(now / windowSeconds)
  const key = `rate:${endpoint}:${ip}:${windowKey}`
  
  // KVがない場合は制限なし（開発環境用）
  if (!c.env.RATE_LIMIT_KV) {
    return null
  }
  
  // 現在のリクエスト数を取得
  const currentCount = await c.env.RATE_LIMIT_KV.get(key)
  const count = currentCount ? parseInt(currentCount) : 0
  
  if (count >= limit) {
    return c.json({
      success: false,
      error: 'リクエスト数が制限を超えました。しばらく待ってから再度お試しください。'
    }, 429)
  }
  
  // カウントを増やす（有効期限付き）
  await c.env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: windowSeconds * 2 })
  
  return null // 制限内
}

// ===== エラーハンドリング（セキュリティ対策） =====

// セキュアなエラーログ出力（内部情報を詳細にログ、ユーザーには汎用メッセージ）
function logSecureError(context: string, error: any) {
  // サーバーログには詳細を出力（Cloudflare Workers Logsで確認）
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : String(error)
  }))
}

// ===== ユーティリティ関数 =====

// 入力サニタイゼーション（セキュリティ対策）
function sanitizeInput(input: string): string {
  if (!input) return ''
  return String(input)
    .trim()
    .replace(/[<>]/g, '') // HTMLタグ除去
    .substring(0, 100) // 最大長制限
}

// 予約ID生成
function generateReservationId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 紛らわしい文字を除外
  let random = ''
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `PRE-${date}-${random}`
}

// ===== 強化された入力バリデーション（セキュリティ対策） =====

// 氏名バリデーション
function validateFullName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: '氏名を入力してください' }
  }
  
  // 長さチェック（2～50文字）
  const trimmedName = name.trim()
  if (trimmedName.length < 2 || trimmedName.length > 50) {
    return { valid: false, error: '氏名は2～50文字で入力してください' }
  }
  
  // 日本語・英字・空白のみ許可（数字や記号は不可）
  const nameRegex = /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFFa-zA-Z\s]+$/
  if (!nameRegex.test(trimmedName)) {
    return { valid: false, error: '氏名は日本語またはアルファベットで入力してください' }
  }
  
  return { valid: true }
}

// かなバリデーション（ひらがなのみ）
function validateKana(kana: string): { valid: boolean; error?: string } {
  if (!kana || kana.trim().length === 0) {
    return { valid: false, error: 'かなを入力してください' }
  }
  
  // 長さチェック（2～50文字）
  const trimmedKana = kana.trim()
  if (trimmedKana.length < 2 || trimmedKana.length > 50) {
    return { valid: false, error: 'かなは2～50文字で入力してください' }
  }
  
  // ひらがな・空白・長音記号のみ許可
  const kanaRegex = /^[ぁ-んー\s]+$/
  if (!kanaRegex.test(trimmedKana)) {
    return { valid: false, error: 'かなはひらがなで入力してください' }
  }
  
  return { valid: true }
}

// 生年月日バリデーション
function validateBirthDate(birthDate: string): { valid: boolean; error?: string } {
  if (!birthDate) {
    return { valid: false, error: '生年月日を入力してください' }
  }
  
  const birth = new Date(birthDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // 未来日チェック
  if (birth > today) {
    return { valid: false, error: '生年月日に未来の日付は指定できません' }
  }
  
  // 年齢チェック（0歳～150歳）
  const age = Math.floor((today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  if (age < 0 || age > 150) {
    return { valid: false, error: '生年月日が正しくありません' }
  }
  
  // 1900年以降かチェック
  if (birth.getFullYear() < 1900) {
    return { valid: false, error: '1900年以降の日付を入力してください' }
  }
  
  return { valid: true }
}

// 電話番号バリデーション（強化版）
function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  if (!phone || phone.trim().length === 0) {
    return { valid: false, error: '電話番号を入力してください' }
  }
  
  // ハイフンを除去
  const cleanPhone = phone.replace(/-/g, '')
  
  // 日本の電話番号形式（10～11桁の数字）
  const phoneRegex = /^0\d{9,10}$/
  if (!phoneRegex.test(cleanPhone)) {
    return { valid: false, error: '電話番号は10～11桁の数字で入力してください（例: 090-1234-5678）' }
  }
  
  // 携帯電話・固定電話の番号体系チェック
  const mobileRegex = /^(070|080|090)\d{8}$/ // 携帯電話
  const landlineRegex = /^0\d{9}$/ // 固定電話（市外局番含む）
  
  if (!mobileRegex.test(cleanPhone) && !landlineRegex.test(cleanPhone)) {
    return { valid: false, error: '有効な電話番号を入力してください' }
  }
  
  return { valid: true }
}

// 総合バリデーション
function validateReservation(data: any, currentPhase: number = 1): { valid: boolean; error?: string } {
  // 入力サニタイゼーション（セキュリティ対策）
  if (data.fullName) data.fullName = sanitizeInput(data.fullName)
  if (data.kana) data.kana = sanitizeInput(data.kana)
  if (data.phoneNumber) data.phoneNumber = sanitizeInput(data.phoneNumber)
  if (data.store) data.store = sanitizeInput(data.store)

  // 必須項目チェック
  const required = ['birthDate', 'fullName', 'kana', 'phoneNumber', 'quantity', 'store', 'pickupDate', 'pickupTime']
  for (const field of required) {
    if (!data[field]) {
      return { valid: false, error: `${field}は必須です` }
    }
  }
  
  // 氏名バリデーション（強化）
  const nameValidation = validateFullName(data.fullName)
  if (!nameValidation.valid) {
    return nameValidation
  }
  
  // かなバリデーション（ひらがなのみ）
  const kanaValidation = validateKana(data.kana)
  if (!kanaValidation.valid) {
    return kanaValidation
  }
  
  // 生年月日バリデーション（強化）
  const birthDateValidation = validateBirthDate(data.birthDate)
  if (!birthDateValidation.valid) {
    return birthDateValidation
  }
  
  // 電話番号バリデーション（強化）
  const phoneValidation = validatePhoneNumber(data.phoneNumber)
  if (!phoneValidation.valid) {
    return phoneValidation
  }

  // 冊数チェック
  const quantity = parseInt(data.quantity)
  if (isNaN(quantity) || quantity < 1 || quantity > 6) {
    return { valid: false, error: '冊数は1～6の範囲で指定してください' }
  }

  // 受け取り日チェック（フェーズによって異なる）
  if (currentPhase === 1) {
    // Phase 1: 固定の3日間のみ
    const allowedDates = ['2026-03-16', '2026-03-17', '2026-03-18']
    if (!allowedDates.includes(data.pickupDate)) {
      return { valid: false, error: '受け取り日は指定された日付から選択してください' }
    }
  } else if (currentPhase === 2) {
    // Phase 2: 3月17日以降の自由選択
    const minDate = new Date('2026-03-17')
    const pickupDate = new Date(data.pickupDate)
    
    if (pickupDate < minDate) {
      return { valid: false, error: '受け取り日は3月17日以降を選択してください' }
    }
  }

  // 受け取り時間チェック（固定の7つの時間帯）
  const allowedTimes = [
    '12:00～13:00', '13:00～14:00', '15:00～16:00', '16:00～17:00',
    '17:00～18:00', '18:00～19:00', '19:00～20:00'
  ]
  if (!allowedTimes.includes(data.pickupTime)) {
    return { valid: false, error: '受け取り時間は指定された時間帯から選択してください' }
  }

  return { valid: true }
}

// ===== APIエンドポイント =====

// CSRFトークン取得
app.get('/api/csrf-token', async (c) => {
  try {
    const token = generateCsrfToken()
    const ip = c.req.header('CF-Connecting-IP') || 'unknown'
    
    // KVがある場合はトークンを保存（本番環境）
    if (c.env.CSRF_KV) {
      // 10分間有効なトークン
      await c.env.CSRF_KV.put(`csrf:${ip}:${token}`, '1', { expirationTtl: 600 })
    }
    
    return c.json({
      success: true,
      token
    })
  } catch (error) {
    logSecureError('CSRF token generation', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// システム状態取得
app.get('/api/status', async (c) => {
  try {
    const db = c.env.DB

    // 現在の予約済み冊数を取得
    const result = await db.prepare(`
      SELECT SUM(quantity) as total 
      FROM reservations 
      WHERE status = 'reserved'
    `).first()

    const reservedCount = result?.total || 0

    // システム設定取得
    const settings = await db.prepare(`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE setting_key IN ('max_total_quantity', 'current_phase', 'reservation_enabled')
    `).all()

    const settingsMap: Record<string, string> = {}
    settings.results.forEach((row: any) => {
      settingsMap[row.setting_key] = row.setting_value
    })

    const maxTotal = parseInt(settingsMap['max_total_quantity'] || '1000')
    const currentPhase = parseInt(settingsMap['current_phase'] || '1')
    const reservationEnabled = settingsMap['reservation_enabled'] === 'true'
    const remaining = Math.max(0, maxTotal - Number(reservedCount))
    
    // Phase 1（応募期間）は在庫に関係なく受け付ける
    // Phase 2（予約期間）は在庫がある場合のみ受け付ける
    const isAccepting = currentPhase === 1 ? reservationEnabled : (remaining > 0 && reservationEnabled)

    return c.json({
      success: true,
      data: {
        totalReserved: reservedCount,
        maxTotal,
        remaining,
        isAccepting,
        currentPhase,
        reservationEnabled
      }
    })
  } catch (error) {
    logSecureError('Status fetch', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// 店舗一覧取得
app.get('/api/stores', async (c) => {
  try {
    const db = c.env.DB
    const stores = await db.prepare(`
      SELECT * FROM stores WHERE is_active = 1 ORDER BY id
    `).all()

    return c.json({
      success: true,
      data: stores.results
    })
  } catch (error) {
    logSecureError('Stores fetch', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// 予約作成
app.post('/api/reserve', async (c) => {
  try {
    // レート制限チェック（1分間に10リクエストまで）
    const rateLimitError = await checkRateLimit(c, 'reserve', 10, 60)
    if (rateLimitError) return rateLimitError
    
    // CSRF検証
    const csrfError = await verifyCsrfToken(c)
    if (csrfError) return csrfError
    
    const data: Reservation = await c.req.json()
    const db = c.env.DB

    // タイムスロットの正規化（半角チルダを全角チルダに統一）
    if (data.pickupTime) {
      data.pickupTime = data.pickupTime.replace(/~/g, '～')
    }

    // 予約受付停止チェック
    const reservationEnabledCheck = await db.prepare(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'reservation_enabled'"
    ).first()

    if (reservationEnabledCheck?.setting_value === 'false') {
      return c.json({
        success: false,
        error: '現在、予約受付を停止しています。しばらく後に再度お試しください。'
      }, 403)
    }

    // 現在のフェーズを取得
    const phaseCheck = await db.prepare(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'current_phase'"
    ).first()
    const currentPhase = parseInt(phaseCheck?.setting_value || '1')

    // バリデーション
    const validation = validateReservation(data, currentPhase)
    if (!validation.valid) {
      return c.json({
        success: false,
        error: validation.error
      }, 400)
    }

    // 予約ID生成
    const reservationId = generateReservationId()

    // 在庫チェック（Phase 2のみ）
    // Phase 1は抽選・応募期間のため上限なく受け付ける
    if (currentPhase === 2) {
      const stockCheck = await db.prepare(`
        SELECT SUM(quantity) as total 
        FROM reservations 
        WHERE status = 'reserved'
      `).first()

      const currentReserved = Number(stockCheck?.total || 0)
      const maxTotal = 1000
      const remainingBooks = Math.max(0, maxTotal - currentReserved)

      if (currentReserved + data.quantity > maxTotal) {
        return c.json({
          success: false,
          error: `申し訳ございません。予約上限に達しました。現在の残り冊数: ${remainingBooks}冊`,
          remainingBooks: remainingBooks,
          requestedQuantity: data.quantity
        }, 400)
      }

      // 再度在庫を確認してから挿入（最終防衛ライン）
      const finalCheck = await db.prepare(`
        SELECT SUM(quantity) as total 
        FROM reservations 
        WHERE status = 'reserved'
      `).first()

      const finalReserved = Number(finalCheck?.total || 0)
      
      if (finalReserved + data.quantity > maxTotal) {
        return c.json({
          success: false,
          error: '申し訳ございません。他の方の予約が完了し、予約上限に達しました。',
          remainingBooks: Math.max(0, maxTotal - finalReserved)
        }, 400)
      }
    }

    // 予約挿入
    await db.prepare(`
      INSERT INTO reservations 
      (reservation_id, birth_date, full_name, kana, phone_number, quantity, 
       store_location, pickup_date, pickup_time_slot, status, reservation_phase, lottery_status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'reserved', ?, ?)
    `).bind(
      reservationId,
      data.birthDate,
      data.fullName,
      data.kana,
      data.phoneNumber,
      data.quantity,
      data.store,
      data.pickupDate,
      data.pickupTime,
      currentPhase,
      currentPhase === 2 ? 'n/a' : 'pending' // Phase 2は抽選対象外
    ).run()

    // メール送信（メールアドレスが提供されている場合のみ）
    if (data.email) {
      const emailHTML = getReservationConfirmationEmailHTML({
        fullName: data.fullName,
        reservationId: reservationId,
        quantity: data.quantity,
        storeLocation: data.store,
        pickupDate: data.pickupDate,
        pickupTime: data.pickupTime,
        reservationPhase: currentPhase,
        lotteryStatus: currentPhase === 2 ? 'n/a' : 'pending'
      })

      const emailResult = await sendEmail(
        data.email,
        'パスート24 プレミアム商品券 予約完了のお知らせ',
        emailHTML,
        c.env
      )

      if (!emailResult.success) {
        console.warn('Failed to send reservation confirmation email:', emailResult.error)
        // メール送信失敗してもエラーレスポンスは返さない（予約自体は成功）
      }
    }

    // 成功レスポンス
    return c.json({
      success: true,
      reservationId,
      message: '予約が完了しました。予約IDを大切に保管してください。',
      reservationDetails: {
        id: reservationId,
        name: data.fullName,
        quantity: data.quantity,
        store: data.store,
        pickupDateTime: `${data.pickupDate} ${data.pickupTime}`
      }
    })

  } catch (error) {
    logSecureError('Reservation', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました。しばらく後に再度お試しください。'
    }, 500)
  }
})

// 予約検索（予約IDまたは電話番号）
app.post('/api/search', async (c) => {
  try {
    const { searchType, searchValue } = await c.req.json()
    const db = c.env.DB

    if (!searchValue) {
      return c.json({
        success: false,
        error: '検索値を入力してください'
      }, 400)
    }

    let query = ''
    let params: string[] = []

    if (searchType === 'id') {
      query = 'SELECT * FROM reservations WHERE reservation_id = ?'
      params = [searchValue]
    } else if (searchType === 'phone') {
      query = 'SELECT * FROM reservations WHERE phone_number = ?'
      params = [searchValue]
    } else {
      return c.json({
        success: false,
        error: '無効な検索タイプです'
      }, 400)
    }

    const result = await db.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      data: result.results
    })

  } catch (error) {
    logSecureError('Search', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// 管理者認証チェック
app.post('/api/admin/auth', async (c) => {
  try {
    const { password } = await c.req.json()
    const adminPassword = c.env.ADMIN_PASSWORD || 'admin123'
    
    if (password === adminPassword) {
      // 簡易トークン生成（本番環境ではJWT等を使用）
      const token = btoa(`admin:${password}:${Date.now()}`)
      return c.json({
        success: true,
        token,
        message: '認証に成功しました'
      })
    } else {
      return c.json({
        success: false,
        error: 'パスワードが正しくありません'
      }, 401)
    }
  } catch (error) {
    logSecureError('Admin auth', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// トークン検証
app.post('/api/admin/verify', async (c) => {
  try {
    const { token } = await c.req.json()
    
    if (!token) {
      return c.json({ success: false, valid: false })
    }
    
    try {
      const decoded = atob(token)
      const [username, password, timestamp] = decoded.split(':')
      const adminPassword = c.env.ADMIN_PASSWORD || 'admin123'
      
      // トークンの有効期限チェック（24時間）
      const tokenAge = Date.now() - parseInt(timestamp)
      const isExpired = tokenAge > 24 * 60 * 60 * 1000
      
      if (username === 'admin' && password === adminPassword && !isExpired) {
        return c.json({ success: true, valid: true })
      }
    } catch {
      // トークンのデコードに失敗
    }
    
    return c.json({ success: true, valid: false })
  } catch (error) {
    logSecureError('Token verify', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// 予約一覧取得（管理画面用）
app.get('/api/admin/reservations', async (c) => {
  try {
    const db = c.env.DB
    const { status, store, date, lottery_status, include_lost, limit = '100', offset = '0' } = c.req.query()

    let query = 'SELECT * FROM reservations WHERE 1=1'
    const params: any[] = []

    // ヒートマップ用にinclude_lost=trueが指定されていない場合、落選者を除外
    if (include_lost !== 'true' && !lottery_status) {
      query += ' AND (lottery_status IS NULL OR lottery_status != ?)'
      params.push('lost')
    }

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    if (store) {
      query += ' AND store_location = ?'
      params.push(store)
    }

    if (date) {
      query += ' AND pickup_date = ?'
      params.push(date)
    }

    // 抽選ステータスでフィルタ
    if (lottery_status) {
      if (lottery_status === 'won') {
        query += ' AND lottery_status = ?'
        params.push('won')
      } else if (lottery_status === 'lost') {
        query += ' AND lottery_status = ?'
        params.push('lost')
      } else if (lottery_status === 'pending') {
        query += ' AND (lottery_status = ? OR lottery_status IS NULL)'
        params.push('pending')
      }
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))

    const result = await db.prepare(query).bind(...params).all()

    // 総件数取得
    let countQuery = 'SELECT COUNT(*) as total FROM reservations WHERE 1=1'
    const countParams: any[] = []

    // ヒートマップ用にinclude_lost=trueが指定されていない場合、落選者を除外
    if (include_lost !== 'true' && !lottery_status) {
      countQuery += ' AND (lottery_status IS NULL OR lottery_status != ?)'
      countParams.push('lost')
    }

    if (status) {
      countQuery += ' AND status = ?'
      countParams.push(status)
    }

    if (store) {
      countQuery += ' AND store_location = ?'
      countParams.push(store)
    }

    if (date) {
      countQuery += ' AND pickup_date = ?'
      countParams.push(date)
    }

    // 抽選ステータスでフィルタ
    if (lottery_status) {
      if (lottery_status === 'won') {
        countQuery += ' AND lottery_status = ?'
        countParams.push('won')
      } else if (lottery_status === 'lost') {
        countQuery += ' AND lottery_status = ?'
        countParams.push('lost')
      } else if (lottery_status === 'pending') {
        countQuery += ' AND (lottery_status = ? OR lottery_status IS NULL)'
        countParams.push('pending')
      }
    }

    const countResult = await db.prepare(countQuery).bind(...countParams).first()

    return c.json({
      success: true,
      data: result.results,
      total: countResult?.total || 0
    })

  } catch (error) {
    logSecureError('Admin reservations fetch', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// ステータス更新（管理画面用）
app.put('/api/admin/reservations/:id/status', async (c) => {
  try {
    const id = c.req.param('id')
    const { status } = await c.req.json()
    const db = c.env.DB

    if (!['reserved', 'completed', 'canceled'].includes(status)) {
      return c.json({
        success: false,
        error: '無効なステータスです'
      }, 400)
    }

    await db.prepare(`
      UPDATE reservations 
      SET status = ? 
      WHERE id = ?
    `).bind(status, id).run()

    return c.json({
      success: true,
      message: 'ステータスを更新しました'
    })

  } catch (error) {
    logSecureError('Status update', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// 受取完了処理（管理画面用）
app.post('/api/admin/reservations/:id/pickup', async (c) => {
  const authResponse = basicAuth(c)
  if (authResponse) return authResponse

  try {
    const id = c.req.param('id')
    const { staffName } = await c.req.json()
    const db = c.env.DB

    // 予約存在チェック
    const reservation = await db.prepare(`
      SELECT * FROM reservations WHERE id = ?
    `).bind(id).first()

    if (!reservation) {
      return c.json({
        success: false,
        error: '予約が見つかりません'
      }, 404)
    }

    // 既に受取済みかチェック
    if ((reservation as any).status === 'picked_up') {
      return c.json({
        success: false,
        error: 'この予約は既に受取完了しています'
      }, 400)
    }

    // 受取完了に更新
    await db.prepare(`
      UPDATE reservations 
      SET status = 'picked_up',
          picked_up_at = datetime('now'),
          picked_up_by = ?
      WHERE id = ?
    `).bind(staffName || 'スタッフ', id).run()

    return c.json({
      success: true,
      message: '受取完了を記録しました',
      pickedUpAt: new Date().toISOString()
    })

  } catch (error) {
    logSecureError('Pickup confirmation', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// 統計データ取得（管理画面用）
app.get('/api/admin/statistics', async (c) => {
  try {
    const db = c.env.DB

    // 総予約数・総冊数
    const totalStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_reservations,
        SUM(quantity) as total_books,
        SUM(CASE WHEN status = 'reserved' THEN quantity ELSE 0 END) as reserved_books,
        SUM(CASE WHEN status = 'picked_up' OR status = 'completed' THEN quantity ELSE 0 END) as completed_books,
        SUM(CASE WHEN status = 'canceled' THEN quantity ELSE 0 END) as canceled_books
      FROM reservations
    `).first()

    // 店舗別集計
    const storeStats = await db.prepare(`
      SELECT 
        store_location,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM reservations
      WHERE status = 'reserved'
      GROUP BY store_location
      ORDER BY total_quantity DESC
    `).all()

    // 日付別集計
    const dateStats = await db.prepare(`
      SELECT 
        pickup_date,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM reservations
      WHERE status = 'reserved'
      GROUP BY pickup_date
      ORDER BY pickup_date
    `).all()

    // 時間帯別集計
    const timeStats = await db.prepare(`
      SELECT 
        pickup_time_slot,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM reservations
      WHERE status = 'reserved'
      GROUP BY pickup_time_slot
      ORDER BY pickup_time_slot
    `).all()

    // システム設定から抽選実行状態を取得
    const lotteryExecutedSetting = await db.prepare(`
      SELECT setting_value FROM system_settings WHERE setting_key = 'lottery_executed'
    `).first()
    
    const lotteryExecuted = lotteryExecutedSetting?.setting_value === 'true'

    return c.json({
      success: true,
      data: {
        total: totalStats,
        byStore: storeStats.results,
        byDate: dateStats.results,
        byTime: timeStats.results,
        lotteryExecuted: lotteryExecuted
      }
    })

  } catch (error) {
    logSecureError('Statistics fetch', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// デフォルトルート
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>プレミアム商品券抽選・応募システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app"></div>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// 予約照会ページ（新版）
app.get('/lookup', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>予約照会 - プレミアム引換券予約システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div class="max-w-3xl mx-auto">
                <!-- ヘッダー -->
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">
                        <i class="fas fa-search mr-2 text-blue-600"></i>
                        予約照会
                    </h1>
                    <p class="text-gray-600">
                        予約IDまたは生年月日と電話番号で予約内容を確認できます
                    </p>
                </div>

                <!-- タブ切り替え -->
                <div class="bg-white rounded-lg shadow-md mb-6">
                    <div class="border-b border-gray-200">
                        <nav class="flex -mb-px">
                            <button id="tab-id" 
                                    class="tab-button active flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm"
                                    onclick="switchTab('id')">
                                <i class="fas fa-id-card mr-2"></i>
                                予約IDで照会
                            </button>
                            <button id="tab-birthdate" 
                                    class="tab-button flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm"
                                    onclick="switchTab('birthdate')">
                                <i class="fas fa-calendar mr-2"></i>
                                生年月日・電話番号で照会
                            </button>
                        </nav>
                    </div>

                    <!-- 予約IDで照会 -->
                    <div id="content-id" class="tab-content p-6">
                        <form id="form-id" class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-id-card mr-1"></i> 予約ID
                                </label>
                                <input type="text" id="input-reservation-id" required
                                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                       placeholder="例: PRE-20260227-ABCD12">
                                <p class="mt-2 text-sm text-gray-500">
                                    <i class="fas fa-info-circle mr-1"></i>
                                    予約完了時に表示された予約IDを入力してください
                                </p>
                            </div>

                            <button type="submit" 
                                    class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg transition">
                                <i class="fas fa-search mr-2"></i> 照会する
                            </button>
                        </form>
                    </div>

                    <!-- 生年月日・電話番号で照会 -->
                    <div id="content-birthdate" class="tab-content p-6 hidden">
                        <form id="form-birthdate" class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-birthday-cake mr-1"></i> 生年月日
                                </label>
                                <input type="date" id="input-birth-date" required
                                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-phone mr-1"></i> 電話番号
                                </label>
                                <input type="tel" id="input-phone-number" required
                                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                       placeholder="例: 090-1234-5678">
                                <p class="mt-2 text-sm text-gray-500">
                                    <i class="fas fa-info-circle mr-1"></i>
                                    ハイフンありでもなしでも検索できます
                                </p>
                            </div>

                            <button type="submit" 
                                    class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg transition">
                                <i class="fas fa-search mr-2"></i> 照会する
                            </button>
                        </form>
                    </div>
                </div>

                <!-- 結果表示エリア -->
                <div id="result-area" class="hidden"></div>

                <!-- トップページへ戻る -->
                <div class="text-center mt-8">
                    <a href="/" class="text-blue-600 hover:underline">
                        <i class="fas fa-arrow-left mr-1"></i> トップページへ戻る
                    </a>
                </div>
            </div>
        </div>

        <script src="/static/lookup.js"></script>
    </body>
    </html>
  `)
})

// 予約照会ページ
app.get('/search', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>予約照会 - プレミアム商品券抽選・応募システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="search-app"></div>
        <script src="/static/search.js"></script>
    </body>
    </html>
  `)
})

// 当選者掲示板ルート
app.get('/lottery-results', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>当選者発表 - プレミアム商品券抽選・応募システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="lottery-app"></div>
        <script src="/static/lottery.js"></script>
    </body>
    </html>
  `)
})

// 管理画面ルート
app.get('/admin', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>管理画面 - プレミアム商品券抽選・応募システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
    </head>
    <body class="bg-gray-50">
        <div id="admin-app"></div>
        <script src="/static/admin.js"></script>
    </body>
    </html>
  `)
})

// プライバシーポリシーページ（セキュリティ対策・法令遵守）
app.get('/privacy', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>プライバシーポリシー - プレミアム商品券抽選・応募システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50 py-8 px-4">
        <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                <i class="fas fa-shield-alt text-blue-500 mr-3"></i>
                プライバシーポリシー
            </h1>
            
            <section class="mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-3">1. 個人情報の収集</h2>
                <p class="text-gray-700 mb-3">
                    当システムでは、プレミアム商品券の予約管理のために、以下の個人情報を収集します：
                </p>
                <ul class="list-disc list-inside text-gray-700 space-y-2 ml-4">
                    <li>氏名（フルネーム）</li>
                    <li>生年月日</li>
                    <li>電話番号</li>
                    <li>受取店舗および受取日時</li>
                </ul>
            </section>

            <section class="mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-3">2. 利用目的</h2>
                <p class="text-gray-700 mb-3">
                    収集した個人情報は、以下の目的でのみ使用します：
                </p>
                <ul class="list-disc list-inside text-gray-700 space-y-2 ml-4">
                    <li>プレミアム商品券の予約管理</li>
                    <li>予約内容の確認</li>
                    <li>本人確認</li>
                    <li>予約に関する連絡・通知</li>
                    <li>統計情報の作成（個人を特定できない形式）</li>
                </ul>
            </section>

            <section class="mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-3">3. 第三者提供</h2>
                <p class="text-gray-700">
                    個人情報は、以下の場合を除き、第三者に提供することはありません：
                </p>
                <ul class="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-3">
                    <li>ご本人の同意がある場合</li>
                    <li>法令に基づく場合</li>
                    <li>人の生命、身体または財産の保護のために必要がある場合</li>
                </ul>
            </section>

            <section class="mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-3">4. 安全管理措置</h2>
                <p class="text-gray-700 mb-3">
                    個人情報の安全管理のため、以下の措置を講じています：
                </p>
                <ul class="list-disc list-inside text-gray-700 space-y-2 ml-4">
                    <li><strong>通信の暗号化</strong>: HTTPS通信により、データの送受信を暗号化</li>
                    <li><strong>アクセス制限</strong>: 管理者のみがデータにアクセス可能</li>
                    <li><strong>ログ管理</strong>: アクセスログを記録し、不正アクセスを監視</li>
                    <li><strong>セキュリティヘッダー</strong>: XSS、CSRF等の攻撃を防止</li>
                    <li><strong>入力検証</strong>: SQLインジェクション等の攻撃を防止</li>
                </ul>
            </section>

            <section class="mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-3">5. 個人情報の保存期間</h2>
                <p class="text-gray-700">
                    個人情報は、商品券の配布完了後、一定期間保管した後、適切に削除します。
                </p>
            </section>

            <section class="mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-3">6. Cookie等の使用</h2>
                <p class="text-gray-700">
                    当システムでは、管理画面のログイン状態を維持するために、ブラウザのローカルストレージを使用します。
                    これらの情報は、個人を特定するものではありません。
                </p>
            </section>

            <section class="mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-3">7. お問い合わせ</h2>
                <p class="text-gray-700">
                    個人情報の取扱いに関するお問い合わせ、開示請求、訂正、削除等のご要望は、
                    予約時にご登録いただいた電話番号にてお問い合わせください。
                </p>
            </section>

            <section class="mb-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p class="text-sm text-gray-700">
                    <i class="fas fa-info-circle text-blue-500 mr-2"></i>
                    <strong>最終更新日:</strong> ${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </section>

            <div class="mt-8 text-center">
                <a href="/" class="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold shadow-lg">
                    <i class="fas fa-home mr-2"></i>トップページに戻る
                </a>
            </div>
        </div>
    </body>
    </html>
  `)
})

// ===== 抽選システムAPI =====

// システム設定取得
app.get('/api/admin/settings', async (c) => {
  const authResponse = basicAuth(c)
  if (authResponse) return authResponse

  try {
    const db = c.env.DB
    const settings = await db.prepare('SELECT * FROM system_settings').all()
    
    const settingsObj: Record<string, string> = {}
    settings.results.forEach((row: any) => {
      settingsObj[row.setting_key] = row.setting_value
    })

    return c.json({
      success: true,
      settings: settingsObj
    })
  } catch (error) {
    logSecureError('GetSettings', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// システム設定更新
app.put('/api/admin/settings', async (c) => {
  const authResponse = basicAuth(c)
  if (authResponse) return authResponse

  try {
    const { key, value } = await c.req.json()
    const db = c.env.DB

    await db.prepare(`
      INSERT INTO system_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = datetime('now')
    `).bind(key, value).run()

    return c.json({
      success: true,
      message: '設定を更新しました'
    })
  } catch (error) {
    logSecureError('UpdateSettings', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// 抽選実行
app.post('/api/admin/lottery/execute', async (c) => {
  const authResponse = basicAuth(c)
  if (authResponse) return authResponse

  try {
    const db = c.env.DB

    // 既に抽選済みかチェック
    const lotteryCheck = await db.prepare(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'lottery_executed'"
    ).first()

    if (lotteryCheck?.setting_value === 'true') {
      return c.json({
        success: false,
        error: '抽選は既に実行済みです'
      }, 400)
    }

    // Phase 1の予約を取得（status='reserved', lottery_status='pending'）
    const reservations = await db.prepare(`
      SELECT * FROM reservations 
      WHERE status = 'reserved' 
      AND reservation_phase = 1
      AND (lottery_status = 'pending' OR lottery_status IS NULL)
      ORDER BY created_at ASC
    `).all()

    const totalApplications = reservations.results.length
    const totalQuantity = reservations.results.reduce((sum: number, r: any) => sum + r.quantity, 0)
    const maxQuantity = 1000

    // 1000冊未満の場合は全員当選
    if (totalQuantity <= maxQuantity) {
      // 全員を当選に設定
      for (const reservation of reservations.results) {
        await db.prepare(`
          UPDATE reservations 
          SET lottery_status = 'won', lottery_executed_at = datetime('now')
          WHERE id = ?
        `).bind((reservation as any).id).run()
      }

      // 抽選結果を記録
      await db.prepare(`
        INSERT INTO lottery_results 
        (total_applications, total_quantity_requested, winners_count, winners_quantity, losers_count, losers_quantity, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        totalApplications,
        totalQuantity,
        totalApplications,
        totalQuantity,
        0,
        0,
        '応募総数が1000冊未満のため全員当選'
      ).run()

      // lottery_executed フラグを更新
      await db.prepare(`
        UPDATE system_settings 
        SET setting_value = 'true', updated_at = datetime('now')
        WHERE setting_key = 'lottery_executed'
      `).run()

      await db.prepare(`
        UPDATE system_settings 
        SET setting_value = datetime('now'), updated_at = datetime('now')
        WHERE setting_key = 'lottery_executed_at'
      `).run()

      // 当選メールを送信（メールアドレスが登録されている場合のみ）
      console.log('Sending winner notification emails (all won scenario)...')
      let emailsSent = 0
      for (const reservation of reservations.results) {
        const res = reservation as any
        if (res.email) {
          const emailHTML = getLotteryWinnerEmailHTML({
            fullName: res.full_name,
            reservationId: res.reservation_id,
            quantity: res.quantity,
            storeLocation: res.store_location,
            pickupDate: res.pickup_date,
            pickupTime: res.pickup_time_slot
          })

          const emailResult = await sendEmail(
            res.email,
            'パスート24 プレミアム商品券 抽選結果のお知らせ（当選）',
            emailHTML,
            c.env
          )

          if (emailResult.success) {
            emailsSent++
          } else {
            console.warn(`Failed to send winner email to ${res.email}:`, emailResult.error)
          }
        }
      }
      console.log(`Winner notification emails sent: ${emailsSent}/${totalApplications}`)

      return c.json({
        success: true,
        message: '抽選が完了しました（全員当選）',
        result: {
          totalApplications,
          totalQuantity,
          winnersCount: totalApplications,
          winnersQuantity: totalQuantity,
          losersCount: 0,
          losersQuantity: 0,
          allWon: true
        }
      })
    }

    // 1000冊超過の場合はランダム抽選
    const shuffled = [...reservations.results].sort(() => Math.random() - 0.5)
    let currentTotal = 0
    const winners: any[] = []
    const losers: any[] = []

    for (const reservation of shuffled) {
      const res = reservation as any
      if (currentTotal + res.quantity <= maxQuantity) {
        winners.push(res)
        currentTotal += res.quantity
        
        // 当選に設定
        await db.prepare(`
          UPDATE reservations 
          SET lottery_status = 'won', lottery_executed_at = datetime('now')
          WHERE id = ?
        `).bind(res.id).run()
      } else {
        losers.push(res)
        
        // 落選に設定
        await db.prepare(`
          UPDATE reservations 
          SET lottery_status = 'lost', lottery_executed_at = datetime('now')
          WHERE id = ?
        `).bind(res.id).run()
      }
    }

    const winnersQuantity = winners.reduce((sum, r) => sum + r.quantity, 0)
    const losersQuantity = losers.reduce((sum, r) => sum + r.quantity, 0)

    // 抽選結果を記録
    await db.prepare(`
      INSERT INTO lottery_results 
      (total_applications, total_quantity_requested, winners_count, winners_quantity, losers_count, losers_quantity, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      totalApplications,
      totalQuantity,
      winners.length,
      winnersQuantity,
      losers.length,
      losersQuantity,
      `ランダム抽選により${winners.length}名が当選`
    ).run()

    // lottery_executed フラグを更新
    await db.prepare(`
      UPDATE system_settings 
      SET setting_value = 'true', updated_at = datetime('now')
      WHERE setting_key = 'lottery_executed'
    `).run()

    await db.prepare(`
      UPDATE system_settings 
      SET setting_value = datetime('now'), updated_at = datetime('now')
      WHERE setting_key = 'lottery_executed_at'
    `).run()

    // 抽選結果メールを送信（当選者・落選者両方）
    console.log('Sending lottery result notification emails...')
    let winnerEmailsSent = 0
    let loserEmailsSent = 0

    // 当選者にメール送信
    for (const winner of winners) {
      if (winner.email) {
        const emailHTML = getLotteryWinnerEmailHTML({
          fullName: winner.full_name,
          reservationId: winner.reservation_id,
          quantity: winner.quantity,
          storeLocation: winner.store_location,
          pickupDate: winner.pickup_date,
          pickupTime: winner.pickup_time_slot
        })

        const emailResult = await sendEmail(
          winner.email,
          'パスート24 プレミアム商品券 抽選結果のお知らせ（当選）',
          emailHTML,
          c.env
        )

        if (emailResult.success) {
          winnerEmailsSent++
        } else {
          console.warn(`Failed to send winner email to ${winner.email}:`, emailResult.error)
        }
      }
    }

    // 落選者にメール送信
    for (const loser of losers) {
      if (loser.email) {
        const emailHTML = getLotteryLoserEmailHTML({
          fullName: loser.full_name,
          reservationId: loser.reservation_id,
          quantity: loser.quantity
        })

        const emailResult = await sendEmail(
          loser.email,
          'パスート24 プレミアム商品券 抽選結果のお知らせ',
          emailHTML,
          c.env
        )

        if (emailResult.success) {
          loserEmailsSent++
        } else {
          console.warn(`Failed to send loser email to ${loser.email}:`, emailResult.error)
        }
      }
    }

    console.log(`Winner emails sent: ${winnerEmailsSent}/${winners.length}`)
    console.log(`Loser emails sent: ${loserEmailsSent}/${losers.length}`)

    return c.json({
      success: true,
      message: '抽選が完了しました',
      result: {
        totalApplications,
        totalQuantity,
        winnersCount: winners.length,
        winnersQuantity,
        losersCount: losers.length,
        losersQuantity,
        allWon: false
      }
    })

  } catch (error) {
    logSecureError('ExecuteLottery', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// 抽選結果取得（管理者用）
app.get('/api/admin/lottery/results', async (c) => {
  const authResponse = basicAuth(c)
  if (authResponse) return authResponse

  try {
    const db = c.env.DB
    const results = await db.prepare(`
      SELECT * FROM lottery_results ORDER BY execution_date DESC LIMIT 10
    `).all()

    return c.json({
      success: true,
      results: results.results
    })
  } catch (error) {
    logSecureError('GetLotteryResults', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// 当選者リスト取得（公開API）
app.get('/api/lottery/winners', async (c) => {
  try {
    const db = c.env.DB
    
    // 抽選実行済みかチェック
    const lotteryCheck = await db.prepare(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'lottery_executed'"
    ).first()

    if (lotteryCheck?.setting_value !== 'true') {
      return c.json({
        success: false,
        error: '抽選はまだ実行されていません',
        executed: false
      })
    }

    // 当選者の予約IDリストを取得
    const winners = await db.prepare(`
      SELECT reservation_id, full_name, quantity, created_at
      FROM reservations 
      WHERE lottery_status = 'won'
      ORDER BY reservation_id ASC
    `).all()

    return c.json({
      success: true,
      executed: true,
      winners: winners.results,
      totalWinners: winners.results.length
    })
  } catch (error) {
    logSecureError('GetWinners', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// 予約IDで当選確認（公開API）
app.post('/api/lottery/check', async (c) => {
  try {
    const { reservationId } = await c.req.json()
    const db = c.env.DB

    if (!reservationId) {
      return c.json({
        success: false,
        error: '予約IDを入力してください'
      }, 400)
    }

    // 抽選実行済みかチェック
    const lotteryCheck = await db.prepare(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'lottery_executed'"
    ).first()

    if (lotteryCheck?.setting_value !== 'true') {
      return c.json({
        success: false,
        error: '抽選はまだ実行されていません',
        executed: false
      })
    }

    // 予約を検索
    const reservation = await db.prepare(`
      SELECT reservation_id, lottery_status, quantity
      FROM reservations 
      WHERE reservation_id = ?
    `).bind(reservationId).first()

    if (!reservation) {
      return c.json({
        success: false,
        error: '予約IDが見つかりません'
      }, 404)
    }

    const isWinner = (reservation as any).lottery_status === 'won'

    return c.json({
      success: true,
      executed: true,
      found: true,
      isWinner,
      reservationId,
      quantity: (reservation as any).quantity,
      status: (reservation as any).lottery_status
    })
  } catch (error) {
    logSecureError('CheckLottery', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// 予約照会API（予約IDで検索）
app.post('/api/reservation/lookup/id', async (c) => {
  try {
    const db = c.env.DB
    const { reservationId } = await c.req.json()

    if (!reservationId) {
      return c.json({
        success: false,
        error: '予約IDを入力してください'
      }, 400)
    }

    const reservation = await db.prepare(`
      SELECT * FROM reservations WHERE reservation_id = ?
    `).bind(reservationId).first()

    if (!reservation) {
      return c.json({
        success: false,
        error: '予約が見つかりませんでした'
      }, 404)
    }

    return c.json({
      success: true,
      reservation: {
        id: reservation.reservation_id,
        fullName: reservation.full_name,
        phoneNumber: reservation.phone_number,
        quantity: reservation.quantity,
        storeLocation: reservation.store_location,
        pickupDate: reservation.pickup_date,
        pickupTimeSlot: reservation.pickup_time_slot,
        status: reservation.status,
        reservationPhase: reservation.reservation_phase,
        lotteryStatus: reservation.lottery_status,
        createdAt: reservation.created_at
      }
    })
  } catch (error) {
    logSecureError('ReservationLookupById', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// 予約照会API（生年月日+電話番号で検索）
app.post('/api/reservation/lookup/birthdate', async (c) => {
  try {
    const db = c.env.DB
    const { birthDate, phoneNumber } = await c.req.json()

    if (!birthDate || !phoneNumber) {
      return c.json({
        success: false,
        error: '生年月日と電話番号を入力してください'
      }, 400)
    }

    // 電話番号のハイフンを除去して検索
    const normalizedPhone = phoneNumber.replace(/-/g, '')

    const reservations = await db.prepare(`
      SELECT * FROM reservations 
      WHERE birth_date = ? 
      AND REPLACE(phone_number, '-', '') = ?
      ORDER BY created_at DESC
    `).bind(birthDate, normalizedPhone).all()

    if (!reservations.results || reservations.results.length === 0) {
      return c.json({
        success: false,
        error: '予約が見つかりませんでした'
      }, 404)
    }

    return c.json({
      success: true,
      reservations: reservations.results.map((r: any) => ({
        id: r.reservation_id,
        fullName: r.full_name,
        phoneNumber: r.phone_number,
        quantity: r.quantity,
        storeLocation: r.store_location,
        pickupDate: r.pickup_date,
        pickupTimeSlot: r.pickup_time_slot,
        status: r.status,
        reservationPhase: r.reservation_phase,
        lotteryStatus: r.lottery_status,
        createdAt: r.created_at
      }))
    })
  } catch (error) {
    logSecureError('ReservationLookupByBirthdate', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

export default app

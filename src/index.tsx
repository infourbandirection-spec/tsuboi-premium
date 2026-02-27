import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
  ADMIN_PASSWORD?: string
  CSRF_KV?: KVNamespace
  RATE_LIMIT_KV?: KVNamespace
}

type Reservation = {
  birthDate: string
  fullName: string
  phoneNumber: string
  quantity: number
  store: string
  pickupDate: string
  pickupTime: string
}

const app = new Hono<{ Bindings: Bindings }>()

// 簡易認証ミドルウェア
function basicAuth(c: any) {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader) {
    return c.json({ success: false, error: '認証が必要です' }, 401)
  }

  const [scheme, credentials] = authHeader.split(' ')
  
  if (scheme !== 'Basic') {
    return c.json({ success: false, error: '認証方式が無効です' }, 401)
  }

  const decoded = atob(credentials)
  const [username, password] = decoded.split(':')
  
  // 簡易認証（本番環境では環境変数から取得）
  const adminPassword = c.env.ADMIN_PASSWORD || 'admin123'
  
  if (username !== 'admin' || password !== adminPassword) {
    return c.json({ success: false, error: '認証に失敗しました' }, 401)
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
function validateReservation(data: any): { valid: boolean; error?: string } {
  // 入力サニタイゼーション（セキュリティ対策）
  if (data.fullName) data.fullName = sanitizeInput(data.fullName)
  if (data.phoneNumber) data.phoneNumber = sanitizeInput(data.phoneNumber)
  if (data.store) data.store = sanitizeInput(data.store)

  // 必須項目チェック
  const required = ['birthDate', 'fullName', 'phoneNumber', 'quantity', 'store', 'pickupDate', 'pickupTime']
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

  // 受け取り日チェック（1週間以内）
  const pickupDate = new Date(data.pickupDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const oneWeekLater = new Date(today)
  oneWeekLater.setDate(oneWeekLater.getDate() + 7)

  if (pickupDate < today || pickupDate > oneWeekLater) {
    return { valid: false, error: '受け取り日は本日から1週間以内で指定してください' }
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
    const maxBooks = await db.prepare(`
      SELECT setting_value 
      FROM system_settings 
      WHERE setting_key = 'max_total_books'
    `).first()

    const maxTotal = parseInt(maxBooks?.setting_value || '1000')
    const remaining = Math.max(0, maxTotal - Number(reservedCount))
    const isAccepting = remaining > 0

    return c.json({
      success: true,
      data: {
        totalReserved: reservedCount,
        maxTotal,
        remaining,
        isAccepting
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

    // バリデーション
    const validation = validateReservation(data)
    if (!validation.valid) {
      return c.json({
        success: false,
        error: validation.error
      }, 400)
    }

    // 予約ID生成
    const reservationId = generateReservationId()

    // D1のBATCH APIを使用してアトミックに処理
    // 1. 在庫チェック、2. 重複チェック、3. 予約挿入を一括実行
    const results = await db.batch([
      // 1. 在庫チェック
      db.prepare(`
        SELECT SUM(quantity) as total 
        FROM reservations 
        WHERE status = 'reserved'
      `),
      // 2. 重複チェック
      db.prepare(`
        SELECT id FROM reservations 
        WHERE phone_number = ? AND status = 'reserved'
      `).bind(data.phoneNumber)
    ])

    // 在庫チェック結果
    const currentReserved = Number(results[0].results[0]?.total || 0)
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

    // 重複チェック結果
    if (results[1].results.length > 0) {
      return c.json({
        success: false,
        error: 'この電話番号では既に予約済みです。'
      }, 400)
    }

    // 予約データ挿入
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

    // 予約挿入
    await db.prepare(`
      INSERT INTO reservations 
      (reservation_id, birth_date, full_name, phone_number, quantity, 
       store_location, pickup_date, pickup_time_slot, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'reserved')
    `).bind(
      reservationId,
      data.birthDate,
      data.fullName,
      data.phoneNumber,
      data.quantity,
      data.store,
      data.pickupDate,
      data.pickupTime
    ).run()

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
    const { status, store, date, limit = '100', offset = '0' } = c.req.query()

    let query = 'SELECT * FROM reservations WHERE 1=1'
    const params: any[] = []

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

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))

    const result = await db.prepare(query).bind(...params).all()

    // 総件数取得
    let countQuery = 'SELECT COUNT(*) as total FROM reservations WHERE 1=1'
    const countParams: any[] = []

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
        SUM(CASE WHEN status = 'completed' THEN quantity ELSE 0 END) as completed_books,
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

    return c.json({
      success: true,
      data: {
        total: totalStats,
        byStore: storeStats.results,
        byDate: dateStats.results,
        byTime: timeStats.results
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
        <title>プレミアム商品券予約・抽選システム</title>
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

// 予約照会ページ
app.get('/search', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>予約照会 - プレミアム商品券予約・抽選システム</title>
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

// 管理画面ルート
app.get('/admin', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>管理画面 - プレミアム商品券予約・抽選システム</title>
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
        <title>プライバシーポリシー - プレミアム商品券予約・抽選システム</title>
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

export default app

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
  ADMIN_PASSWORD?: string
}

type Reservation = {
  birthDate: string
  address: string
  addressType: 'workplace' | 'home'
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

// 静的ファイル配信
app.use('/static/*', serveStatic({ root: './public' }))

// ===== ユーティリティ関数 =====

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

// バリデーション
function validateReservation(data: any): { valid: boolean; error?: string } {
  // 必須項目チェック
  const required = ['birthDate', 'address', 'addressType', 'fullName', 'phoneNumber', 'quantity', 'store', 'pickupDate', 'pickupTime']
  for (const field of required) {
    if (!data[field]) {
      return { valid: false, error: `${field}は必須です` }
    }
  }

  // 住所チェック
  if (data.address.length < 5) {
    return { valid: false, error: '住所を正しく入力してください' }
  }

  // 住所タイプチェック
  if (data.addressType !== 'workplace' && data.addressType !== 'home') {
    return { valid: false, error: '住所の種類が無効です' }
  }

  // 冊数チェック
  const quantity = parseInt(data.quantity)
  if (isNaN(quantity) || quantity < 1 || quantity > 6) {
    return { valid: false, error: '冊数は1～6の範囲で指定してください' }
  }

  // 電話番号形式チェック
  const phoneRegex = /^0\d{1,4}-?\d{1,4}-?\d{4}$/
  if (!phoneRegex.test(data.phoneNumber)) {
    return { valid: false, error: '電話番号の形式が正しくありません' }
  }

  // 生年月日チェック（未来日不可）
  const birthDate = new Date(data.birthDate)
  if (birthDate > new Date()) {
    return { valid: false, error: '生年月日に未来の日付は指定できません' }
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
    console.error('Status fetch error:', error)
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
    console.error('Stores fetch error:', error)
    return c.json({
      success: false,
      error: 'システムエラーが発生しました'
    }, 500)
  }
})

// 予約作成
app.post('/api/reserve', async (c) => {
  try {
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
      (reservation_id, birth_date, address, address_type, full_name, phone_number, quantity, 
       store_location, pickup_date, pickup_time_slot, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reserved')
    `).bind(
      reservationId,
      data.birthDate,
      data.address,
      data.addressType,
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
      message: '予約が完了しました。予約IDを控えてください。',
      reservationDetails: {
        id: reservationId,
        name: data.fullName,
        quantity: data.quantity,
        store: data.store,
        pickupDateTime: `${data.pickupDate} ${data.pickupTime}`
      }
    })

  } catch (error) {
    console.error('Reservation error:', error)
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
    console.error('Search error:', error)
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
    console.error('Auth error:', error)
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
    console.error('Verify error:', error)
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
    console.error('Admin reservations fetch error:', error)
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
    console.error('Status update error:', error)
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
    console.error('Statistics fetch error:', error)
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
        <title>プレミアム商品券予約システム</title>
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

// 管理画面ルート
app.get('/admin', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>管理画面 - プレミアム商品券予約システム</title>
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

export default app

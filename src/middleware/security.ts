/**
 * セキュリティミドルウェア
 * - CSRF保護
 * - IPレート制限
 */

import type { Context, Next } from 'hono'

type Bindings = {
  DB: D1Database
  CSRF_TOKENS?: KVNamespace
  RATE_LIMIT?: KVNamespace
  ADMIN_PASSWORD?: string
  RESEND_API_KEY?: string
  RESEND_FROM_EMAIL?: string
}

/**
 * IPアドレス取得
 */
function getClientIP(c: Context): string {
  return c.req.header('CF-Connecting-IP') 
    || c.req.header('X-Forwarded-For')?.split(',')[0].trim()
    || c.req.header('X-Real-IP')
    || 'unknown'
}

/**
 * CSRFトークン生成
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * CSRF保護ミドルウェア
 * KVが利用可能な場合のみ動作、なければスキップ
 */
export async function csrfProtection(c: Context<{ Bindings: Bindings }>, next: Next) {
  const env = c.env
  
  // KVが未設定の場合はスキップ
  if (!env.CSRF_TOKENS) {
    return await next()
  }

  const method = c.req.method

  // GET/HEAD/OPTIONSはスキップ
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return await next()
  }

  // CSRFトークン検証
  const token = c.req.header('X-CSRF-Token') || c.req.header('csrf-token')
  
  if (!token) {
    return c.json({
      success: false,
      error: 'CSRFトークンが必要です'
    }, 403)
  }

  // トークンの有効性確認
  const storedToken = await env.CSRF_TOKENS.get(`csrf:${token}`)
  
  if (!storedToken) {
    return c.json({
      success: false,
      error: 'CSRFトークンが無効または期限切れです'
    }, 403)
  }

  // トークン削除（ワンタイムトークン）
  await env.CSRF_TOKENS.delete(`csrf:${token}`)

  return await next()
}

/**
 * IPレート制限ミドルウェア
 * KVが利用可能な場合のみ動作、なければスキップ
 */
export function rateLimiter(options: {
  windowMs: number  // 時間窓（ミリ秒）
  maxRequests: number  // 最大リクエスト数
  message?: string
}) {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const env = c.env
    
    // KVが未設定の場合はスキップ
    if (!env.RATE_LIMIT) {
      return await next()
    }

    const ip = getClientIP(c)
    const now = Date.now()
    const windowStart = now - options.windowMs
    const key = `ratelimit:${ip}`

    // 現在の記録を取得
    const recordStr = await env.RATE_LIMIT.get(key)
    let timestamps: number[] = []

    if (recordStr) {
      timestamps = JSON.parse(recordStr)
      // 時間窓外のタイムスタンプを削除
      timestamps = timestamps.filter(ts => ts > windowStart)
    }

    // リクエスト数チェック
    if (timestamps.length >= options.maxRequests) {
      return c.json({
        success: false,
        error: options.message || 'リクエスト数が制限を超えています。しばらくお待ちください。'
      }, 429)
    }

    // 新しいタイムスタンプを追加
    timestamps.push(now)

    // KVに保存（TTL: 時間窓の2倍）
    await env.RATE_LIMIT.put(
      key,
      JSON.stringify(timestamps),
      { expirationTtl: Math.ceil(options.windowMs / 1000) * 2 }
    )

    return await next()
  }
}

/**
 * CSRFトークンAPI（トークン取得用）
 */
export async function getCSRFTokenAPI(c: Context<{ Bindings: Bindings }>) {
  const env = c.env
  
  // KVが未設定の場合
  if (!env.CSRF_TOKENS) {
    return c.json({
      success: false,
      error: 'CSRF保護が無効です（KV未設定）'
    }, 503)
  }

  const token = generateCSRFToken()
  
  // トークンを30分間有効で保存
  await env.CSRF_TOKENS.put(`csrf:${token}`, 'valid', { expirationTtl: 1800 })

  return c.json({
    success: true,
    token
  })
}

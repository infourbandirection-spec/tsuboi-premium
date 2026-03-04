// プレミアム商品券予約・抽選システム - 当選者掲示板

class LotteryResultsApp {
  constructor() {
    this.lotteryExecuted = false
    this.winners = []
    this.searchTerm = ''
    this.init()
  }

  async init() {
    await this.loadWinners()
    this.render()
  }

  async loadWinners() {
    try {
      const response = await fetch('/api/lottery/winners')
      const data = await response.json()

      if (data.success && data.executed) {
        this.lotteryExecuted = true
        this.winners = data.winners || []
      } else {
        this.lotteryExecuted = false
        this.winners = []
      }
    } catch (error) {
      console.error('Load winners error:', error)
    }
  }

  async checkReservationId(reservationId) {
    try {
      const response = await fetch('/api/lottery/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId })
      })

      const data = await response.json()

      if (!data.success) {
        return { found: false, error: data.error }
      }

      if (!data.executed) {
        return { found: false, error: '抽選はまだ実行されていません' }
      }

      return {
        found: data.found,
        isWinner: data.isWinner,
        reservationId: data.reservationId,
        quantity: data.quantity
      }
    } catch (error) {
      console.error('Check error:', error)
      return { found: false, error: 'システムエラーが発生しました' }
    }
  }

  escapeHtml(text) {
    const map = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    }
    return String(text).replace(/[<>&"'\/]/g, m => map[m])
  }

  getFilteredWinners() {
    if (!this.searchTerm) {
      return this.winners
    }
    
    const term = this.searchTerm.toUpperCase()
    return this.winners.filter(w => 
      w.reservation_id.toUpperCase().includes(term)
    )
  }

  render() {
    const app = document.getElementById('lottery-app')
    
    if (!this.lotteryExecuted) {
      app.innerHTML = this.renderNotExecuted()
      return
    }

    const filteredWinners = this.getFilteredWinners()

    app.innerHTML = `
      <div class="min-h-screen bg-gray-50 py-12 px-4">
        <div class="max-w-6xl mx-auto">
          <!-- ヘッダー -->
          <div class="bg-white rounded-lg shadow-2xl p-8 mb-8">
            <div class="text-center mb-6">
              <h1 class="text-4xl font-bold text-gray-800 mb-3">
                当選者発表
              </h1>
              <p class="text-xl text-gray-600 mb-2">
                プレミアム商品券予約抽選
              </p>
              <p class="text-gray-500">
                おめでとうございます！以下の予約IDの方が当選されました
              </p>
            </div>

            <div class="bg-gray-100 rounded-lg p-6 border-2 border-gray-300">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                <div>
                  <p class="text-sm text-gray-600 mb-1">合計冊数</p>
                  <p class="text-3xl font-bold text-gray-800">
                    ${this.winners.reduce((sum, w) => sum + w.quantity, 0)} 冊
                  </p>
                </div>
                <div>
                  <p class="text-sm text-gray-600 mb-1">抽選日</p>
                  <p class="text-lg font-bold text-gray-800">
                    ${this.winners.length > 0 ? new Date(this.winners[0].created_at).toLocaleDateString('ja-JP') : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- 予約ID検索 -->
          <div class="bg-white rounded-lg shadow-xl p-6 mb-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">
              <i class="fas fa-search text-gray-600 mr-2"></i>
              予約ID検索
            </h2>
            <div class="flex gap-4">
              <input 
                type="text" 
                id="checkReservationId" 
                class="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="例: PRE-20260227-XXXXX"
                maxlength="30"
              >
              <button 
                onclick="lotteryApp.performCheck()" 
                class="px-8 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-bold shadow-lg transition">
                <i class="fas fa-search mr-2"></i>
                検索
              </button>
            </div>
            <div id="checkResult" class="mt-4"></div>
          </div>

          <!-- 一覧フィルター -->
          <div class="bg-white rounded-lg shadow-xl p-6 mb-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">
              <i class="fas fa-filter text-gray-600 mr-2"></i>
              当選者一覧フィルター
            </h2>
            <input 
              type="text" 
              value="${this.escapeHtml(this.searchTerm)}"
              onchange="lotteryApp.searchTerm = this.value; lotteryApp.render()"
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
              placeholder="予約IDで絞り込み（部分一致）"
            >
            ${this.searchTerm ? `
              <p class="mt-2 text-sm text-gray-600">
                ${filteredWinners.length} 件が見つかりました
                <button onclick="lotteryApp.searchTerm = ''; lotteryApp.render()" 
                        class="ml-2 text-gray-600 hover:underline">
                  クリア
                </button>
              </p>
            ` : ''}
          </div>

          <!-- 当選者一覧 -->
          <div class="bg-white rounded-lg shadow-xl p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">
              <i class="fas fa-list text-gray-600 mr-2"></i>
              当選者一覧
            </h2>
            
            ${filteredWinners.length === 0 ? `
              <div class="text-center py-12 text-gray-500">
                <i class="fas fa-inbox text-6xl mb-4"></i>
                <p class="text-xl">該当する当選者が見つかりません</p>
              </div>
            ` : `
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${filteredWinners.map((winner, index) => `
                  <div class="bg-white rounded-lg p-4 border-2 border-gray-300 hover:shadow-lg transition">
                    <div class="flex items-start justify-between mb-2">
                      <span class="inline-block px-3 py-1 bg-gray-700 text-white rounded text-sm font-bold">
                        No.${index + 1}
                      </span>
                    </div>
                    <p class="text-sm text-gray-600 mb-1">予約ID</p>
                    <p class="text-lg font-bold text-gray-800 break-all mb-3">
                      ${this.escapeHtml(winner.reservation_id)}
                    </p>
                    <div class="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span class="text-sm text-gray-600">冊数</span>
                      <span class="text-lg font-bold text-gray-800">${winner.quantity} 冊</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- 注意事項 -->
          <div class="bg-white rounded-lg shadow-xl p-6 mt-8">
            <h3 class="text-xl font-bold text-gray-800 mb-4">
              <i class="fas fa-info-circle text-gray-600 mr-2"></i>
              購入について
            </h3>
            <ul class="space-y-3 text-gray-700">
              <li class="flex items-start">
                <i class="fas fa-check-circle text-gray-600 mt-1 mr-3"></i>
                <span>当選された方は、予約時に指定した購入日時に商品券を受け取れます</span>
              </li>
              <li class="flex items-start">
                <i class="fas fa-id-card text-gray-600 mt-1 mr-3"></i>
                <span><strong>本人確認書類（運転免許証、マイナンバーカード等）</strong>を必ずご持参ください</span>
              </li>
              <li class="flex items-start">
                <i class="fas fa-user text-gray-600 mt-1 mr-3"></i>
                <span><strong>ご本人様のみ</strong>購入可能です（代理人不可）</span>
              </li>
              <li class="flex items-start">
                <i class="fas fa-map-marker-alt text-gray-600 mt-1 mr-3"></i>
                <span>購入場所: <strong>株式会社パスート24</strong>（熊本県熊本市中央区中央街4-29）</span>
              </li>
              <li class="flex items-start">
                <i class="fas fa-exclamation-triangle text-gray-600 mt-1 mr-3"></i>
                <span>購入予定日を過ぎた場合は<strong>自動的にキャンセル</strong>されます</span>
              </li>
            </ul>
          </div>

          <!-- ボタン -->
          <div class="mt-8 flex gap-4 justify-center">
            <a href="/" class="px-8 py-4 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-bold shadow-lg transition">
              <i class="fas fa-home mr-2"></i>
              トップページ
            </a>
            <a href="/search" class="px-8 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold shadow-lg transition">
              <i class="fas fa-search mr-2"></i>
              予約照会
            </a>
          </div>
        </div>
      </div>
    `
  }

  renderNotExecuted() {
    return `
      <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-2xl p-12 max-w-2xl text-center">
          <i class="fas fa-clock text-7xl text-gray-400 mb-6"></i>
          <h1 class="text-3xl font-bold text-gray-800 mb-4">
            抽選はまだ実行されていません
          </h1>
          <p class="text-gray-600 mb-8">
            抽選結果が発表されるまでしばらくお待ちください
          </p>
          <div class="flex gap-4 justify-center">
            <a href="/" class="px-8 py-4 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-bold shadow-lg transition">
              <i class="fas fa-home mr-2"></i>
              トップページ
            </a>
            <button onclick="location.reload()" class="px-8 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold shadow-lg transition">
              <i class="fas fa-sync-alt mr-2"></i>
              再読み込み
            </button>
          </div>
        </div>
      </div>
    `
  }

  async performCheck() {
    const input = document.getElementById('checkReservationId')
    const resultDiv = document.getElementById('checkResult')
    const reservationId = input.value.trim()

    if (!reservationId) {
      resultDiv.innerHTML = `
        <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p class="text-red-700">予約IDを入力してください</p>
        </div>
      `
      return
    }

    resultDiv.innerHTML = `
      <div class="text-center py-4">
        <i class="fas fa-spinner fa-spin text-3xl text-blue-500"></i>
        <p class="text-gray-600 mt-2">検索中...</p>
      </div>
    `

    const result = await this.checkReservationId(reservationId)

    if (!result.found) {
      resultDiv.innerHTML = `
        <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p class="text-red-700">
            <i class="fas fa-times-circle mr-2"></i>
            ${this.escapeHtml(result.error || '予約IDが見つかりませんでした')}
          </p>
        </div>
      `
      return
    }

    if (result.isWinner) {
      resultDiv.innerHTML = `
        <div class="bg-gray-50 border-l-4 border-gray-700 p-6 rounded">
          <div class="flex items-center mb-3">
            <i class="fas fa-check-circle text-4xl text-gray-700 mr-4"></i>
            <div>
              <p class="text-2xl font-bold text-gray-800">おめでとうございます！当選されました！</p>
              <p class="text-sm text-gray-600 mt-1">予約ID: ${this.escapeHtml(result.reservationId)}</p>
            </div>
          </div>
          <div class="bg-white rounded p-4 mt-4">
            <p class="text-gray-700">
              <i class="fas fa-ticket-alt mr-2 text-gray-600"></i>
              <strong>当選冊数:</strong> ${result.quantity} 冊
            </p>
            <p class="text-sm text-gray-600 mt-3">
              <i class="fas fa-info-circle mr-2"></i>
              予約時に指定した購入日時に商品券を受け取れます。本人確認書類をご持参ください。
            </p>
          </div>
        </div>
      `
    } else {
      resultDiv.innerHTML = `
        <div class="bg-gray-50 border-l-4 border-gray-500 p-6 rounded">
          <div class="flex items-center mb-3">
            <i class="fas fa-times-circle text-4xl text-gray-500 mr-4"></i>
            <div>
              <p class="text-xl font-bold text-gray-700">残念ながら今回は当選されませんでした</p>
              <p class="text-sm text-gray-600 mt-1">予約ID: ${this.escapeHtml(result.reservationId)}</p>
            </div>
          </div>
          <p class="text-sm text-gray-600 mt-3">
            <i class="fas fa-info-circle mr-2"></i>
            次回の募集をお待ちください。ご応募ありがとうございました。
          </p>
        </div>
      `
    }
  }
}

// アプリケーション初期化
let lotteryApp
document.addEventListener('DOMContentLoaded', () => {
  lotteryApp = new LotteryResultsApp()
  window.lotteryApp = lotteryApp
})

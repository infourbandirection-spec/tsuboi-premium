// 予約照会システム - 電話番号と生年月日で検索

class SearchApp {
  constructor() {
    this.searchResults = []
    this.init()
  }

  // HTMLエスケープ関数（XSS対策）
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
    return String(text).replace(/[<>&"'\/]/g, (char) => map[char])
  }

  init() {
    this.render()
    this.attachEventListeners()
  }

  render() {
    const app = document.getElementById('search-app')
    app.innerHTML = this.renderSearchPage()
  }

  renderSearchPage() {
    return `
      <div class="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
        <div class="max-w-4xl mx-auto">
          <!-- ヘッダー -->
          <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div class="flex justify-between items-center mb-4">
              <h1 class="text-3xl font-bold text-gray-800">
                <i class="fas fa-search text-purple-500 mr-3"></i>
                予約照会
              </h1>
              <button onclick="location.href='/'" 
                      class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold">
                <i class="fas fa-home mr-2"></i> トップ
              </button>
            </div>
            <p class="text-gray-600">
              <i class="fas fa-info-circle mr-2"></i>
              電話番号と生年月日を入力すると、予約内容を確認できます
            </p>
          </div>

          <!-- 検索フォーム -->
          <div class="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 class="text-xl font-bold text-gray-800 mb-6">
              <i class="fas fa-key text-blue-500 mr-2"></i>
              予約情報を入力してください
            </h2>
            
            <div class="space-y-6">
              <!-- 電話番号入力 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-phone mr-2"></i>電話番号
                </label>
                <input type="tel" id="searchPhone" 
                       class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                       placeholder="例: 090-1234-5678"
                       maxlength="13">
                <p class="mt-2 text-sm text-gray-500">
                  予約時に入力した電話番号を入力してください
                </p>
              </div>

              <!-- 生年月日入力 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-calendar-alt mr-2"></i>生年月日
                </label>
                <input type="date" id="searchBirthDate" 
                       class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                       max="${new Date().toISOString().split('T')[0]}">
                <p class="mt-2 text-sm text-gray-500">
                  予約時に入力した生年月日を入力してください
                </p>
              </div>

              <!-- 検索ボタン -->
              <button onclick="searchApp.searchReservations()" id="searchBtn"
                      class="w-full px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 font-bold shadow-lg text-lg">
                <i class="fas fa-search mr-2"></i> 予約を検索
              </button>
            </div>
          </div>

          <!-- 検索結果エリア -->
          <div id="searchResults"></div>
        </div>
      </div>
    `
  }

  attachEventListeners() {
    // 電話番号の自動ハイフン挿入
    document.addEventListener('input', (e) => {
      if (e.target.id === 'searchPhone') {
        let value = e.target.value.replace(/[^0-9]/g, '')
        if (value.length > 3 && value.length <= 7) {
          value = value.slice(0, 3) + '-' + value.slice(3)
        } else if (value.length > 7) {
          value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11)
        }
        e.target.value = value
      }
    })
  }

  async searchReservations() {
    const phoneNumber = document.getElementById('searchPhone').value
    const birthDate = document.getElementById('searchBirthDate').value
    const searchBtn = document.getElementById('searchBtn')
    const resultsDiv = document.getElementById('searchResults')

    // バリデーション
    if (!phoneNumber || !birthDate) {
      alert('電話番号と生年月日を両方入力してください')
      return
    }

    if (!/^0\d{1,4}-?\d{1,4}-?\d{4}$/.test(phoneNumber)) {
      alert('電話番号の形式が正しくありません')
      return
    }

    // ボタン無効化
    searchBtn.disabled = true
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 検索中...'

    try {
      // 電話番号で検索
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          searchType: 'phone',
          searchValue: phoneNumber
        })
      })

      const data = await response.json()

      if (data.success && data.data) {
        // 生年月日でフィルタリング
        const filtered = data.data.filter(r => r.birth_date === birthDate)
        
        if (filtered.length > 0) {
          this.searchResults = filtered
          this.renderResults()
        } else {
          resultsDiv.innerHTML = this.renderNoResults()
        }
      } else {
        resultsDiv.innerHTML = this.renderNoResults()
      }

    } catch (error) {
      console.error('Search error:', error)
      alert('検索中にエラーが発生しました')
    } finally {
      searchBtn.disabled = false
      searchBtn.innerHTML = '<i class="fas fa-search mr-2"></i> 予約を検索'
    }
  }

  renderResults() {
    const resultsDiv = document.getElementById('searchResults')
    resultsDiv.innerHTML = `
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">
          <i class="fas fa-check-circle text-green-500 mr-2"></i>
          予約が見つかりました（${this.searchResults.length}件）
        </h2>
        
        <div class="space-y-6">
          ${this.searchResults.map(reservation => this.renderReservationCard(reservation)).join('')}
        </div>
      </div>
    `
  }

  renderReservationCard(reservation) {
    const statusColors = {
      'reserved': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'canceled': 'bg-red-100 text-red-800'
    }

    const statusLabels = {
      'reserved': '予約済み',
      'completed': '受取完了',
      'canceled': 'キャンセル'
    }

    const statusColor = statusColors[reservation.status] || 'bg-gray-100 text-gray-800'
    const statusLabel = statusLabels[reservation.status] || reservation.status

    return `
      <div class="border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
        <!-- ステータスバッジと予約ID -->
        <div class="flex justify-between items-start mb-4">
          <div>
            <span class="inline-block px-3 py-1 ${statusColor} rounded-full text-sm font-bold mb-2">
              ${this.escapeHtml(statusLabel)}
            </span>
            <h3 class="text-2xl font-bold text-gray-800 break-all">
              ${this.escapeHtml(reservation.reservation_id)}
            </h3>
            <p class="text-sm text-gray-500 mt-1">予約ID</p>
          </div>
          <button onclick="searchApp.copyToClipboard('${reservation.reservation_id}')" 
                  class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold text-sm">
            <i class="fas fa-copy mr-1"></i> コピー
          </button>
        </div>

        <!-- 予約詳細 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">
              <i class="fas fa-user mr-2"></i>氏名
            </p>
            <p class="text-lg font-bold">${this.escapeHtml(reservation.full_name)}</p>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">
              <i class="fas fa-phone mr-2"></i>電話番号
            </p>
            <p class="text-lg font-bold">${this.escapeHtml(reservation.phone_number)}</p>
          </div>

          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">
              <i class="fas fa-ticket-alt mr-2"></i>購入冊数
            </p>
            <p class="text-lg font-bold">${this.escapeHtml(String(reservation.quantity))} 冊</p>
          </div>

          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">
              <i class="fas fa-map-marker-alt mr-2"></i>受取場所
            </p>
            <p class="text-lg font-bold">${this.escapeHtml(reservation.store_location)}</p>
          </div>

          <div class="bg-gray-50 p-4 rounded-lg md:col-span-2">
            <p class="text-sm text-gray-600 mb-1">
              <i class="fas fa-clock mr-2"></i>受取日時
            </p>
            <p class="text-lg font-bold">
              ${this.escapeHtml(reservation.pickup_date)} ${this.escapeHtml(reservation.pickup_time_slot)}
            </p>
          </div>
        </div>

        <!-- 注意事項 -->
        ${reservation.status === 'reserved' ? `
          <div class="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-2">
            <p class="text-sm text-gray-800 mb-2">
              <i class="fas fa-clock text-yellow-500 mr-2"></i>
              <strong>受け取りについて</strong>
            </p>
            <ul class="text-sm text-gray-700 space-y-1 list-disc list-inside ml-4">
              <li>受取時に予約IDをご提示ください</li>
              <li>受け取り予定日を過ぎた場合は自動的にキャンセルされます</li>
              <li>受け取り時間は混雑状況の目安です（時間を多少前後しても大丈夫です）</li>
            </ul>
          </div>
          <div class="mt-2 bg-orange-50 border-l-4 border-orange-500 p-4">
            <p class="text-sm text-orange-800 mb-2">
              <i class="fas fa-id-card text-orange-500 mr-2"></i>
              <strong>本人確認について</strong>
            </p>
            <ul class="text-sm text-orange-700 space-y-1 list-disc list-inside ml-4">
              <li><strong>必ずご本人様がお越しください</strong>（代理人不可）</li>
              <li><strong>身分証明証をご持参ください</strong>（運転免許証、マイナンバーカード等）</li>
            </ul>
          </div>
        ` : ''}
      </div>
    `
  }

  renderNoResults() {
    return `
      <div class="bg-white rounded-lg shadow-lg p-8 text-center">
        <i class="fas fa-exclamation-circle text-6xl text-yellow-500 mb-4"></i>
        <h2 class="text-2xl font-bold text-gray-800 mb-4">予約が見つかりませんでした</h2>
        <p class="text-gray-600 mb-6">
          入力された電話番号と生年月日に一致する予約はありませんでした。<br>
          予約時に入力した情報と一致しているかご確認ください。
        </p>
        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 text-left">
          <p class="text-sm text-gray-700 mb-2">
            <i class="fas fa-lightbulb text-blue-500 mr-2"></i>
            <strong>確認ポイント：</strong>
          </p>
          <ul class="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
            <li>電話番号は予約時と同じものを入力していますか？</li>
            <li>生年月日は予約時と同じものを入力していますか？</li>
            <li>予約完了後、すぐに照会していますか？（反映には数秒かかる場合があります）</li>
          </ul>
        </div>
      </div>
    `
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      alert('予約IDをコピーしました')
    }).catch(err => {
      console.error('Copy failed:', err)
      alert('コピーに失敗しました。手動で予約IDを控えてください。')
    })
  }
}

// アプリケーション起動
const searchApp = new SearchApp()

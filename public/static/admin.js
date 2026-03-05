// プレミアム商品券応募・抽選システム - 管理画面

class AdminApp {
  constructor() {
    this.currentView = 'dashboard'
    this.reservations = []
    this.statistics = null
    this.settings = null
    this.lotteryResults = null
    this.duplicates = null
    this.pickupDates = []
    this.currentPickupPhase = 1
    this.pickupTimeSlots = []
    this.currentTimeSlotPhase = 1
    this.filters = {
      status: '',
      store: '',
      date: '',
      lottery_status: '',
      search: ''
    }
    this.init()
  }

  async init() {
    console.log('[Admin] Initialization started')
    
    // 認証チェック
    const isAuthenticated = await this.checkAuthentication()
    console.log('[Admin] Authentication check result:', isAuthenticated)
    
    if (!isAuthenticated) {
      console.log('[Admin] Not authenticated, showing login form')
      this.showLoginRequired()
      return
    }

    console.log('[Admin] Authenticated, loading data')
    await this.loadData()
    console.log('[Admin] Data loaded, rendering view')
    this.render()
  }

  // HTMLエスケープ関数（XSS対策）
  escapeHtml(text) {
    if (!text) return ''
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  async checkAuthentication() {
    const token = localStorage.getItem('adminToken')
    
    if (!token) {
      return false
    }

    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      })

      const data = await response.json()
      return data.success && data.valid
    } catch (error) {
      console.error('Auth check error:', error)
      return false
    }
  }

  showLoginRequired() {
    console.log('[Admin] Showing login form')
    const app = document.getElementById('admin-app')
    if (!app) {
      console.error('[Admin] ERROR: admin-app element not found!')
      return
    }
    console.log('[Admin] admin-app element found, injecting HTML')
    app.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <div class="text-center mb-8">
            <i class="fas fa-shield-alt text-6xl text-gray-700 mb-4"></i>
            <h1 class="text-3xl font-bold text-gray-800 mb-2">管理者ログイン</h1>
            <p class="text-gray-600">
              IDとパスワードを入力してください
            </p>
          </div>
          
          <form onsubmit="adminApp.handleLogin(event)" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-user mr-1"></i> ユーザーID
              </label>
              <input type="text" id="adminUsername" required
                     class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                     placeholder="ユーザーIDを入力"
                     autocomplete="username">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-lock mr-1"></i> パスワード
              </label>
              <input type="password" id="adminPassword" required
                     class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                     placeholder="パスワードを入力"
                     autocomplete="current-password">
            </div>
            
            <button type="submit" id="loginBtn"
                    class="w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-bold shadow-lg transition">
              <i class="fas fa-sign-in-alt mr-2"></i> ログイン
            </button>
          </form>
          
          <div id="loginError" class="mt-4 hidden">
            <div class="bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-700 text-sm">
              <i class="fas fa-exclamation-circle mr-1"></i>
              <span id="loginErrorMessage"></span>
            </div>
          </div>
          
          <div class="mt-6 text-center">
            <a href="/" class="text-gray-700 hover:underline text-sm">
              <i class="fas fa-arrow-left mr-1"></i> トップページへ戻る
            </a>
          </div>
        </div>
      </div>
    `
  }

  async handleLogin(event) {
    event.preventDefault()
    
    const username = document.getElementById('adminUsername').value
    const password = document.getElementById('adminPassword').value
    const errorDiv = document.getElementById('loginError')
    const errorMessage = document.getElementById('loginErrorMessage')
    const loginBtn = document.getElementById('loginBtn')
    
    // ボタンを無効化
    loginBtn.disabled = true
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 認証中...'
    
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      const data = await response.json()
      
      if (data.success && data.token) {
        // トークンとユーザー名を保存
        localStorage.setItem('adminToken', data.token)
        localStorage.setItem('adminUsername', data.username)
        
        // 管理画面を再初期化
        await this.loadData()
        this.render()
      } else {
        errorDiv.classList.remove('hidden')
        errorMessage.textContent = data.error || 'ログインに失敗しました'
        loginBtn.disabled = false
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> ログイン'
      }
    } catch (error) {
      console.error('Login error:', error)
      errorDiv.classList.remove('hidden')
      errorMessage.textContent = 'システムエラーが発生しました'
      loginBtn.disabled = false
      loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> ログイン'
    }
  }

  async loadData() {
    try {
      const token = localStorage.getItem('adminToken')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      
      // 応募一覧取得（全件取得 + 抽選ステータスフィルター適用）
      let url = '/api/admin/reservations?limit=500'
      if (this.filters.lottery_status) {
        url += `&lottery_status=${this.filters.lottery_status}`
      }
      const reservationsResponse = await fetch(url, { headers })
      const reservationsData = await reservationsResponse.json()
      if (reservationsData.success) {
        this.reservations = reservationsData.data
      }
      
      // ヒートマップ用に全応募データを取得（落選者除外なし）
      const allReservationsResponse = await fetch('/api/admin/reservations?limit=500&include_lost=true', { headers })
      const allReservationsData = await allReservationsResponse.json()
      if (allReservationsData.success) {
        this.allReservations = allReservationsData.data
      }

      // 統計データ取得
      const statsResponse = await fetch('/api/admin/statistics', { headers })
      const statsData = await statsResponse.json()
      if (statsData.success) {
        this.statistics = statsData.data
      }

      // システム設定取得
      const settingsResponse = await fetch('/api/admin/settings', { headers })
      const settingsData = await settingsResponse.json()
      if (settingsData.success) {
        this.settings = settingsData.settings
      }

      // 抽選結果取得
      const lotteryResponse = await fetch('/api/admin/lottery/results', { headers })
      const lotteryData = await lotteryResponse.json()
      if (lotteryData.success) {
        this.lotteryResults = lotteryData.results
      }

      // 重複チェックデータ取得
      const [nameResponse, phoneResponse] = await Promise.all([
        fetch('/api/admin/reservations/check-duplicates/name', { 
          method: 'POST',
          headers 
        }),
        fetch('/api/admin/reservations/check-duplicates/phone', { 
          method: 'POST',
          headers 
        })
      ])
      
      const nameData = await nameResponse.json()
      const phoneData = await phoneResponse.json()
      
      if (nameData.success && phoneData.success) {
        this.duplicates = {
          nameDuplicates: nameData.duplicates || [],
          phoneDuplicates: phoneData.duplicates || []
        }
      }

      // 購入日データ取得（購入日管理ビューの場合のみ）
      if (this.currentView === 'pickup-dates') {
        await this.loadPickupDates()
      }
    } catch (error) {
      console.error('Data load error:', error)
    }
  }

  async refreshData() {
    // ローディング表示
    const refreshBtn = event.target.closest('button')
    const originalHTML = refreshBtn.innerHTML
    refreshBtn.disabled = true
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 更新中...'
    
    try {
      await this.loadData()
      this.render()
      
      // 成功メッセージ
      refreshBtn.innerHTML = '<i class="fas fa-check mr-2"></i> 更新完了'
      refreshBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700')
      refreshBtn.classList.add('bg-gray-600')
      
      setTimeout(() => {
        refreshBtn.innerHTML = originalHTML
        refreshBtn.disabled = false
        refreshBtn.classList.remove('bg-gray-600')
        refreshBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700')
      }, 2000)
    } catch (error) {
      console.error('Refresh error:', error)
      refreshBtn.innerHTML = '<i class="fas fa-times mr-2"></i> エラー'
      refreshBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700')
      refreshBtn.classList.add('bg-rose-600')
      
      setTimeout(() => {
        refreshBtn.innerHTML = originalHTML
        refreshBtn.disabled = false
        refreshBtn.classList.remove('bg-rose-600')
        refreshBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700')
      }, 2000)
    }
  }

  render() {
    const app = document.getElementById('admin-app')
    app.innerHTML = `
      <div class="min-h-screen bg-gray-100">
        ${this.renderHeader()}
        <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          ${this.renderNavigation()}
          ${this.renderCurrentView()}
        </div>
      </div>
    `

    // チャート描画（ダッシュボード表示時のみ）
    if (this.currentView === 'dashboard' && this.statistics) {
      setTimeout(() => {
        this.renderCharts()
      }, 100)
    }

    // 購入日データ読み込み（購入日管理ビュー表示時のみ）
    if (this.currentView === 'pickup-dates') {
      setTimeout(() => {
        this.loadPickupDates()
      }, 100)
    }

    // 購入時間データ読み込み（購入時間管理ビュー表示時のみ）
    if (this.currentView === 'pickup-times') {
      setTimeout(() => {
        this.loadPickupTimeSlots()
      }, 100)
    }
  }

  renderHeader() {
    const username = localStorage.getItem('adminUsername') || 'admin'
    return `
      <header class="bg-gray-800 text-white shadow-lg">
        <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center">
            <h1 class="text-3xl font-bold flex items-center">
              <i class="fas fa-cog mr-3"></i>
              坪井繁栄会 プレミアム商品券 管理画面
            </h1>
            <div class="flex items-center gap-4">
              <span class="text-sm opacity-90">
                <i class="fas fa-user mr-1"></i>${username}
              </span>
              <button onclick="adminApp.refreshData()" 
                      class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold transition text-sm">
                <i class="fas fa-sync-alt mr-2"></i> 更新
              </button>
              <button onclick="adminApp.showPasswordChangeModal()" 
                      class="px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg font-bold transition text-sm">
                <i class="fas fa-key mr-2"></i> パスワード変更
              </button>
              <button onclick="adminApp.logout()" 
                      class="px-4 py-2 bg-rose-600 hover:bg-rose-700 rounded-lg font-bold transition">
                <i class="fas fa-sign-out-alt mr-2"></i> ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>
    `
  }

  renderNavigation() {
    const tabs = [
      { id: 'dashboard', icon: 'fa-chart-bar', label: 'ダッシュボード' },
      { id: 'lottery', icon: 'fa-trophy', label: '抽選管理' },
      { id: 'pickup-dates', icon: 'fa-calendar-alt', label: '購入日管理' },
      { id: 'pickup-times', icon: 'fa-clock', label: '購入時間管理' },
      { id: 'heatmap', icon: 'fa-fire', label: '混雑状況' },
      { id: 'reservations', icon: 'fa-list', label: '応募一覧' },
      { id: 'search', icon: 'fa-search', label: '応募検索' },
      { id: 'duplicates', icon: 'fa-copy', label: '重複チェック' }
    ]

    return `
      <nav class="bg-white rounded-lg shadow mb-6">
        <div class="flex border-b">
          ${tabs.map(tab => `
            <button onclick="adminApp.switchView('${tab.id}')"
                    class="flex-1 px-3 py-3 text-center text-sm transition
                           ${this.currentView === tab.id ? 
                             'bg-slate-50 text-slate-700 border-b-2 border-slate-600' : 
                             'text-gray-600 hover:bg-gray-50'}">
              <i class="fas ${tab.icon} mr-1 text-xs"></i>
              ${tab.label}
            </button>
          `).join('')}
        </div>
      </nav>
    `
  }

  renderCurrentView() {
    switch (this.currentView) {
      case 'dashboard': return this.renderDashboard()
      case 'lottery': return this.renderLottery()
      case 'pickup-dates': return this.renderPickupDates()
      case 'pickup-times': return this.renderPickupTimes()
      case 'heatmap': return this.renderHeatmap()
      case 'reservations': return this.renderReservationsList()
      case 'search': return this.renderSearch()
      case 'duplicates': return this.renderDuplicates()
      default: return ''
    }
  }

  renderDashboard() {
    if (!this.statistics) {
      return '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-4xl text-gray-600"></i></div>'
    }

    const stats = this.statistics.total
    const maxTotal = this.statistics.maxTotal || 1000
    const remaining = maxTotal - (stats.reserved_books || 0)

    return `
      <div class="space-y-6">
        <!-- サマリーカード -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">総応募数</p>
                <p class="text-3xl font-bold text-gray-800">${stats.total_reservations || 0}</p>
              </div>
              <i class="fas fa-ticket-alt text-4xl text-gray-600"></i>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">応募済み冊数</p>
                <p class="text-3xl font-bold text-emerald-600">${stats.reserved_books || 0}</p>
              </div>
              <i class="fas fa-shopping-cart text-4xl text-emerald-600"></i>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">購入完了冊数</p>
                <p class="text-3xl font-bold text-slate-600">${stats.completed_books || 0}</p>
              </div>
              <i class="fas fa-check-circle text-4xl text-slate-600"></i>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-sm text-gray-600">残り冊数</p>
                  <button onclick="adminApp.showEditMaxTotalModal()" 
                          class="text-xs text-gray-600 hover:text-gray-900 hover:underline">
                    <i class="fas fa-edit mr-1"></i>上限編集
                  </button>
                </div>
                <p class="text-3xl font-bold text-orange-600">${remaining}</p>
                <p class="text-xs text-gray-500 mt-1">上限: ${this.statistics.maxTotal || 1000}冊</p>
              </div>
              <i class="fas fa-box text-4xl text-orange-500"></i>
            </div>
          </div>
        </div>

        <!-- 進捗バー -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-bold text-gray-800 mb-4">応募状況</h2>
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span>応募済み</span>
                <span class="font-bold">${((stats.reserved_books || 0) / maxTotal * 100).toFixed(1)}%</span>
              </div>
              <div class="bg-gray-200 rounded-full h-4">
                <div class="bg-emerald-600 rounded-full h-4" style="width: ${((stats.reserved_books || 0) / maxTotal * 100).toFixed(1)}%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span>購入完了</span>
                <span class="font-bold">${((stats.completed_books || 0) / maxTotal * 100).toFixed(1)}%</span>
              </div>
              <div class="bg-gray-200 rounded-full h-4">
                <div class="bg-slate-600 rounded-full h-4" style="width: ${((stats.completed_books || 0) / maxTotal * 100).toFixed(1)}%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- チャート -->
        <div class="grid grid-cols-1 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-bold text-gray-800">日付別応募推移</h2>
              <span class="text-sm text-gray-600">
                <i class="fas fa-info-circle mr-1"></i>
                日ごとの応募推移を表示
              </span>
            </div>
            <div style="height: 300px;">
              <canvas id="dateChart"></canvas>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-bold text-gray-800">時間帯別応募状況</h2>
              <span class="text-sm text-gray-600">
                <i class="fas fa-info-circle mr-1"></i>
                時間帯ごとの混雑状況を表示
              </span>
            </div>
            <div style="height: 300px;">
              <canvas id="timeChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    `
  }

  renderReservationsList() {
    return `
      <div class="bg-white rounded-lg shadow">
        <!-- フィルター -->
        <div class="p-6 border-b">
          <!-- 検索ボックス -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-search mr-1"></i> 検索（応募ID・氏名・電話番号）
            </label>
            <input type="text" id="filterSearch" 
                   placeholder="応募ID、氏名、または電話番号で検索..." 
                   oninput="adminApp.applyFilters()"
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-slate-500">
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
              <select id="filterStatus" onchange="adminApp.applyFilters()" 
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="">すべて</option>
                <option value="reserved">応募済み（未購入）</option>
                <option value="picked_up">購入完了</option>
                <option value="canceled">キャンセル</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">抽選結果</label>
              <select id="filterLotteryStatus" onchange="adminApp.applyFilters()" 
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="">すべて</option>
                <option value="won">当選</option>
                <option value="lost">落選</option>
                <option value="pending">抽選前</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">購入日</label>
              <input type="date" id="filterDate" onchange="adminApp.applyFilters()"
                     class="w-full px-4 py-2 border border-gray-300 rounded-lg">
            </div>
          </div>
          <div class="mt-4 flex gap-4">
            <button onclick="adminApp.exportCSV()" 
                    class="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              <i class="fas fa-download mr-2"></i> CSV出力
            </button>
            <button onclick="adminApp.resetFilters()" 
                    class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
              <i class="fas fa-redo mr-2"></i> リセット
            </button>
          </div>
        </div>

        <!-- 検索結果表示 -->
        ${this.filters.search || this.filters.status || this.filters.lottery_status || this.filters.date ? `
          <div class="px-6 py-3 bg-slate-50 border-b border-slate-100">
            <p class="text-sm text-slate-700">
              <i class="fas fa-info-circle mr-1"></i>
              <strong>${this.getFilteredReservations().length}件</strong>の応募が見つかりました
              ${this.filters.search ? `（検索: "${this.filters.search}"）` : ''}
            </p>
          </div>
        ` : ''}

        <!-- テーブル -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">応募ID</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">氏名</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ふりがな</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mail</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">電話番号</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">冊数</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">購入日時</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">抽選除外</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">抽選結果</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${this.getFilteredReservations().map((reservation, index) => `
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-600">
                    ${index + 1}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    ${reservation.reservation_id}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${this.escapeHtml(reservation.full_name)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ${this.escapeHtml(reservation.kana || '-')}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ${this.escapeHtml(reservation.email || '-')}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${this.escapeHtml(reservation.phone_number)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${reservation.quantity} 冊
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${reservation.pickup_date}<br>
                    ${reservation.pickup_time_slot}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    ${reservation.excluded_from_lottery ? `
                      <div class="flex flex-col items-center gap-1">
                        <span class="inline-block px-1.5 py-0.5 bg-rose-100 text-red-800 rounded text-xs font-medium">
                          <i class="fas fa-ban text-xs"></i> 除外済み
                        </span>
                        <button onclick="adminApp.confirmExclude('${reservation.reservation_id}', false)"
                                class="px-1.5 py-0.5 bg-gray-700 text-white rounded hover:bg-gray-800 transition text-xs">
                          <i class="fas fa-undo text-xs"></i> 解除
                        </button>
                      </div>
                    ` : reservation.lottery_status === 'lost' ? `
                      <span class="text-gray-400 text-xs">-</span>
                    ` : (reservation.lottery_status === 'pending' || !reservation.lottery_status) && reservation.status === 'reserved' ? `
                      <button onclick="adminApp.showExcludeModal('${reservation.reservation_id}', '${reservation.reservation_id}', '管理者による除外')"
                              class="px-1.5 py-0.5 bg-amber-500 text-white rounded hover:bg-amber-600 transition text-xs">
                        <i class="fas fa-ban text-xs"></i> 除外
                      </button>
                    ` : `
                      <span class="text-gray-400 text-xs">-</span>
                    `}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    ${this.renderLotteryStatusBadge(reservation.lottery_status, reservation.reservation_phase)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    ${this.renderStatusBadge(reservation.status)}
                    ${reservation.picked_up_at ? `<div class="text-xs text-gray-500 mt-1">購入: ${new Date(reservation.picked_up_at).toLocaleString('ja-JP')}</div>` : ''}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    ${reservation.status === 'reserved' && reservation.lottery_status === 'won' ? `
                      <button onclick="adminApp.confirmPickup(${reservation.id}, '${reservation.reservation_id}')"
                              class="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 font-bold transition">
                        <i class="fas fa-check mr-1"></i> 購入完了にする
                      </button>
                    ` : reservation.status === 'picked_up' ? `
                      <span class="inline-block px-4 py-2 bg-emerald-600 text-white rounded font-bold">
                        <i class="fas fa-check-circle mr-1"></i> 購入完了
                      </span>
                      ${reservation.picked_up_by ? `<div class="text-xs text-gray-500">担当: ${reservation.picked_up_by}</div>` : ''}
                    ` : `
                      <select onchange="adminApp.updateStatus(${reservation.id}, this.value)"
                              class="px-3 py-1 border border-gray-300 rounded">
                        <option value="">操作選択</option>
                        <option value="reserved" ${reservation.status === 'reserved' ? 'disabled' : ''}>応募済みに変更</option>
                        <option value="canceled" ${reservation.status === 'canceled' ? 'disabled' : ''}>キャンセルに変更</option>
                      </select>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${this.getFilteredReservations().length === 0 ? `
          <div class="text-center py-12 text-gray-500">
            <i class="fas fa-inbox text-6xl mb-4"></i>
            <p class="text-lg">該当する応募がありません</p>
          </div>
        ` : ''}
      </div>
    `
  }

  renderSearch() {
    return `
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-6">応募検索</h2>
        
        <div class="max-w-2xl space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">検索タイプ</label>
            <select id="searchType" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
              <option value="id">応募IDで検索</option>
              <option value="phone">電話番号で検索</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">検索値</label>
            <input type="text" id="searchValue" placeholder="応募IDまたは電話番号を入力"
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg">
          </div>

          <button onclick="adminApp.searchReservation()" 
                  class="w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-bold">
            <i class="fas fa-search mr-2"></i> 検索
          </button>
        </div>

        <div id="searchResults" class="mt-8"></div>
      </div>
    `
  }

  renderStatusBadge(status) {
    const statusConfig = {
      reserved: { label: '応募済み（未購入）', color: 'bg-gray-100 text-gray-800 border border-gray-300' },
      picked_up: { label: '✓ 購入完了', color: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
      completed: { label: '✓ 購入完了', color: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
      canceled: { label: 'キャンセル', color: 'bg-rose-100 text-red-800' }
    }
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return `<span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color}">${config.label}</span>`
  }

  renderLotteryStatusBadge(lotteryStatus, phase) {
    // Phase 2の場合は抽選なし
    if (phase === 2) {
      return '<span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800 border border-slate-300">Phase 2</span>'
    }
    
    // Phase 1の場合は抽選ステータスに応じて表示
    const lotteryConfig = {
      won: { label: '✓ 当選', color: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
      lost: { label: '× 落選', color: 'bg-rose-100 text-red-800 border border-red-300' },
      pending: { label: '抽選前', color: 'bg-yellow-100 text-yellow-800 border border-yellow-300' }
    }
    
    // 抽選ステータスがない場合は「抽選前」として扱う
    const config = lotteryConfig[lotteryStatus] || lotteryConfig['pending']
    return `<span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color}">${config.label}</span>`
  }

  getFilteredReservations() {
    return this.reservations.filter(r => {
      if (this.filters.status && r.status !== this.filters.status) return false
      if (this.filters.date && r.pickup_date !== this.filters.date) return false
      
      // 検索キーワードでフィルタリング（応募ID、氏名、電話番号）
      if (this.filters.search) {
        const searchLower = this.filters.search.toLowerCase()
        const matchesId = r.reservation_id?.toLowerCase().includes(searchLower)
        const matchesName = r.full_name?.toLowerCase().includes(searchLower)
        const matchesPhone = r.phone_number?.replace(/-/g, '').includes(searchLower.replace(/-/g, ''))
        
        if (!matchesId && !matchesName && !matchesPhone) return false
      }
      
      return true
    })
  }

  async switchView(view) {
    this.currentView = view
    
    // 購入日管理ビューに切り替えた時はデータを読み込む
    if (view === 'pickup-dates') {
      this.render() // 先にローディング表示
      await this.loadPickupDates()
    } else {
      this.render()
    }
  }

  async applyFilters() {
    this.filters.status = document.getElementById('filterStatus')?.value || ''
    this.filters.lottery_status = document.getElementById('filterLotteryStatus')?.value || ''
    this.filters.date = document.getElementById('filterDate')?.value || ''
    this.filters.search = document.getElementById('filterSearch')?.value || ''
    await this.loadData()
    this.render()
  }

  async resetFilters() {
    this.filters = { status: '', date: '', lottery_status: '', search: '' }
    document.getElementById('filterStatus').value = ''
    document.getElementById('filterLotteryStatus').value = ''
    document.getElementById('filterDate').value = ''
    document.getElementById('filterSearch').value = ''
    await this.loadData()
    this.render()
  }

  async updateStatus(id, status) {
    if (!status) return

    if (!confirm(`ステータスを「${status}」に変更しますか？`)) {
      return
    }

    const token = localStorage.getItem('adminToken')
    if (!token) {
      alert('認証が必要です。再度ログインしてください。')
      window.location.href = '/admin'
      return
    }

    try {
      const response = await fetch(`/api/admin/reservations/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })

      const data = await response.json()

      if (data.success) {
        alert('ステータスを更新しました')
        await this.loadData()
        this.render()
      } else {
        alert(data.error || '更新に失敗しました')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('通信エラーが発生しました')
    }
  }

  async confirmPickup(id, reservationId) {
    const staffName = prompt(`応募ID: ${reservationId}\n\n購入確認を行います。\n担当者名を入力してください（省略可）:`, '')
    
    if (staffName === null) {
      // キャンセルされた
      return
    }

    if (!confirm(`この応募を購入完了にしますか？\n\n応募ID: ${reservationId}`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/reservations/${id}/pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ staffName: staffName || 'スタッフ' })
      })

      const data = await response.json()

      if (data.success) {
        alert('✅ 購入完了を記録しました')
        await this.loadData()
        this.render()
      } else {
        alert('エラー: ' + (data.error || '処理に失敗しました'))
      }
    } catch (error) {
      console.error('Pickup confirmation error:', error)
      alert('通信エラーが発生しました')
    }
  }

  async searchReservation() {
    const searchType = document.getElementById('searchType')?.value
    const searchValue = document.getElementById('searchValue')?.value

    if (!searchValue) {
      alert('検索値を入力してください')
      return
    }

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ searchType, searchValue })
      })

      const data = await response.json()

      const resultsDiv = document.getElementById('searchResults')
      
      if (data.success && data.data.length > 0) {
        resultsDiv.innerHTML = `
          <div class="border border-gray-200 rounded-lg overflow-hidden">
            <div class="bg-gray-50 px-6 py-3 border-b">
              <h3 class="font-bold text-gray-800">検索結果（${data.data.length}件）</h3>
            </div>
            <div class="divide-y">
              ${data.data.map(r => `
                <div class="p-6">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-sm text-gray-600">応募ID</p>
                      <p class="font-bold font-mono">${r.reservation_id}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">ステータス</p>
                      ${this.renderStatusBadge(r.status)}
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">生年月日</p>
                      <p class="font-bold">${r.birth_date}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">ふりがな</p>
                      <p class="font-bold">${r.kana || '-'}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">メールアドレス</p>
                      <p class="font-bold text-sm">${r.email || '-'}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">冊数</p>
                      <p class="font-bold">${r.quantity} 冊</p>
                    </div>
                    <div class="col-span-2">
                      <p class="text-sm text-gray-600">購入日時</p>
                      <p class="font-bold">${r.pickup_date} ${r.pickup_time_slot}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">応募フェーズ</p>
                      <p class="font-bold">Phase ${r.reservation_phase}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">抽選結果</p>
                      ${this.renderLotteryStatusBadge(r.lottery_status, r.reservation_phase)}
                    </div>
                    <div class="col-span-2">
                      <p class="text-sm text-gray-600">応募日時</p>
                      <p class="font-bold text-sm">${r.created_at}</p>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `
      } else {
        resultsDiv.innerHTML = `
          <div class="text-center py-12 text-gray-500">
            <i class="fas fa-search text-6xl mb-4"></i>
            <p class="text-lg">該当する応募が見つかりませんでした</p>
          </div>
        `
      }
    } catch (error) {
      console.error('Search error:', error)
      alert('検索エラーが発生しました')
    }
  }

  exportCSV() {
    const data = this.getFilteredReservations()
    
    if (data.length === 0) {
      alert('出力するデータがありません')
      return
    }

    const headers = ['応募ID', '生年月日', '氏名', 'ふりがな', 'メール', '電話番号', '冊数', '購入日', '購入時間', '抽選結果', 'ステータス', '抽選除外', '応募日時']
    const rows = data.map(r => [
      r.reservation_id,
      r.birth_date,
      r.full_name,
      r.kana || '',
      r.email || '',
      r.phone_number,
      r.quantity,
      r.pickup_date,
      r.pickup_time_slot,
      r.lottery_status === 'won' ? '当選' : r.lottery_status === 'lost' ? '落選' : '抽選前',
      r.status === 'reserved' ? '応募中' : r.status === 'picked_up' ? '購入済' : 'キャンセル',
      r.excluded_from_lottery ? '除外' : '',
      r.created_at
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `reservations_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  renderCharts() {
    if (!this.statistics) return

    // Chart.jsのデフォルト設定
    Chart.defaults.font.family = "'Segoe UI', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif"
    Chart.defaults.font.size = 13

    // 日付別チャート
    const dateCtx = document.getElementById('dateChart')
    if (dateCtx && this.statistics.byDate.length > 0) {
      new Chart(dateCtx, {
        type: 'line',
        data: {
          labels: this.statistics.byDate.map(d => {
            const date = new Date(d.pickup_date)
            return `${date.getMonth() + 1}/${date.getDate()}`
          }),
          datasets: [{
            label: '応募冊数',
            data: this.statistics.byDate.map(d => d.total_quantity),
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            pointBackgroundColor: 'rgba(16, 185, 129, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleFont: {
                size: 14,
                weight: 'bold'
              },
              bodyFont: {
                size: 13
              },
              callbacks: {
                title: function(context) {
                  const date = this.statistics.byDate[context[0].dataIndex].pickup_date
                  return `${date} の応募状況`
                }.bind(this),
                label: function(context) {
                  const dateData = this.statistics.byDate[context.dataIndex]
                  return [
                    `応募冊数: ${dateData.total_quantity}冊`,
                    `応募件数: ${dateData.count}件`
                  ]
                }.bind(this)
              }
            }
          },
          scales: {
            y: { 
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                callback: function(value) {
                  return value + '冊'
                }
              },
              title: {
                display: true,
                text: '応募冊数',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              }
            },
            x: {
              title: {
                display: true,
                text: '購入日',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              }
            }
          }
        }
      })
    } else if (dateCtx) {
      dateCtx.parentElement.innerHTML = `
        <div class="text-center py-12 text-gray-400">
          <i class="fas fa-chart-line text-6xl mb-4"></i>
          <p>応募データがありません</p>
        </div>
      `
    }

    // 時間帯別チャート
    const timeCtx = document.getElementById('timeChart')
    if (timeCtx && this.statistics.byTime.length > 0) {
      new Chart(timeCtx, {
        type: 'bar',
        data: {
          labels: this.statistics.byTime.map(t => t.pickup_time_slot),
          datasets: [{
            label: '応募冊数',
            data: this.statistics.byTime.map(t => t.total_quantity),
            backgroundColor: 'rgba(139, 92, 246, 0.7)',
            borderColor: 'rgba(139, 92, 246, 1)',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleFont: {
                size: 14,
                weight: 'bold'
              },
              bodyFont: {
                size: 13
              },
              callbacks: {
                label: function(context) {
                  const timeSlot = context.chart.data.labels[context.dataIndex]
                  const quantity = context.parsed.y
                  const timeData = this.statistics.byTime.find(t => t.pickup_time_slot === timeSlot)
                  return [
                    `応募冊数: ${quantity}冊`,
                    `応募件数: ${timeData.count}件`
                  ]
                }.bind(this)
              }
            }
          },
          scales: {
            y: { 
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                callback: function(value) {
                  return value + '冊'
                }
              },
              title: {
                display: true,
                text: '応募冊数',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              }
            },
            x: {
              title: {
                display: true,
                text: '購入時間帯',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              }
            }
          }
        }
      })
    } else if (timeCtx) {
      timeCtx.parentElement.innerHTML = `
        <div class="text-center py-12 text-gray-400">
          <i class="fas fa-clock text-6xl mb-4"></i>
          <p>応募データがありません</p>
        </div>
      `
    }
  }

  // 混雑状況ヒートマップビュー
  renderHeatmap() {
    // ヒートマップ用のデータを取得（全応募データを使用）
    const reservationsForHeatmap = this.allReservations || this.reservations || []
    
    if (reservationsForHeatmap.length === 0) {
      return `
        <div class="bg-white rounded-lg shadow p-8 text-center">
          <i class="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
          <p class="text-xl text-gray-500">応募データがありません</p>
        </div>
      `
    }

    // 選択された日付を取得（デフォルトは3月16日）
    const selectedDate = this.selectedHeatmapDate || '2026-03-16'

    // 日別データ集計
    const dateMap = {}
    const storeTimeMap = {}
    const storeTimeDateMap = {} // 日付情報も含む
    
    // 実際のデータから店舗を抽出
    const storesSet = new Set()
    
    reservationsForHeatmap.forEach(r => {
      if (r.status === 'reserved' || r.status === 'picked_up') {
        // 落選者は除外
        if (r.lottery_status === 'lost') return
        storesSet.add(r.store_location)
      }
    })
    
    const stores = Array.from(storesSet).sort()
    
    // 時間帯は常に固定の7つを使用
    const timeSlots = [
      '12:00-13:00',
      '13:00-14:00',
      '15:00-16:00',
      '16:00-17:00',
      '17:00-18:00',
      '18:00-19:00',
      '19:00-20:00'
    ]

    reservationsForHeatmap.forEach(r => {
      if (r.status !== 'reserved' && r.status !== 'picked_up') return
      
      // 落選者は除外
      if (r.lottery_status === 'lost') return

      // 日別集計
      if (!dateMap[r.pickup_date]) {
        dateMap[r.pickup_date] = { count: 0, quantity: 0, stores: {} }
      }
      dateMap[r.pickup_date].count++
      dateMap[r.pickup_date].quantity += r.quantity

      if (!dateMap[r.pickup_date].stores[r.store_location]) {
        dateMap[r.pickup_date].stores[r.store_location] = { count: 0, quantity: 0 }
      }
      dateMap[r.pickup_date].stores[r.store_location].count++
      dateMap[r.pickup_date].stores[r.store_location].quantity += r.quantity

      // 時間帯を正規化（～を-に変換）
      const normalizedTime = (r.pickup_time_slot || r.pickup_time || '').replace(/～/g, '-')
      if (!normalizedTime) return // 時間帯がない場合はスキップ

      // 店舗×時間帯マトリックス（全日付）
      const key = `${r.store_location}|${normalizedTime}`
      if (!storeTimeMap[key]) {
        storeTimeMap[key] = { count: 0, quantity: 0 }
      }
      storeTimeMap[key].count++
      storeTimeMap[key].quantity += r.quantity

      // 店舗×時間帯×日付マトリックス
      const dateKey = `${r.store_location}|${normalizedTime}|${r.pickup_date}`
      if (!storeTimeDateMap[dateKey]) {
        storeTimeDateMap[dateKey] = { count: 0, quantity: 0 }
      }
      storeTimeDateMap[dateKey].count++
      storeTimeDateMap[dateKey].quantity += r.quantity
    })

    // 日付をソート
    const dates = Object.keys(dateMap).sort()

    // 選択された日付用の店舗×時間帯マトリックスを生成
    const filteredStoreTimeMap = {}
    Object.entries(storeTimeDateMap).forEach(([dateKey, data]) => {
      const [store, time, date] = dateKey.split('|')
      if (date === selectedDate) {
        const key = `${store}|${time}`
        filteredStoreTimeMap[key] = data
      }
    })

    // 最大値を計算（色の濃さ用）- 選択日付のデータで計算
    const maxQuantity = Math.max(...Object.values(filteredStoreTimeMap).map(v => v.quantity), 1)

    return `
      <div class="space-y-6">
        <!-- ページヘッダー -->
        <div class="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-lg p-6 text-white">
          <h2 class="text-2xl font-bold flex items-center">
            <i class="fas fa-fire mr-3"></i>
            混雑状況分析
          </h2>
          <p class="mt-2">どの店舗・時間帯に応募が集中しているかを確認できます</p>
        </div>

        <!-- 日別応募状況 -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <i class="fas fa-calendar-alt text-gray-600 mr-2"></i>
            日別応募状況
          </h3>
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead>
                <tr class="bg-gray-100">
                  <th class="px-4 py-3 text-left text-sm font-bold text-gray-700">日付</th>
                  <th class="px-4 py-3 text-center text-sm font-bold text-gray-700">応募件数</th>
                  <th class="px-4 py-3 text-center text-sm font-bold text-gray-700">応募冊数</th>
                </tr>
              </thead>
              <tbody>
                ${dates.map((date, index) => {
                  const data = dateMap[date]
                  const dayOfWeek = new Date(date).toLocaleDateString('ja-JP', { weekday: 'short' })
                  return `
                    <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-slate-50 transition">
                      <td class="px-4 py-3 text-sm font-medium">
                        ${date} (${dayOfWeek})
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-slate-100 text-slate-800">
                          ${data.count}件
                        </span>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800">
                          ${data.quantity}冊
                        </span>
                      </td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 日程×時間帯ヒートマップ -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <div class="flex justify-between items-center mb-4 flex-wrap gap-4">
            <div>
              <h3 class="text-xl font-bold text-gray-800 flex items-center">
                <i class="fas fa-th text-orange-600 mr-2"></i>
                日程×時間帯 混雑ヒートマップ
              </h3>
              <p class="text-sm text-gray-600 mt-2">
                ${new Date(selectedDate).toLocaleDateString('ja-JP', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'short'
                })} から11日間の混雑状況
              </p>
            </div>
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <label class="text-sm font-medium text-gray-700">
                  <i class="fas fa-calendar-day mr-1"></i>開始日選択:
                </label>
                <input 
                  type="date" 
                  id="heatmapDateSelector" 
                  class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
                  value="${selectedDate}"
                  min="2026-03-16"
                  onchange="adminApp.changeHeatmapDate(this.value)"
                >
              </div>
            </div>
          </div>
          <div class="flex items-center gap-4 text-sm mb-4 flex-wrap">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-emerald-100 border border-emerald-300 rounded"></div>
              <span>空き（1～10件）</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-yellow-200 border border-amber-400 rounded"></div>
              <span>やや混雑（11～20件）</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-orange-300 border border-orange-500 rounded"></div>
              <span>混雑（21～50件）</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-red-400 border border-red-600 rounded"></div>
              <span>非常に混雑（50件以上）</span>
            </div>
          </div>
          <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
            <p class="text-sm text-gray-700">
              <i class="fas fa-info-circle text-gray-600 mr-2"></i>
              <strong>表示ルール:</strong>
              ${this.statistics?.lotteryExecuted 
                ? '抽選実行済み - 当選者（Phase1）とPhase2応募のみ表示されます'
                : '抽選実行前 - すべての応募者が表示されます（Phase1: pending状態）'}
            </p>
          </div>
          <p class="text-sm text-gray-600 mb-4">
            <i class="fas fa-exclamation-triangle text-orange-500 mr-1"></i>
            赤く表示されている時間帯は応募が集中しています（50件以上）。ヘルプ要員の配置を検討してください。
          </p>
          <div class="overflow-x-auto">
            <table class="min-w-full border-collapse">
              <thead>
                <tr>
                  <th class="px-3 py-2 text-left text-sm font-bold text-gray-700 bg-gray-100 border sticky left-0 z-10">
                    日程
                  </th>
                  ${timeSlots.map(time => `
                    <th class="px-3 py-2 text-center text-xs font-bold text-gray-700 bg-gray-100 border whitespace-nowrap">
                      ${time.replace(/(\d+):00/g, '$1時')}
                    </th>
                  `).join('')}
                  <th class="px-3 py-2 text-center text-xs font-bold text-gray-700 bg-gray-100 border whitespace-nowrap">
                    合計
                  </th>
                </tr>
              </thead>
              <tbody>
                ${(() => {
                  // 選択日から11日間の日付配列を生成
                  const startDate = new Date(selectedDate)
                  const dateRange = []
                  for (let i = 0; i < 11; i++) {
                    const date = new Date(startDate)
                    date.setDate(startDate.getDate() + i)
                    dateRange.push(date.toISOString().split('T')[0])
                  }
                  
                  // 日付×時間帯のマトリックスを生成
                  // 混雑状況の表示ロジック:
                  // - 抽選実行前: すべての応募者（lottery_status='pending'のみ）を表示
                  // - 抽選実行後: 当選者（lottery_status='won'）+ Phase2応募（lottery_status='n/a'）のみ表示
                  const dateTimeMap = {}
                  const reservationsForHeatmap = this.allReservations || this.reservations
                  reservationsForHeatmap.forEach(r => {
                    if (r.status !== 'reserved' && r.status !== 'picked_up') return
                    
                    // 抽選落選者は除外
                    if (r.lottery_status === 'lost') return
                    
                    // Phase 1の応募で抽選実行済みの場合、当選者のみカウント
                    if (r.reservation_phase === 1 && this.statistics?.lotteryExecuted) {
                      if (r.lottery_status !== 'won') return
                    }
                    
                    // 時間帯を正規化（～を-に変換）
                    const normalizedTime = (r.pickup_time_slot || '').replace(/～/g, '-')
                    if (!normalizedTime) return // 時間帯がない場合はスキップ
                    
                    const key = `${r.pickup_date}|${normalizedTime}`
                    if (!dateTimeMap[key]) {
                      dateTimeMap[key] = { count: 0, quantity: 0 }
                    }
                    dateTimeMap[key].count++
                    dateTimeMap[key].quantity += r.quantity
                  })
                  
                  return dateRange.map((date, dIndex) => {
                    const dateObj = new Date(date)
                    const displayDate = dateObj.toLocaleDateString('ja-JP', { 
                      month: 'numeric', 
                      day: 'numeric',
                      weekday: 'short'
                    })
                    
                    // この日の合計を計算
                    let dayTotal = 0
                    let dayCount = 0
                    timeSlots.forEach(time => {
                      const key = `${date}|${time}`
                      const data = dateTimeMap[key]
                      if (data) {
                        dayTotal += data.quantity
                        dayCount += data.count
                      }
                    })
                    
                    return `
                      <tr class="${dIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                        <td class="px-3 py-3 text-sm font-medium text-gray-800 border sticky left-0 z-10 ${dIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                          ${displayDate}
                        </td>
                        ${timeSlots.map(time => {
                          const key = `${date}|${time}`
                          const data = dateTimeMap[key]
                          const quantity = data ? data.quantity : 0
                          const count = data ? data.count : 0
                          
                          // 応募件数に基づく混雑度判定
                          // 空き: 1-10件、やや混雑: 11-20件、混雑: 21-50件、非常に混雑: 50件以上
                          let bgColor = 'bg-gray-50'
                          let textColor = 'text-gray-400'
                          let alertIcon = ''
                          
                          if (count >= 50) {
                            bgColor = 'bg-red-400'
                            textColor = 'text-white font-bold'
                            alertIcon = '<i class="fas fa-exclamation-triangle text-white mr-1"></i>'
                          } else if (count >= 21) {
                            bgColor = 'bg-orange-300'
                            textColor = 'text-gray-900 font-semibold'
                            alertIcon = '<i class="fas fa-exclamation-circle text-orange-800 mr-1"></i>'
                          } else if (count >= 11) {
                            bgColor = 'bg-yellow-200'
                            textColor = 'text-gray-800'
                          } else if (count >= 1) {
                            bgColor = 'bg-emerald-100'
                            textColor = 'text-gray-700'
                          }
                          
                          return `
                            <td class="px-2 py-3 text-center text-xs border ${bgColor} ${textColor} transition-all hover:scale-105 cursor-pointer"
                                title="${displayDate}\n${time}\n応募: ${count}件 / ${quantity}冊">
                              <div class="flex flex-col items-center justify-center">
                                ${alertIcon}
                                ${quantity > 0 ? `<div class="font-bold">${quantity}</div><div class="text-xs opacity-75">${count}件</div>` : '-'}
                              </div>
                            </td>
                          `
                        }).join('')}
                        <td class="px-3 py-3 text-center text-sm font-bold text-gray-800 border bg-slate-50">
                          ${dayTotal > 0 ? `<div>${dayTotal}冊</div><div class="text-xs font-normal">${dayCount}件</div>` : '-'}
                        </td>
                      </tr>
                    `
                  }).join('')
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
  }

  changeHeatmapDate(date) {
    this.selectedHeatmapDate = date
    this.render()
  }

  // 抽選管理画面
  renderLottery() {
    const lotteryExecuted = this.settings?.lottery_executed === 'true'
    const reservationEnabled = this.settings?.reservation_enabled === 'true'
    const currentPhase = parseInt(this.settings?.current_phase || '1')
    
    // Phase 1の応募統計
    const phase1Reservations = this.reservations.filter(r => 
      r.reservation_phase === 1 && r.status === 'reserved'
    )
    const phase1Total = phase1Reservations.reduce((sum, r) => sum + r.quantity, 0)
    const phase1Count = phase1Reservations.length

    // 当選者統計
    const winners = this.reservations.filter(r => r.lottery_status === 'won')
    const winnersTotal = winners.reduce((sum, r) => sum + r.quantity, 0)

    return `
      <div class="space-y-6">
        <!-- ヘッダー -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            <i class="fas fa-trophy text-amber-500 mr-2"></i>
            抽選管理
          </h2>
          <p class="text-gray-600">応募の抽選実行と当選者管理</p>
        </div>

        <!-- システム状態 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">抽選状態</p>
                <p class="text-2xl font-bold ${lotteryExecuted ? 'text-emerald-600' : 'text-amber-600'}">
                  ${lotteryExecuted ? '実行済み' : '未実行'}
                </p>
              </div>
              <i class="fas ${lotteryExecuted ? 'fa-check-circle' : 'fa-clock'} text-4xl ${lotteryExecuted ? 'text-emerald-600' : 'text-amber-500'}"></i>
            </div>
            ${lotteryExecuted ? `
              <button onclick="adminApp.viewWinners()" 
                      class="mt-4 w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold transition">
                <i class="fas fa-trophy mr-2"></i>
                当選者一覧を表示
              </button>
            ` : ''}
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">応募受付</p>
                <p class="text-2xl font-bold ${reservationEnabled ? 'text-emerald-600' : 'text-red-600'}">
                  ${reservationEnabled ? '受付中' : '停止中'}
                </p>
              </div>
              <i class="fas ${reservationEnabled ? 'fa-play-circle' : 'fa-stop-circle'} text-4xl ${reservationEnabled ? 'text-emerald-600' : 'text-red-500'}"></i>
            </div>
            <button onclick="adminApp.toggleReservationEnabled()" 
                    class="mt-4 w-full px-4 py-2 ${reservationEnabled ? 'bg-rose-500 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded font-bold transition">
              ${reservationEnabled ? '受付停止' : '受付再開'}
            </button>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">現在フェーズ</p>
                <p class="text-2xl font-bold text-gray-600">Phase ${currentPhase}</p>
              </div>
              <i class="fas fa-layer-group text-4xl text-gray-600"></i>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              ${currentPhase === 1 ? '固定日応募期間' : '自由日選択期間'}
            </p>
          </div>
        </div>

        <!-- Phase 1 応募状況 -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-users mr-2"></i>
            Phase 1 応募状況
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-slate-50 rounded-lg p-4 border-l-4 border-slate-500">
              <p class="text-sm text-gray-600 mb-1">応募者数</p>
              <p class="text-3xl font-bold text-slate-700">${phase1Count} 名</p>
            </div>
            <div class="bg-slate-50 rounded-lg p-4 border-l-4 border-slate-500">
              <p class="text-sm text-slate-600 mb-1">応募総冊数</p>
              <p class="text-3xl font-bold text-slate-700">${phase1Total} 冊</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-500">
              <p class="text-sm text-gray-600 mb-1">抽選判定</p>
              <p class="text-2xl font-bold ${phase1Total <= 1000 ? 'text-emerald-600' : 'text-red-600'}">
                ${phase1Total <= 1000 ? '全員当選' : '抽選必要'}
              </p>
            </div>
          </div>
        </div>

        <!-- 抽選実行 -->
        <div class="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg shadow p-6 border-2 border-yellow-300">
          <h3 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-dice mr-2 text-amber-600"></i>
            抽選実行
          </h3>
          <p class="text-gray-700 mb-4">
            Phase 1の応募に対して抽選を実行します。
            ${phase1Total <= 1000 ? 
              '応募総数が1000冊以下のため、<strong>全員が自動的に当選</strong>します。' : 
              '応募総数が1000冊を超えているため、<strong>ランダム抽選</strong>を実行します。'}
          </p>
          ${lotteryExecuted ? `
            <div class="bg-slate-100 border border-slate-300 rounded p-4 mb-4">
              <p class="text-sm text-slate-800">
                <i class="fas fa-info-circle mr-2"></i>
                <strong>情報:</strong> 前回の抽選は実行済みです。新しい応募に対して再度抽選を実行できます。
              </p>
            </div>
          ` : `
            <div class="bg-yellow-100 border border-yellow-300 rounded p-4 mb-4">
              <p class="text-sm text-yellow-800">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                <strong>注意:</strong> lottery_status='pending'の応募のみが抽選対象になります。
              </p>
            </div>
          `}
          <button onclick="adminApp.executeLottery()" 
                  class="w-full px-6 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 font-bold text-lg shadow-lg transition"
                  ${phase1Count === 0 ? 'disabled' : ''}>
            <i class="fas fa-trophy mr-2"></i>
            抽選を実行する（${phase1Count}名 / ${phase1Total}冊）
          </button>
        </div>

        <!-- 抽選結果履歴 -->
        ${this.lotteryResults && this.lotteryResults.length > 0 ? `
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-4">
              <i class="fas fa-history mr-2"></i>
              抽選結果履歴
            </h3>
            <div class="overflow-x-auto">
              <table class="min-w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">実行日時</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">応募者数</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">応募冊数</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">当選者数</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">当選冊数</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">落選者数</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">備考</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  ${this.lotteryResults.map(result => `
                    <tr>
                      <td class="px-4 py-3 text-sm text-gray-900">${new Date(result.execution_date).toLocaleString('ja-JP')}</td>
                      <td class="px-4 py-3 text-sm text-gray-900">${result.total_applications}名</td>
                      <td class="px-4 py-3 text-sm text-gray-900">${result.total_quantity_requested}冊</td>
                      <td class="px-4 py-3 text-sm font-bold text-emerald-600">${result.winners_count}名</td>
                      <td class="px-4 py-3 text-sm font-bold text-emerald-600">${result.winners_quantity}冊</td>
                      <td class="px-4 py-3 text-sm text-red-600">${result.losers_count}名</td>
                      <td class="px-4 py-3 text-sm text-gray-600">${result.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      </div>
    `
  }

  // 応募受付ON/OFF切替
  async toggleReservationEnabled() {
    const currentValue = this.settings?.reservation_enabled === 'true'
    const newValue = !currentValue

    if (!confirm(`応募受付を${newValue ? '再開' : '停止'}しますか？`)) {
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          key: 'reservation_enabled',
          value: newValue.toString()
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`応募受付を${newValue ? '再開' : '停止'}しました`)
        await this.loadData()
        this.render()
      } else {
        alert('エラー: ' + data.error)
      }
    } catch (error) {
      console.error('Toggle reservation error:', error)
      alert('システムエラーが発生しました')
    }
  }

  // 抽選実行
  async executeLottery() {
    if (!confirm('抽選を実行しますか？\n\n⚠️ 一度実行すると取り消せません。')) {
      return
    }

    if (!confirm('本当に実行しますか？\n\n当選者が決定され、結果が公開されます。')) {
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/lottery/execute', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        const result = data.result
        let message = `抽選が完了しました！\n\n`
        message += `応募者数: ${result.totalApplications}名\n`
        message += `応募冊数: ${result.totalQuantity}冊\n\n`
        message += `当選者数: ${result.winnersCount}名\n`
        message += `当選冊数: ${result.winnersQuantity}冊\n\n`
        
        if (result.allWon) {
          message += `✅ 応募総数が1000冊未満のため全員当選です！`
        } else {
          message += `落選者数: ${result.losersCount}名\n`
          message += `落選冊数: ${result.losersQuantity}冊`
        }

        alert(message)
        
        // 抽選実行後、自動的に受付を停止
        try {
          const stopResponse = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              key: 'reservation_enabled',
              value: 'false'
            })
          })
          
          const stopData = await stopResponse.json()
          if (stopData.success) {
            console.log('応募受付を自動停止しました')
          }
        } catch (error) {
          console.error('受付停止エラー:', error)
        }
        
        await this.loadData()
        this.render()
      } else {
        alert('エラー: ' + data.error)
      }
    } catch (error) {
      console.error('Execute lottery error:', error)
      alert('システムエラーが発生しました')
    }
  }

  viewWinners() {
    // 応募一覧画面に切り替え
    this.switchView('reservations')
    
    // フィルターを当選者に設定（少し遅延させてDOM生成を待つ）
    setTimeout(() => {
      const lotteryResultFilter = document.getElementById('filter-lottery-result')
      if (lotteryResultFilter) {
        lotteryResultFilter.value = 'won'
        this.applyFilters()
      }
    }, 100)
  }

  showPasswordChangeModal() {
    const modal = document.createElement('div')
    modal.id = 'passwordChangeModal'
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-key text-amber-500 mr-2"></i>
            パスワード変更
          </h2>
          <button onclick="adminApp.closePasswordChangeModal()" 
                  class="text-gray-400 hover:text-gray-600 text-2xl">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div id="passwordChangeError" class="hidden mb-4 bg-rose-100 border-l-4 border-red-500 p-4 rounded">
          <p class="text-sm text-rose-700">
            <i class="fas fa-exclamation-circle mr-2"></i>
            <span id="passwordChangeErrorText"></span>
          </p>
        </div>
        
        <div id="passwordChangeSuccess" class="hidden mb-4 bg-emerald-100 border-l-4 border-emerald-500 p-4 rounded">
          <p class="text-sm text-emerald-700">
            <i class="fas fa-check-circle mr-2"></i>
            <span id="passwordChangeSuccessText"></span>
          </p>
        </div>
        
        <form onsubmit="adminApp.handlePasswordChange(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-lock mr-1"></i> 現在のパスワード
            </label>
            <input type="password" id="currentPassword" required
                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-slate-500"
                   placeholder="現在のパスワードを入力">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-key mr-1"></i> 新しいパスワード
            </label>
            <input type="password" id="newPassword" required minlength="8"
                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-slate-500"
                   placeholder="新しいパスワード（8文字以上）">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-check mr-1"></i> 新しいパスワード（確認）
            </label>
            <input type="password" id="confirmPassword" required minlength="8"
                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-slate-500"
                   placeholder="新しいパスワードを再入力">
          </div>
          
          <div class="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-gray-700">
            <i class="fas fa-info-circle text-amber-500 mr-2"></i>
            パスワードは8文字以上で設定してください
          </div>
          
          <div class="flex gap-3 pt-4">
            <button type="submit" id="changePasswordBtn"
                    class="flex-1 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-bold shadow-lg transition">
              <i class="fas fa-save mr-2"></i> 変更する
            </button>
            <button type="button" onclick="adminApp.closePasswordChangeModal()"
                    class="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-bold transition">
              <i class="fas fa-times mr-2"></i> キャンセル
            </button>
          </div>
        </form>
      </div>
    `
    document.body.appendChild(modal)
  }
  
  closePasswordChangeModal() {
    const modal = document.getElementById('passwordChangeModal')
    if (modal) {
      modal.remove()
    }
  }
  
  async handlePasswordChange(event) {
    event.preventDefault()
    
    const currentPassword = document.getElementById('currentPassword').value
    const newPassword = document.getElementById('newPassword').value
    const confirmPassword = document.getElementById('confirmPassword').value
    const errorDiv = document.getElementById('passwordChangeError')
    const errorText = document.getElementById('passwordChangeErrorText')
    const successDiv = document.getElementById('passwordChangeSuccess')
    const successText = document.getElementById('passwordChangeSuccessText')
    const btn = document.getElementById('changePasswordBtn')
    
    // エラーメッセージをクリア
    errorDiv.classList.add('hidden')
    successDiv.classList.add('hidden')
    
    // バリデーション
    if (newPassword.length < 8) {
      errorText.textContent = 'パスワードは8文字以上で設定してください'
      errorDiv.classList.remove('hidden')
      return
    }
    
    if (newPassword !== confirmPassword) {
      errorText.textContent = '新しいパスワードが一致しません'
      errorDiv.classList.remove('hidden')
      return
    }
    
    if (currentPassword === newPassword) {
      errorText.textContent = '新しいパスワードは現在のパスワードと異なるものを設定してください'
      errorDiv.classList.remove('hidden')
      return
    }
    
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 変更中...'
    
    try {
      const token = localStorage.getItem('adminToken')
      const username = localStorage.getItem('adminUsername')
      
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          token,
          username,
          currentPassword,
          newPassword
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        successText.textContent = 'パスワードを変更しました'
        successDiv.classList.remove('hidden')
        
        // 2秒後にモーダルを閉じる
        setTimeout(() => {
          this.closePasswordChangeModal()
        }, 2000)
      } else {
        errorText.textContent = data.error || 'パスワード変更に失敗しました'
        errorDiv.classList.remove('hidden')
        btn.disabled = false
        btn.innerHTML = '<i class="fas fa-save mr-2"></i> 変更する'
      }
    } catch (error) {
      console.error('Password change error:', error)
      errorText.textContent = 'システムエラーが発生しました'
      errorDiv.classList.remove('hidden')
      btn.disabled = false
      btn.innerHTML = '<i class="fas fa-save mr-2"></i> 変更する'
    }
  }

  // 重複チェックビューのレンダリング
  renderDuplicates() {
    if (!this.duplicates) {
      return '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-4xl text-gray-600"></i></div>'
    }

    const { phoneDuplicates, nameDuplicates } = this.duplicates

    return `
      <div class="space-y-4">
        <div class="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">
            <i class="fas fa-copy mr-2 text-amber-600"></i>
            重複応募チェック
          </h2>

          <!-- 電話番号の重複 -->
          <div class="mb-6 sm:mb-8">
            <h3 class="text-lg sm:text-xl font-bold text-gray-700 mb-3 sm:mb-4 flex items-center">
              <i class="fas fa-phone mr-2 text-gray-600"></i>
              電話番号の重複 
              <span class="ml-2 px-2 py-1 text-xs sm:text-sm bg-slate-100 text-slate-800 rounded-full">${phoneDuplicates.length}件</span>
            </h3>
            ${phoneDuplicates.length === 0 ? `
              <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4 text-emerald-800 text-sm sm:text-base">
                <i class="fas fa-check-circle mr-2"></i>
                電話番号の重複はありません
              </div>
            ` : `
              <div class="space-y-3">
                ${phoneDuplicates.map((dup, idx) => {
                  const ids = dup.ids.split(',')
                  const names = dup.names.split(',')
                  const reservationIds = dup.reservation_ids.split(',')
                  return `
                    <div class="border border-amber-200 rounded-lg p-3 sm:p-4 bg-amber-50 hover:bg-yellow-100 transition">
                      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs sm:text-sm font-medium text-gray-500">電話番号</span>
                            <span class="text-sm sm:text-base font-bold text-gray-900">${dup.phone_number}</span>
                            <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-red-800">
                              ${dup.count}件
                            </span>
                          </div>
                          
                          <div class="space-y-2 text-xs sm:text-sm">
                            <div>
                              <span class="font-medium text-gray-600">氏名:</span>
                              <div class="flex flex-wrap gap-1 mt-1">
                                ${names.map((name, i) => `
                                  <span class="inline-flex items-center px-2 py-0.5 bg-slate-50 text-slate-700 rounded">
                                    ${i + 1}. ${name}
                                  </span>
                                `).join('')}
                              </div>
                            </div>
                            
                            <div>
                              <span class="font-medium text-gray-600">応募ID:</span>
                              <div class="flex flex-wrap gap-1 mt-1 font-mono">
                                ${reservationIds.map((rid, i) => `
                                  <span class="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                    ${i + 1}. ${rid}
                                  </span>
                                `).join('')}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div class="flex flex-wrap gap-1 sm:flex-col sm:items-end">
                          ${ids.map((id, i) => `
                            <button onclick="adminApp.showExcludeModal('${reservationIds[i]}', '${reservationIds[i]}', '電話番号重複')"
                                    class="px-2 py-1 bg-rose-500 text-white rounded hover:bg-rose-700 transition text-xs whitespace-nowrap">
                              <i class="fas fa-ban mr-1"></i>${i + 1}を除外
                            </button>
                          `).join('')}
                        </div>
                      </div>
                    </div>
                  `
                }).join('')}
              </div>
            `}
          </div>

          <!-- 名前の重複 -->
          <div>
            <h3 class="text-lg sm:text-xl font-bold text-gray-700 mb-3 sm:mb-4 flex items-center">
              <i class="fas fa-user mr-2 text-slate-600"></i>
              氏名の重複
              <span class="ml-2 px-2 py-1 text-xs sm:text-sm bg-slate-100 text-slate-800 rounded-full">${nameDuplicates.length}件</span>
            </h3>
            ${nameDuplicates.length === 0 ? `
              <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4 text-emerald-800 text-sm sm:text-base">
                <i class="fas fa-check-circle mr-2"></i>
                氏名の重複はありません
              </div>
            ` : `
              <div class="space-y-3">
                ${nameDuplicates.map((dup, idx) => {
                  const ids = dup.ids.split(',')
                  const phones = dup.phone_numbers.split(',')
                  const reservationIds = dup.reservation_ids.split(',')
                  return `
                    <div class="border border-slate-200 rounded-lg p-3 sm:p-4 bg-slate-50 hover:bg-slate-100 transition">
                      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs sm:text-sm font-medium text-gray-500">氏名</span>
                            <div>
                              <span class="text-sm sm:text-base font-bold text-gray-900">${dup.full_name}</span>
                              ${dup.kana ? `<span class="ml-2 text-xs text-gray-500">(${dup.kana})</span>` : ''}
                            </div>
                            <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-red-800">
                              ${dup.count}件
                            </span>
                          </div>
                          
                          <div class="space-y-2 text-xs sm:text-sm">
                            <div>
                              <span class="font-medium text-gray-600">電話番号:</span>
                              <div class="flex flex-wrap gap-1 mt-1">
                                ${phones.map((phone, i) => `
                                  <span class="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                                    ${i + 1}. ${phone}
                                  </span>
                                `).join('')}
                              </div>
                            </div>
                            
                            <div>
                              <span class="font-medium text-gray-600">応募ID:</span>
                              <div class="flex flex-wrap gap-1 mt-1 font-mono">
                                ${reservationIds.map((rid, i) => `
                                  <span class="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                    ${i + 1}. ${rid}
                                  </span>
                                `).join('')}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div class="flex flex-wrap gap-1 sm:flex-col sm:items-end">
                          ${ids.map((id, i) => `
                            <button onclick="adminApp.showExcludeModal('${reservationIds[i]}', '${reservationIds[i]}', '氏名重複')"
                                    class="px-2 py-1 bg-rose-500 text-white rounded hover:bg-rose-700 transition text-xs whitespace-nowrap">
                              <i class="fas fa-ban mr-1"></i>${i + 1}を除外
                            </button>
                          `).join('')}
                        </div>
                      </div>
                    </div>
                  `
                }).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `
  }

  // 抽選除外モーダルを表示
  showExcludeModal(id, reservationId, defaultReason) {
    const modal = document.createElement('div')
    modal.id = 'exclude-modal'
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold text-gray-900 mb-4">
          <i class="fas fa-ban mr-2 text-red-600"></i>
          抽選対象から除外
        </h3>
        <p class="text-gray-700 mb-4">
          応募ID: <span class="font-mono font-bold">${reservationId}</span>
        </p>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            除外理由
          </label>
          <textarea id="exclude-reason" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                    rows="3"
                    placeholder="除外理由を入力してください">${defaultReason}</textarea>
        </div>
        <div class="flex gap-3">
          <button onclick="document.getElementById('exclude-modal').remove()"
                  class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
            キャンセル
          </button>
          <button onclick="adminApp.excludeFromLottery(${id}, '${reservationId}')"
                  class="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-700 transition font-bold">
            <i class="fas fa-ban mr-2"></i>除外する
          </button>
        </div>
      </div>
    `
    document.body.appendChild(modal)
  }

  // 抽選除外を実行
  showExcludeModal(id, reservationId, reason) {
    // 既存のモーダルを削除
    const existingModal = document.getElementById('exclude-modal')
    if (existingModal) {
      existingModal.remove()
    }

    // モーダルを作成
    const modal = document.createElement('div')
    modal.id = 'exclude-modal'
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold text-gray-800 mb-4">
          <i class="fas fa-ban text-red-500 mr-2"></i>
          抽選から除外
        </h3>
        <div class="mb-4">
          <p class="text-gray-700 mb-2">以下の応募を抽選対象から除外しますか？</p>
          <div class="bg-gray-50 p-3 rounded">
            <p class="font-medium">応募ID: ${reservationId}</p>
            <p class="text-sm text-gray-600">理由: ${reason}</p>
          </div>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            追加メモ（任意）
          </label>
          <textarea id="exclude-reason" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                    rows="3"
                    placeholder="除外理由を記入してください"></textarea>
        </div>
        <div class="flex gap-3">
          <button onclick="adminApp.confirmExclude('${reservationId}', true)"
                  class="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-700 font-bold transition">
            <i class="fas fa-ban mr-2"></i>除外する
          </button>
          <button onclick="adminApp.closeExcludeModal()"
                  class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-bold transition">
            キャンセル
          </button>
        </div>
      </div>
    `
    document.body.appendChild(modal)
  }

  closeExcludeModal() {
    const modal = document.getElementById('exclude-modal')
    if (modal) {
      modal.remove()
    }
  }

  async confirmExclude(reservationId, excluded) {
    const token = localStorage.getItem('adminToken')

    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}/exclude`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ excluded })
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message || '設定を更新しました')
        this.closeExcludeModal()
        // データを再読み込み
        await this.loadData()
        this.render()
      } else {
        alert('設定の更新に失敗しました: ' + (data.error || ''))
      }
    } catch (error) {
      console.error('Exclude error:', error)
      alert('システムエラーが発生しました')
    }
  }

  async excludeFromLottery(id, reservationId) {
    const reason = document.getElementById('exclude-reason').value
    const token = localStorage.getItem('adminToken')

    try {
      const response = await fetch(`/api/admin/reservations/${id}/exclude`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      })

      const data = await response.json()

      if (data.success) {
        alert(`応募ID「${reservationId}」を抽選対象から除外しました`)
        document.getElementById('exclude-modal').remove()
        // データを再読み込み
        await this.loadData()
        this.render()
      } else {
        alert('除外に失敗しました: ' + (data.error || ''))
      }
    } catch (error) {
      console.error('Exclude error:', error)
      alert('システムエラーが発生しました')
    }
  }

  // ============================================
  // 購入日管理
  // ============================================

  renderPickupDates() {
    return `
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-calendar-alt mr-2 text-gray-600"></i>
            購入日管理
          </h2>
          <button onclick="adminApp.showAddPickupDateModal()" 
                  class="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition">
            <i class="fas fa-plus mr-2"></i> 新規追加
          </button>
        </div>

        <div class="mb-4">
          <label class="inline-flex items-center mr-4">
            <input type="radio" name="pickup-phase-filter" value="1" checked 
                   onchange="adminApp.filterPickupDatesByPhase(1)" class="mr-2">
            Phase 1
          </label>
          <label class="inline-flex items-center">
            <input type="radio" name="pickup-phase-filter" value="2" 
                   onchange="adminApp.filterPickupDatesByPhase(2)" class="mr-2">
            Phase 2
          </label>
        </div>

        <div id="pickup-dates-list">
          <div class="text-center py-8">
            <i class="fas fa-spinner fa-spin text-4xl text-gray-600"></i>
          </div>
        </div>
      </div>
    `
  }

  async filterPickupDatesByPhase(phase) {
    this.currentPickupPhase = phase
    await this.loadPickupDates()
  }

  async loadPickupDates() {
    const token = localStorage.getItem('adminToken')
    if (!token) return

    try {
      const phase = this.currentPickupPhase || 1
      const response = await fetch(`/api/admin/pickup-dates?phase=${phase}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to load pickup dates')

      const data = await response.json()
      this.pickupDates = data.data || []
      this.renderPickupDatesList()
    } catch (error) {
      console.error('Load pickup dates error:', error)
      document.getElementById('pickup-dates-list').innerHTML = `
        <div class="text-center py-8 text-red-600">
          <i class="fas fa-exclamation-circle mr-2"></i>
          データの読み込みに失敗しました
        </div>
      `
    }
  }

  renderPickupDatesList() {
    const listContainer = document.getElementById('pickup-dates-list')
    if (!listContainer) return

    if (!this.pickupDates || this.pickupDates.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-calendar-times text-4xl mb-3"></i>
          <p>登録されている購入日はありません</p>
        </div>
      `
      return
    }

    listContainer.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">表示順</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">購入日</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">表示ラベル</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">ステータス</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${this.pickupDates.map(date => `
              <tr class="${date.is_active ? '' : 'bg-gray-50 opacity-60'}">
                <td class="px-4 py-3 text-sm text-gray-900">${date.display_order}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${date.pickup_date}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${date.display_label}</td>
                <td class="px-4 py-3 text-center">
                  <button onclick="adminApp.togglePickupDateStatus(${date.id}, ${date.is_active})"
                          class="px-4 py-2 text-sm font-semibold rounded-lg transition
                                 ${date.is_active ? 
                                   'bg-emerald-600 text-white hover:bg-emerald-700' : 
                                   'bg-gray-400 text-white hover:bg-gray-500'}">
                    ${date.is_active ? 
                      '<i class="fas fa-toggle-on mr-1"></i> 有効' : 
                      '<i class="fas fa-toggle-off mr-1"></i> 無効'}
                  </button>
                </td>
                <td class="px-4 py-3 text-center">
                  <button onclick="adminApp.showEditPickupDateModal(${date.id})" 
                          class="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-800 mr-2">
                    <i class="fas fa-edit"></i> 編集
                  </button>
                  <button onclick="adminApp.deletePickupDate(${date.id})" 
                          class="px-3 py-1 text-sm bg-rose-500 text-white rounded hover:bg-rose-700">
                    <i class="fas fa-trash"></i> 削除
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  showAddPickupDateModal() {
    const modal = document.createElement('div')
    modal.id = 'pickup-date-modal'
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">
          <i class="fas fa-calendar-plus mr-2 text-gray-600"></i>
          購入日を追加
        </h3>
        <form id="add-pickup-date-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">購入日 *</label>
            <input type="date" id="pickup-date-input" required
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-slate-500">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">表示ラベル *</label>
            <input type="text" id="pickup-label-input" required
                   placeholder="例: 3月16日（月）"
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-slate-500">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">表示順序</label>
            <input type="number" id="pickup-order-input" value="0" min="0"
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-slate-500">
          </div>
          
          <div>
            <label class="inline-flex items-center">
              <input type="checkbox" id="pickup-active-input" checked class="mr-2">
              <span class="text-sm text-gray-700">有効にする</span>
            </label>
          </div>

          <div class="flex space-x-3 mt-6">
            <button type="submit" class="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">
              <i class="fas fa-save mr-2"></i> 登録
            </button>
            <button type="button" onclick="document.getElementById('pickup-date-modal').remove()"
                    class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
              <i class="fas fa-times mr-2"></i> キャンセル
            </button>
          </div>
        </form>
      </div>
    `
    document.body.appendChild(modal)

    document.getElementById('add-pickup-date-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      await this.savePickupDate()
    })
  }

  showEditPickupDateModal(id) {
    const date = this.pickupDates.find(d => d.id === id)
    if (!date) return

    const modal = document.createElement('div')
    modal.id = 'pickup-date-modal'
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">
          <i class="fas fa-edit mr-2 text-gray-600"></i>
          購入日を編集
        </h3>
        <form id="edit-pickup-date-form" class="space-y-4">
          <input type="hidden" id="pickup-id-input" value="${date.id}">
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">購入日 *</label>
            <input type="date" id="pickup-date-input" required value="${date.pickup_date}"
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-slate-500">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">表示ラベル *</label>
            <input type="text" id="pickup-label-input" required value="${date.display_label}"
                   placeholder="例: 3月16日（月）"
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-slate-500">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">表示順序</label>
            <input type="number" id="pickup-order-input" value="${date.display_order}" min="0"
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-slate-500">
          </div>
          
          <div>
            <label class="inline-flex items-center">
              <input type="checkbox" id="pickup-active-input" ${date.is_active ? 'checked' : ''} class="mr-2">
              <span class="text-sm text-gray-700">有効にする</span>
            </label>
          </div>

          <div class="flex space-x-3 mt-6">
            <button type="submit" class="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">
              <i class="fas fa-save mr-2"></i> 更新
            </button>
            <button type="button" onclick="document.getElementById('pickup-date-modal').remove()"
                    class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
              <i class="fas fa-times mr-2"></i> キャンセル
            </button>
          </div>
        </form>
      </div>
    `
    document.body.appendChild(modal)

    document.getElementById('edit-pickup-date-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      await this.updatePickupDate(id)
    })
  }

  async savePickupDate() {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      alert('認証が必要です')
      return
    }

    const pickupDate = document.getElementById('pickup-date-input').value
    const displayLabel = document.getElementById('pickup-label-input').value
    const displayOrder = parseInt(document.getElementById('pickup-order-input').value) || 0
    const isActive = document.getElementById('pickup-active-input').checked ? 1 : 0
    const phase = this.currentPickupPhase || 1

    if (!pickupDate || !displayLabel) {
      alert('購入日と表示ラベルは必須です')
      return
    }

    try {
      const response = await fetch('/api/admin/pickup-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pickup_date: pickupDate,
          display_label: displayLabel,
          phase: phase,
          is_active: isActive,
          display_order: displayOrder
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('購入日を登録しました')
        document.getElementById('pickup-date-modal').remove()
        await this.loadPickupDates()
      } else {
        alert('登録に失敗しました: ' + (data.error || ''))
      }
    } catch (error) {
      console.error('Save pickup date error:', error)
      alert('システムエラーが発生しました')
    }
  }

  async updatePickupDate(id) {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      alert('認証が必要です')
      return
    }

    const pickupDate = document.getElementById('pickup-date-input').value
    const displayLabel = document.getElementById('pickup-label-input').value
    const displayOrder = parseInt(document.getElementById('pickup-order-input').value) || 0
    const isActive = document.getElementById('pickup-active-input').checked ? 1 : 0
    const phase = this.currentPickupPhase || 1

    if (!pickupDate || !displayLabel) {
      alert('購入日と表示ラベルは必須です')
      return
    }

    try {
      const response = await fetch(`/api/admin/pickup-dates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pickup_date: pickupDate,
          display_label: displayLabel,
          phase: phase,
          is_active: isActive,
          display_order: displayOrder
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('購入日を更新しました')
        document.getElementById('pickup-date-modal').remove()
        await this.loadPickupDates()
      } else {
        alert('更新に失敗しました: ' + (data.error || ''))
      }
    } catch (error) {
      console.error('Update pickup date error:', error)
      alert('システムエラーが発生しました')
    }
  }

  async deletePickupDate(id) {
    const date = this.pickupDates.find(d => d.id === id)
    if (!date) return

    if (!confirm(`「${date.display_label}」を削除しますか？\n\n※この購入日を使用している応募がある場合は削除できません`)) {
      return
    }

    const token = localStorage.getItem('adminToken')
    if (!token) {
      alert('認証が必要です')
      return
    }

    try {
      const response = await fetch(`/api/admin/pickup-dates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        alert('購入日を削除しました')
        await this.loadPickupDates()
      } else {
        alert('削除に失敗しました: ' + (data.error || ''))
      }
    } catch (error) {
      console.error('Delete pickup date error:', error)
      alert('システムエラーが発生しました')
    }
  }

  async togglePickupDateStatus(id, currentStatus) {
    const date = this.pickupDates.find(d => d.id === id)
    if (!date) return

    const newStatus = currentStatus ? 0 : 1
    const statusText = newStatus ? '有効' : '無効'

    if (!confirm(`「${date.display_label}」を${statusText}にしますか？\n\n${newStatus ? '応募フォームに表示されます' : '応募フォームから非表示になります（既存の応募データは保持されます）'}`)) {
      return
    }

    const token = localStorage.getItem('adminToken')
    if (!token) {
      alert('認証が必要です')
      return
    }

    try {
      const response = await fetch(`/api/admin/pickup-dates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pickup_date: date.pickup_date,
          display_label: date.display_label,
          phase: date.phase,
          is_active: newStatus,
          display_order: date.display_order
        })
      })

      const data = await response.json()

      if (data.success) {
        // データを再読み込み
        await this.loadPickupDates()
      } else {
        alert('ステータス変更に失敗しました: ' + (data.error || ''))
      }
    } catch (error) {
      console.error('Toggle status error:', error)
      alert('システムエラーが発生しました')
    }
  }

  // ===== 購入時間管理機能 =====

  renderPickupTimes() {
    return `
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-clock mr-2"></i>
            購入時間管理
          </h2>
          <button onclick="adminApp.showAddTimeSlotModal()" 
                  class="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 transition">
            <i class="fas fa-plus mr-2"></i>
            新規追加
          </button>
        </div>

        <!-- Phase切替 -->
        <div class="mb-4">
          <label class="inline-flex items-center mr-4">
            <input type="radio" name="time-phase" value="1" 
                   ${this.currentTimeSlotPhase === 1 ? 'checked' : ''}
                   onchange="adminApp.filterTimeSlotsByPhase(1)"
                   class="mr-2">
            <span>Phase 1</span>
          </label>
          <label class="inline-flex items-center">
            <input type="radio" name="time-phase" value="2" 
                   ${this.currentTimeSlotPhase === 2 ? 'checked' : ''}
                   onchange="adminApp.filterTimeSlotsByPhase(2)"
                   class="mr-2">
            <span>Phase 2</span>
          </label>
        </div>

        <div id="time-slots-list">
          <div class="text-center py-8">
            <i class="fas fa-spinner fa-spin text-4xl text-gray-400"></i>
            <p class="text-gray-500 mt-2">読み込み中...</p>
          </div>
        </div>
      </div>
    `
  }

  async filterTimeSlotsByPhase(phase) {
    this.currentTimeSlotPhase = phase
    await this.loadPickupTimeSlots()
  }

  async loadPickupTimeSlots() {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      alert('認証が必要です')
      return
    }

    const phase = this.currentTimeSlotPhase || 1

    try {
      const response = await fetch(`/api/admin/pickup-time-slots?phase=${phase}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        this.pickupTimeSlots = data.data || []
        this.renderTimeSlotsList()
      } else {
        console.error('Failed to load time slots:', data.error)
        document.getElementById('time-slots-list').innerHTML = `
          <div class="text-center py-8 text-red-600">
            <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
            <p>データの読み込みに失敗しました</p>
          </div>
        `
      }
    } catch (error) {
      console.error('Load time slots error:', error)
      document.getElementById('time-slots-list').innerHTML = `
        <div class="text-center py-8 text-red-600">
          <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
          <p>システムエラーが発生しました</p>
        </div>
      `
    }
  }

  renderTimeSlotsList() {
    const listContainer = document.getElementById('time-slots-list')
    if (!listContainer) return

    if (this.pickupTimeSlots.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="far fa-clock text-4xl mb-2"></i>
          <p>登録されている購入時間はありません</p>
        </div>
      `
      return
    }

    listContainer.innerHTML = `
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white border">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-2 border text-left">表示順</th>
              <th class="px-4 py-2 border text-left">購入時間</th>
              <th class="px-4 py-2 border text-left">表示ラベル</th>
              <th class="px-4 py-2 border text-center">ステータス</th>
              <th class="px-4 py-2 border text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            ${this.pickupTimeSlots.map(slot => `
              <tr class="${slot.is_active === 0 ? 'bg-gray-100 opacity-50' : ''}">
                <td class="px-4 py-2 border">${slot.display_order}</td>
                <td class="px-4 py-2 border">${slot.time_slot}</td>
                <td class="px-4 py-2 border">${slot.display_label}</td>
                <td class="px-4 py-2 border text-center">
                  <button onclick="adminApp.toggleTimeSlotStatus(${slot.id})"
                          class="px-3 py-1 rounded text-white transition ${
                            slot.is_active === 1 
                              ? 'bg-emerald-600 hover:bg-emerald-700' 
                              : 'bg-gray-400 hover:bg-gray-500'
                          }">
                    <i class="fas ${slot.is_active === 1 ? 'fa-check-circle' : 'fa-ban'} mr-1"></i>
                    ${slot.is_active === 1 ? '有効' : '無効'}
                  </button>
                </td>
                <td class="px-4 py-2 border text-center">
                  <button onclick="adminApp.showEditTimeSlotModal(${slot.id})"
                          class="bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-800 mr-2">
                    <i class="fas fa-edit mr-1"></i>
                    編集
                  </button>
                  <button onclick="adminApp.deleteTimeSlot(${slot.id})"
                          class="bg-rose-500 text-white px-3 py-1 rounded hover:bg-rose-700">
                    <i class="fas fa-trash mr-1"></i>
                    削除
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  showAddTimeSlotModal() {
    const modalHtml = `
      <div id="time-slot-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <h3 class="text-xl font-bold mb-4">
            <i class="fas fa-clock mr-2"></i>
            購入時間を追加
          </h3>
          <form onsubmit="event.preventDefault(); adminApp.saveTimeSlot()">
            <div class="mb-4">
              <label class="block text-gray-700 font-medium mb-2">
                購入時間 <span class="text-red-500">*</span>
              </label>
              <input type="text" id="time-slot-input" required
                     placeholder="例: 10:00～11:00"
                     class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-500">
              <p class="text-sm text-gray-500 mt-1">形式: HH:MM～HH:MM</p>
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 font-medium mb-2">
                表示ラベル <span class="text-red-500">*</span>
              </label>
              <input type="text" id="time-label-input" required
                     placeholder="例: 10:00～11:00"
                     class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-500">
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 font-medium mb-2">
                表示順序
              </label>
              <input type="number" id="time-order-input" min="0"
                     placeholder="0"
                     class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-500">
            </div>

            <div class="mb-4">
              <label class="inline-flex items-center">
                <input type="checkbox" id="time-active-input" checked
                       class="mr-2 h-4 w-4">
                <span class="text-sm text-gray-700">有効にする</span>
              </label>
            </div>

            <div class="flex gap-2">
              <button type="submit" class="flex-1 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900">
                <i class="fas fa-save mr-2"></i>
                登録
              </button>
              <button type="button" onclick="adminApp.closeTimeSlotModal()"
                      class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">
                <i class="fas fa-times mr-2"></i>
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    `

    document.body.insertAdjacentHTML('beforeend', modalHtml)
  }

  showEditTimeSlotModal(id) {
    const slot = this.pickupTimeSlots.find(s => s.id === id)
    if (!slot) {
      alert('購入時間が見つかりません')
      return
    }

    const modalHtml = `
      <div id="time-slot-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <h3 class="text-xl font-bold mb-4">
            <i class="fas fa-edit mr-2"></i>
            購入時間を編集
          </h3>
          <form onsubmit="event.preventDefault(); adminApp.updateTimeSlot(${id})">
            <input type="hidden" id="time-slot-id" value="${id}">

            <div class="mb-4">
              <label class="block text-gray-700 font-medium mb-2">
                購入時間 <span class="text-red-500">*</span>
              </label>
              <input type="text" id="time-slot-input" required
                     value="${slot.time_slot}"
                     placeholder="例: 10:00～11:00"
                     class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-500">
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 font-medium mb-2">
                表示ラベル <span class="text-red-500">*</span>
              </label>
              <input type="text" id="time-label-input" required
                     value="${slot.display_label}"
                     class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-500">
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 font-medium mb-2">
                表示順序
              </label>
              <input type="number" id="time-order-input" min="0"
                     value="${slot.display_order}"
                     class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-500">
            </div>

            <div class="mb-4">
              <label class="inline-flex items-center">
                <input type="checkbox" id="time-active-input" ${slot.is_active === 1 ? 'checked' : ''}
                       class="mr-2 h-4 w-4">
                <span class="text-sm text-gray-700">有効にする</span>
              </label>
            </div>

            <div class="flex gap-2">
              <button type="submit" class="flex-1 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900">
                <i class="fas fa-save mr-2"></i>
                更新
              </button>
              <button type="button" onclick="adminApp.closeTimeSlotModal()"
                      class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">
                <i class="fas fa-times mr-2"></i>
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    `

    document.body.insertAdjacentHTML('beforeend', modalHtml)
  }

  async saveTimeSlot() {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      alert('認証が必要です')
      return
    }

    const timeSlot = document.getElementById('time-slot-input').value
    const displayLabel = document.getElementById('time-label-input').value
    const displayOrder = parseInt(document.getElementById('time-order-input').value) || 0
    const isActive = document.getElementById('time-active-input').checked ? 1 : 0
    const phase = this.currentTimeSlotPhase || 1

    if (!timeSlot || !displayLabel) {
      alert('購入時間と表示ラベルは必須です')
      return
    }

    try {
      const response = await fetch('/api/admin/pickup-time-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          time_slot: timeSlot,
          display_label: displayLabel,
          phase: phase,
          is_active: isActive,
          display_order: displayOrder
        })
      })

      const data = await response.json()

      if (data.success) {
        this.closeTimeSlotModal()
        await this.loadPickupTimeSlots()
        alert('購入時間を登録しました')
      } else {
        alert('登録に失敗しました: ' + (data.error || ''))
      }
    } catch (error) {
      console.error('Save time slot error:', error)
      alert('システムエラーが発生しました')
    }
  }

  async updateTimeSlot(id) {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      alert('認証が必要です')
      return
    }

    const timeSlot = document.getElementById('time-slot-input').value
    const displayLabel = document.getElementById('time-label-input').value
    const displayOrder = parseInt(document.getElementById('time-order-input').value) || 0
    const isActive = document.getElementById('time-active-input').checked ? 1 : 0
    const phase = this.currentTimeSlotPhase || 1

    if (!timeSlot || !displayLabel) {
      alert('購入時間と表示ラベルは必須です')
      return
    }

    try {
      const response = await fetch(`/api/admin/pickup-time-slots/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          time_slot: timeSlot,
          display_label: displayLabel,
          phase: phase,
          is_active: isActive,
          display_order: displayOrder
        })
      })

      const data = await response.json()

      if (data.success) {
        this.closeTimeSlotModal()
        await this.loadPickupTimeSlots()
        alert('購入時間を更新しました')
      } else {
        alert('更新に失敗しました: ' + (data.error || ''))
      }
    } catch (error) {
      console.error('Update time slot error:', error)
      alert('システムエラーが発生しました')
    }
  }

  async deleteTimeSlot(id) {
    if (!confirm('この購入時間を削除してもよろしいですか？\n\n※この時間帯を使用している応募データには影響しません')) {
      return
    }

    const token = localStorage.getItem('adminToken')
    if (!token) {
      alert('認証が必要です')
      return
    }

    try {
      const response = await fetch(`/api/admin/pickup-time-slots/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        await this.loadPickupTimeSlots()
        alert('購入時間を削除しました')
      } else {
        alert('削除に失敗しました: ' + (data.error || ''))
      }
    } catch (error) {
      console.error('Delete time slot error:', error)
      alert('システムエラーが発生しました')
    }
  }

  async toggleTimeSlotStatus(id) {
    const slot = this.pickupTimeSlots.find(s => s.id === id)
    if (!slot) {
      alert('購入時間が見つかりません')
      return
    }

    const newStatus = slot.is_active === 1 ? 0 : 1
    const action = newStatus === 1 ? '有効' : '無効'

    if (!confirm(`「${slot.display_label}」を${action}にしますか？`)) {
      return
    }

    const token = localStorage.getItem('adminToken')
    if (!token) {
      alert('認証が必要です')
      return
    }

    try {
      const response = await fetch(`/api/admin/pickup-time-slots/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          time_slot: slot.time_slot,
          display_label: slot.display_label,
          phase: slot.phase,
          is_active: newStatus,
          display_order: slot.display_order
        })
      })

      const data = await response.json()

      if (data.success) {
        await this.loadPickupTimeSlots()
      } else {
        alert('ステータス変更に失敗しました: ' + (data.error || ''))
      }
    } catch (error) {
      console.error('Toggle time slot status error:', error)
      alert('システムエラーが発生しました')
    }
  }

  closeTimeSlotModal() {
    const modal = document.getElementById('time-slot-modal')
    if (modal) {
      modal.remove()
    }
  }

  // 上限冊数編集モーダル表示
  showEditMaxTotalModal() {
    const currentMax = this.statistics?.maxTotal || 1000

    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-gray-800">
            <i class="fas fa-box mr-2 text-orange-500"></i>
            総発行上限冊数の編集
          </h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              現在の上限冊数
            </label>
            <div class="text-2xl font-bold text-gray-600">${currentMax}冊</div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              新しい上限冊数 <span class="text-red-500">*</span>
            </label>
            <input type="number" id="newMaxTotal" value="${currentMax}" min="0" step="1"
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500">
            <p class="text-xs text-gray-500 mt-1">
              <i class="fas fa-info-circle mr-1"></i>
              0以上の整数を入力してください
            </p>
          </div>

          <div class="bg-amber-50 border border-amber-200 rounded p-3">
            <p class="text-xs text-yellow-800">
              <i class="fas fa-exclamation-triangle mr-1"></i>
              <strong>注意:</strong> この変更は直ちに反映され、応募受付の上限が変更されます。既存の応募には影響しません。
            </p>
          </div>

          <div class="flex gap-2">
            <button onclick="this.closest('.fixed').remove()" 
                    class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
              キャンセル
            </button>
            <button onclick="adminApp.updateMaxTotal()" 
                    class="flex-1 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900">
              <i class="fas fa-save mr-1"></i>
              更新
            </button>
          </div>
        </div>
      </div>
    `
    document.body.appendChild(modal)
  }

  // 上限冊数更新処理
  async updateMaxTotal() {
    const input = document.getElementById('newMaxTotal')
    const newMaxTotal = parseInt(input.value)

    if (isNaN(newMaxTotal) || newMaxTotal < 0) {
      alert('有効な数値を入力してください（0以上の整数）')
      return
    }

    if (!confirm(`総発行上限を ${newMaxTotal}冊 に変更しますか？`)) {
      return
    }

    const token = localStorage.getItem('adminToken')
    if (!token) {
      alert('認証が必要です')
      return
    }

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          key: 'max_total_books',
          value: newMaxTotal.toString()
        })
      })

      const data = await response.json()

      if (data.success) {
        // モーダルを閉じる
        document.querySelector('.fixed.inset-0').remove()
        
        // データを再読み込み
        await this.loadData()
        await this.render()
        
        alert(`上限冊数を ${newMaxTotal}冊 に更新しました`)
      } else {
        alert('更新に失敗しました: ' + (data.error || ''))
      }
    } catch (error) {
      console.error('Update max total error:', error)
      alert('システムエラーが発生しました')
    }
  }


  logout() {
    if (confirm('ログアウトしますか？')) {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUsername')
      window.location.href = '/'
    }
  }
}

// アプリケーション初期化
let adminApp
document.addEventListener('DOMContentLoaded', () => {
  adminApp = new AdminApp()
  window.adminApp = adminApp // グローバルに公開
})

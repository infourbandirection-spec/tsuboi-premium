// プレミアム商品券予約・抽選システム - 管理画面

class AdminApp {
  constructor() {
    this.currentView = 'dashboard'
    this.reservations = []
    this.statistics = null
    this.settings = null
    this.lotteryResults = null
    this.filters = {
      status: '',
      store: '',
      date: ''
    }
    this.init()
  }

  async init() {
    // 認証チェック
    const isAuthenticated = await this.checkAuthentication()
    if (!isAuthenticated) {
      this.showLoginRequired()
      return
    }

    await this.loadData()
    this.render()
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
    const app = document.getElementById('admin-app')
    app.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
          <i class="fas fa-lock text-6xl text-red-500 mb-4"></i>
          <h1 class="text-3xl font-bold text-gray-800 mb-4">アクセスが拒否されました</h1>
          <p class="text-gray-600 mb-6">
            この画面にアクセスするには、管理者ログインが必要です。
          </p>
          <button onclick="window.location.href='/'" 
                  class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg">
            <i class="fas fa-arrow-left mr-2"></i> トップページへ戻る
          </button>
        </div>
      </div>
    `
  }

  async loadData() {
    try {
      // 予約一覧取得（全件取得するため limit=500 を指定）
      const reservationsResponse = await fetch('/api/admin/reservations?limit=500')
      const reservationsData = await reservationsResponse.json()
      if (reservationsData.success) {
        this.reservations = reservationsData.data
      }

      // 統計データ取得
      const statsResponse = await fetch('/api/admin/statistics')
      const statsData = await statsResponse.json()
      if (statsData.success) {
        this.statistics = statsData.data
      }

      // システム設定取得
      const settingsResponse = await fetch('/api/admin/settings')
      const settingsData = await settingsResponse.json()
      if (settingsData.success) {
        this.settings = settingsData.settings
      }

      // 抽選結果取得
      const lotteryResponse = await fetch('/api/admin/lottery/results')
      const lotteryData = await lotteryResponse.json()
      if (lotteryData.success) {
        this.lotteryResults = lotteryData.results
      }
    } catch (error) {
      console.error('Data load error:', error)
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
  }

  renderHeader() {
    return `
      <header class="bg-blue-600 text-white shadow-lg">
        <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center">
            <h1 class="text-3xl font-bold flex items-center">
              <i class="fas fa-cog mr-3"></i>
              プレミアム商品券 管理画面
            </h1>
            <button onclick="adminApp.logout()" 
                    class="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-bold transition">
              <i class="fas fa-sign-out-alt mr-2"></i> ログアウト
            </button>
          </div>
        </div>
      </header>
    `
  }

  renderNavigation() {
    const tabs = [
      { id: 'dashboard', icon: 'fa-chart-bar', label: 'ダッシュボード' },
      { id: 'lottery', icon: 'fa-trophy', label: '抽選管理' },
      { id: 'heatmap', icon: 'fa-fire', label: '混雑状況' },
      { id: 'reservations', icon: 'fa-list', label: '予約一覧' },
      { id: 'search', icon: 'fa-search', label: '予約検索' }
    ]

    return `
      <nav class="bg-white rounded-lg shadow mb-6">
        <div class="flex border-b">
          ${tabs.map(tab => `
            <button onclick="adminApp.switchView('${tab.id}')"
                    class="flex-1 px-6 py-4 text-center font-medium transition
                           ${this.currentView === tab.id ? 
                             'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 
                             'text-gray-600 hover:bg-gray-50'}">
              <i class="fas ${tab.icon} mr-2"></i>
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
      case 'heatmap': return this.renderHeatmap()
      case 'reservations': return this.renderReservationsList()
      case 'search': return this.renderSearch()
      default: return ''
    }
  }

  renderDashboard() {
    if (!this.statistics) {
      return '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-4xl text-blue-500"></i></div>'
    }

    const stats = this.statistics.total
    const remaining = 1000 - (stats.reserved_books || 0)

    return `
      <div class="space-y-6">
        <!-- サマリーカード -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">総予約数</p>
                <p class="text-3xl font-bold text-gray-800">${stats.total_reservations || 0}</p>
              </div>
              <i class="fas fa-ticket-alt text-4xl text-blue-500"></i>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">予約済み冊数</p>
                <p class="text-3xl font-bold text-green-600">${stats.reserved_books || 0}</p>
              </div>
              <i class="fas fa-shopping-cart text-4xl text-green-500"></i>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">受取完了冊数</p>
                <p class="text-3xl font-bold text-purple-600">${stats.completed_books || 0}</p>
              </div>
              <i class="fas fa-check-circle text-4xl text-purple-500"></i>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">残り冊数</p>
                <p class="text-3xl font-bold text-orange-600">${remaining}</p>
              </div>
              <i class="fas fa-box text-4xl text-orange-500"></i>
            </div>
          </div>
        </div>

        <!-- 進捗バー -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-bold text-gray-800 mb-4">予約状況</h2>
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span>予約済み</span>
                <span class="font-bold">${((stats.reserved_books || 0) / 1000 * 100).toFixed(1)}%</span>
              </div>
              <div class="bg-gray-200 rounded-full h-4">
                <div class="bg-green-500 rounded-full h-4" style="width: ${((stats.reserved_books || 0) / 1000 * 100).toFixed(1)}%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span>受取完了</span>
                <span class="font-bold">${((stats.completed_books || 0) / 1000 * 100).toFixed(1)}%</span>
              </div>
              <div class="bg-gray-200 rounded-full h-4">
                <div class="bg-purple-500 rounded-full h-4" style="width: ${((stats.completed_books || 0) / 1000 * 100).toFixed(1)}%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- チャート -->
        <div class="grid grid-cols-1 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-bold text-gray-800">日付別予約推移</h2>
              <span class="text-sm text-gray-600">
                <i class="fas fa-info-circle mr-1"></i>
                日ごとの予約推移を表示
              </span>
            </div>
            <div style="height: 300px;">
              <canvas id="dateChart"></canvas>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-bold text-gray-800">時間帯別予約状況</h2>
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
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
              <select id="filterStatus" onchange="adminApp.applyFilters()" 
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="">すべて</option>
                <option value="reserved">予約済み（未受取）</option>
                <option value="picked_up">受取完了</option>
                <option value="canceled">キャンセル</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">受取日</label>
              <input type="date" id="filterDate" onchange="adminApp.applyFilters()"
                     class="w-full px-4 py-2 border border-gray-300 rounded-lg">
            </div>
          </div>
          <div class="mt-4 flex gap-4">
            <button onclick="adminApp.exportCSV()" 
                    class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
              <i class="fas fa-download mr-2"></i> CSV出力
            </button>
            <button onclick="adminApp.resetFilters()" 
                    class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
              <i class="fas fa-redo mr-2"></i> リセット
            </button>
          </div>
        </div>

        <!-- テーブル -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">予約ID</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">氏名</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">電話番号</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">冊数</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">受取日時</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${this.getFilteredReservations().map(reservation => `
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    ${reservation.reservation_id}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${reservation.full_name}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${reservation.phone_number}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${reservation.quantity} 冊
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${reservation.pickup_date}<br>
                    ${reservation.pickup_time_slot}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    ${this.renderStatusBadge(reservation.status)}
                    ${reservation.picked_up_at ? `<div class="text-xs text-gray-500 mt-1">受取: ${new Date(reservation.picked_up_at).toLocaleString('ja-JP')}</div>` : ''}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    ${reservation.status === 'reserved' ? `
                      <button onclick="adminApp.confirmPickup(${reservation.id}, '${reservation.reservation_id}')"
                              class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-bold">
                        <i class="fas fa-check mr-1"></i> 受取完了
                      </button>
                    ` : reservation.status === 'picked_up' ? `
                      <span class="text-green-600 font-bold">
                        <i class="fas fa-check-circle mr-1"></i> 受取済み
                      </span>
                      ${reservation.picked_up_by ? `<div class="text-xs text-gray-500">担当: ${reservation.picked_up_by}</div>` : ''}
                    ` : `
                      <select onchange="adminApp.updateStatus(${reservation.id}, this.value)"
                              class="px-3 py-1 border border-gray-300 rounded">
                        <option value="">操作選択</option>
                        <option value="reserved" ${reservation.status === 'reserved' ? 'disabled' : ''}>予約済みに変更</option>
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
            <p class="text-lg">該当する予約がありません</p>
          </div>
        ` : ''}
      </div>
    `
  }

  renderSearch() {
    return `
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-6">予約検索</h2>
        
        <div class="max-w-2xl space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">検索タイプ</label>
            <select id="searchType" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
              <option value="id">予約IDで検索</option>
              <option value="phone">電話番号で検索</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">検索値</label>
            <input type="text" id="searchValue" placeholder="予約IDまたは電話番号を入力"
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg">
          </div>

          <button onclick="adminApp.searchReservation()" 
                  class="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold">
            <i class="fas fa-search mr-2"></i> 検索
          </button>
        </div>

        <div id="searchResults" class="mt-8"></div>
      </div>
    `
  }

  renderStatusBadge(status) {
    const statusConfig = {
      reserved: { label: '予約済み', color: 'bg-yellow-100 text-yellow-800' },
      picked_up: { label: '受取完了', color: 'bg-green-100 text-green-800' },
      completed: { label: '受取完了', color: 'bg-green-100 text-green-800' },
      canceled: { label: 'キャンセル', color: 'bg-red-100 text-red-800' }
    }
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return `<span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color}">${config.label}</span>`
  }

  getFilteredReservations() {
    return this.reservations.filter(r => {
      if (this.filters.status && r.status !== this.filters.status) return false
      if (this.filters.date && r.pickup_date !== this.filters.date) return false
      return true
    })
  }

  switchView(view) {
    this.currentView = view
    this.render()
  }

  applyFilters() {
    this.filters.status = document.getElementById('filterStatus')?.value || ''
    this.filters.date = document.getElementById('filterDate')?.value || ''
    this.render()
  }

  resetFilters() {
    this.filters = { status: '', date: '' }
    this.render()
  }

  async updateStatus(id, status) {
    if (!status) return

    if (!confirm(`ステータスを「${status}」に変更しますか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/reservations/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
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
    const staffName = prompt(`予約ID: ${reservationId}\n\n受取確認を行います。\n担当者名を入力してください（省略可）:`, '')
    
    if (staffName === null) {
      // キャンセルされた
      return
    }

    if (!confirm(`この予約を受取完了にしますか？\n\n予約ID: ${reservationId}`)) {
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
        alert('✅ 受取完了を記録しました')
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
                      <p class="text-sm text-gray-600">予約ID</p>
                      <p class="font-bold font-mono">${r.reservation_id}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">ステータス</p>
                      ${this.renderStatusBadge(r.status)}
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">氏名</p>
                      <p class="font-bold">${r.full_name}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">電話番号</p>
                      <p class="font-bold">${r.phone_number}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">冊数</p>
                      <p class="font-bold">${r.quantity} 冊</p>
                    </div>
                    <div class="col-span-2">
                      <p class="text-sm text-gray-600">受取日時</p>
                      <p class="font-bold">${r.pickup_date} ${r.pickup_time_slot}</p>
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
            <p class="text-lg">該当する予約が見つかりませんでした</p>
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

    const headers = ['予約ID', '生年月日', '氏名', '電話番号', '冊数', '受取日', '受取時間', 'ステータス', '予約日時']
    const rows = data.map(r => [
      r.reservation_id,
      r.birth_date,
      r.full_name,
      r.phone_number,
      r.quantity,
      r.pickup_date,
      r.pickup_time_slot,
      r.status,
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
            label: '予約冊数',
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
                  return `${date} の予約状況`
                }.bind(this),
                label: function(context) {
                  const dateData = this.statistics.byDate[context.dataIndex]
                  return [
                    `予約冊数: ${dateData.total_quantity}冊`,
                    `予約件数: ${dateData.count}件`
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
                text: '予約冊数',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              }
            },
            x: {
              title: {
                display: true,
                text: '受け取り日',
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
          <p>予約データがありません</p>
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
            label: '予約冊数',
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
                    `予約冊数: ${quantity}冊`,
                    `予約件数: ${timeData.count}件`
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
                text: '予約冊数',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              }
            },
            x: {
              title: {
                display: true,
                text: '受け取り時間帯',
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
          <p>予約データがありません</p>
        </div>
      `
    }
  }

  // 混雑状況ヒートマップビュー
  renderHeatmap() {
    if (!this.reservations || this.reservations.length === 0) {
      return `
        <div class="bg-white rounded-lg shadow p-8 text-center">
          <i class="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
          <p class="text-xl text-gray-500">予約データがありません</p>
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
    
    this.reservations.forEach(r => {
      if (r.status === 'reserved' || r.status === 'picked_up') {
        storesSet.add(r.store_location)
      }
    })
    
    const stores = Array.from(storesSet).sort()
    
    // 時間帯は常に固定の7つを使用
    const timeSlots = [
      '12:00～13:00',
      '13:00～14:00',
      '15:00～16:00',
      '16:00～17:00',
      '17:00～18:00',
      '18:00～19:00',
      '19:00～20:00'
    ]

    this.reservations.forEach(r => {
      if (r.status !== 'reserved' && r.status !== 'picked_up') return

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

      // 店舗×時間帯マトリックス（全日付）
      const key = `${r.store_location}|${r.pickup_time_slot}`
      if (!storeTimeMap[key]) {
        storeTimeMap[key] = { count: 0, quantity: 0 }
      }
      storeTimeMap[key].count++
      storeTimeMap[key].quantity += r.quantity

      // 店舗×時間帯×日付マトリックス
      const dateKey = `${r.store_location}|${r.pickup_time_slot}|${r.pickup_date}`
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
          <p class="mt-2">どの店舗・時間帯に予約が集中しているかを確認できます</p>
        </div>

        <!-- 日別予約状況 -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <i class="fas fa-calendar-alt text-blue-600 mr-2"></i>
            日別予約状況
          </h3>
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead>
                <tr class="bg-gray-100">
                  <th class="px-4 py-3 text-left text-sm font-bold text-gray-700">日付</th>
                  <th class="px-4 py-3 text-center text-sm font-bold text-gray-700">予約件数</th>
                  <th class="px-4 py-3 text-center text-sm font-bold text-gray-700">予約冊数</th>
                </tr>
              </thead>
              <tbody>
                ${dates.map((date, index) => {
                  const data = dateMap[date]
                  const dayOfWeek = new Date(date).toLocaleDateString('ja-JP', { weekday: 'short' })
                  return `
                    <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition">
                      <td class="px-4 py-3 text-sm font-medium">
                        ${date} (${dayOfWeek})
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                          ${data.count}件
                        </span>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
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
                  class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value="${selectedDate}"
                  min="2026-03-16"
                  onchange="adminApp.changeHeatmapDate(this.value)"
                >
              </div>
            </div>
          </div>
          <div class="flex items-center gap-4 text-sm mb-4 flex-wrap">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>空き（1～20件）</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></div>
              <span>やや混雑（21～50件）</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-orange-300 border border-orange-500 rounded"></div>
              <span>混雑（51～100件）</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-red-400 border border-red-600 rounded"></div>
              <span>非常に混雑（101件以上）</span>
            </div>
          </div>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p class="text-sm text-gray-700">
              <i class="fas fa-info-circle text-blue-500 mr-2"></i>
              <strong>表示ルール:</strong>
              ${this.statistics?.lotteryExecuted 
                ? '抽選実行済み - 当選者（Phase1）とPhase2予約のみ表示されます'
                : '抽選実行前 - すべての応募者が表示されます（Phase1: pending状態）'}
            </p>
          </div>
          <p class="text-sm text-gray-600 mb-4">
            <i class="fas fa-exclamation-triangle text-orange-500 mr-1"></i>
            赤く表示されている時間帯は予約が集中しています（101件以上）。ヘルプ要員の配置を検討してください。
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
                  // - 抽選実行後: 当選者（lottery_status='won'）+ Phase2予約（lottery_status='n/a'）のみ表示
                  const dateTimeMap = {}
                  this.reservations.forEach(r => {
                    if (r.status !== 'reserved' && r.status !== 'picked_up') return
                    
                    // 抽選落選者は除外
                    if (r.lottery_status === 'lost') return
                    
                    // Phase 1の予約で抽選実行済みの場合、当選者のみカウント
                    if (r.reservation_phase === 1 && this.statistics?.lotteryExecuted) {
                      if (r.lottery_status !== 'won') return
                    }
                    
                    const key = `${r.pickup_date}|${r.pickup_time_slot}`
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
                          
                          // 予約件数に基づく混雑度判定
                          // 空き: 1-20件、やや混雑: 21-50件、混雑: 51-100件、非常に混雑: 101件以上
                          let bgColor = 'bg-gray-50'
                          let textColor = 'text-gray-400'
                          let alertIcon = ''
                          
                          if (count >= 101) {
                            bgColor = 'bg-red-400'
                            textColor = 'text-white font-bold'
                            alertIcon = '<i class="fas fa-exclamation-triangle text-white mr-1"></i>'
                          } else if (count >= 51) {
                            bgColor = 'bg-orange-300'
                            textColor = 'text-gray-900 font-semibold'
                            alertIcon = '<i class="fas fa-exclamation-circle text-orange-800 mr-1"></i>'
                          } else if (count >= 21) {
                            bgColor = 'bg-yellow-200'
                            textColor = 'text-gray-800'
                          } else if (count >= 1) {
                            bgColor = 'bg-green-100'
                            textColor = 'text-gray-700'
                          }
                          
                          return `
                            <td class="px-2 py-3 text-center text-xs border ${bgColor} ${textColor} transition-all hover:scale-105 cursor-pointer"
                                title="${displayDate}\n${time}\n予約: ${count}件 / ${quantity}冊">
                              <div class="flex flex-col items-center justify-center">
                                ${alertIcon}
                                ${quantity > 0 ? `<div class="font-bold">${quantity}</div><div class="text-xs opacity-75">${count}件</div>` : '-'}
                              </div>
                            </td>
                          `
                        }).join('')}
                        <td class="px-3 py-3 text-center text-sm font-bold text-gray-800 border bg-blue-50">
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
    
    // Phase 1の予約統計
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
            <i class="fas fa-trophy text-yellow-500 mr-2"></i>
            抽選管理
          </h2>
          <p class="text-gray-600">予約の抽選実行と当選者管理</p>
        </div>

        <!-- システム状態 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">抽選状態</p>
                <p class="text-2xl font-bold ${lotteryExecuted ? 'text-green-600' : 'text-yellow-600'}">
                  ${lotteryExecuted ? '実行済み' : '未実行'}
                </p>
              </div>
              <i class="fas ${lotteryExecuted ? 'fa-check-circle' : 'fa-clock'} text-4xl ${lotteryExecuted ? 'text-green-500' : 'text-yellow-500'}"></i>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">予約受付</p>
                <p class="text-2xl font-bold ${reservationEnabled ? 'text-green-600' : 'text-red-600'}">
                  ${reservationEnabled ? '受付中' : '停止中'}
                </p>
              </div>
              <i class="fas ${reservationEnabled ? 'fa-play-circle' : 'fa-stop-circle'} text-4xl ${reservationEnabled ? 'text-green-500' : 'text-red-500'}"></i>
            </div>
            <button onclick="adminApp.toggleReservationEnabled()" 
                    class="mt-4 w-full px-4 py-2 ${reservationEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded font-bold transition">
              ${reservationEnabled ? '受付停止' : '受付再開'}
            </button>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">現在フェーズ</p>
                <p class="text-2xl font-bold text-blue-600">Phase ${currentPhase}</p>
              </div>
              <i class="fas fa-layer-group text-4xl text-blue-500"></i>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              ${currentPhase === 1 ? '固定日予約期間' : '自由日選択期間'}
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
            <div class="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
              <p class="text-sm text-blue-600 mb-1">応募者数</p>
              <p class="text-3xl font-bold text-blue-700">${phase1Count} 名</p>
            </div>
            <div class="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
              <p class="text-sm text-purple-600 mb-1">応募総冊数</p>
              <p class="text-3xl font-bold text-purple-700">${phase1Total} 冊</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-500">
              <p class="text-sm text-gray-600 mb-1">抽選判定</p>
              <p class="text-2xl font-bold ${phase1Total <= 1000 ? 'text-green-600' : 'text-red-600'}">
                ${phase1Total <= 1000 ? '全員当選' : '抽選必要'}
              </p>
            </div>
          </div>
        </div>

        <!-- 抽選実行 -->
        ${!lotteryExecuted ? `
          <div class="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg shadow p-6 border-2 border-yellow-300">
            <h3 class="text-xl font-bold text-gray-800 mb-4">
              <i class="fas fa-dice mr-2 text-yellow-600"></i>
              抽選実行
            </h3>
            <p class="text-gray-700 mb-4">
              Phase 1の予約に対して抽選を実行します。
              ${phase1Total <= 1000 ? 
                '応募総数が1000冊以下のため、<strong>全員が自動的に当選</strong>します。' : 
                '応募総数が1000冊を超えているため、<strong>ランダム抽選</strong>を実行します。'}
            </p>
            <div class="bg-yellow-100 border border-yellow-300 rounded p-4 mb-4">
              <p class="text-sm text-yellow-800">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                <strong>注意:</strong> 抽選は一度のみ実行可能です。実行後は取り消せません。
              </p>
            </div>
            <button onclick="adminApp.executeLottery()" 
                    class="w-full px-6 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 font-bold text-lg shadow-lg transition"
                    ${phase1Count === 0 ? 'disabled' : ''}>
              <i class="fas fa-trophy mr-2"></i>
              抽選を実行する（${phase1Count}名 / ${phase1Total}冊）
            </button>
          </div>
        ` : `
          <div class="bg-green-50 rounded-lg shadow p-6 border-2 border-green-300">
            <h3 class="text-xl font-bold text-green-800 mb-4">
              <i class="fas fa-check-circle mr-2"></i>
              抽選完了
            </h3>
            <p class="text-gray-700 mb-4">
              抽選は既に実行済みです。当選者は ${winners.length} 名、合計 ${winnersTotal} 冊です。
            </p>
            ${this.lotteryResults && this.lotteryResults.length > 0 ? `
              <div class="bg-white rounded p-4 mb-4">
                <p class="text-sm text-gray-600 mb-2">実行日時: ${new Date(this.lotteryResults[0].execution_date).toLocaleString('ja-JP')}</p>
                <p class="text-sm text-gray-700">${this.lotteryResults[0].notes || ''}</p>
              </div>
            ` : ''}
            <a href="/lottery-results" target="_blank" 
               class="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold transition">
              <i class="fas fa-external-link-alt mr-2"></i>
              当選者掲示板を開く
            </a>
          </div>
        `}

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
                      <td class="px-4 py-3 text-sm font-bold text-green-600">${result.winners_count}名</td>
                      <td class="px-4 py-3 text-sm font-bold text-green-600">${result.winners_quantity}冊</td>
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

  // 予約受付ON/OFF切替
  async toggleReservationEnabled() {
    const currentValue = this.settings?.reservation_enabled === 'true'
    const newValue = !currentValue

    if (!confirm(`予約受付を${newValue ? '再開' : '停止'}しますか？`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'reservation_enabled',
          value: newValue.toString()
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`予約受付を${newValue ? '再開' : '停止'}しました`)
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

  logout() {
    if (confirm('ログアウトしますか？')) {
      localStorage.removeItem('adminToken')
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

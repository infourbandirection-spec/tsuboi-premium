// プレミアム商品券予約システム - 管理画面

class AdminApp {
  constructor() {
    this.currentView = 'dashboard'
    this.reservations = []
    this.statistics = null
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
      // 予約一覧取得
      const reservationsResponse = await fetch('/api/admin/reservations')
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
              <h2 class="text-lg font-bold text-gray-800">店舗別予約状況</h2>
              <span class="text-sm text-gray-600">
                <i class="fas fa-info-circle mr-1"></i>
                店舗ごとの予約冊数を表示
              </span>
            </div>
            <div style="height: 300px;">
              <canvas id="storeChart"></canvas>
            </div>
          </div>

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
                <option value="reserved">予約済み</option>
                <option value="completed">受取完了</option>
                <option value="canceled">キャンセル</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">店舗</label>
              <select id="filterStore" onchange="adminApp.applyFilters()" 
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="">すべて</option>
                <option value="パスート24上通">パスート24上通</option>
                <option value="パスート24銀座プレス">パスート24銀座プレス</option>
                <option value="パスート24辛島公園">パスート24辛島公園</option>
                <option value="パスート24熊本中央">パスート24熊本中央</option>
                <option value="熊本市辛島公園地下駐車場">熊本市辛島公園地下駐車場</option>
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
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">店舗</th>
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
                    ${reservation.store_location}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${reservation.pickup_date}<br>
                    ${reservation.pickup_time_slot}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    ${this.renderStatusBadge(reservation.status)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <select onchange="adminApp.updateStatus(${reservation.id}, this.value)"
                            class="px-3 py-1 border border-gray-300 rounded">
                      <option value="">操作選択</option>
                      <option value="reserved" ${reservation.status === 'reserved' ? 'disabled' : ''}>予約済みに変更</option>
                      <option value="completed" ${reservation.status === 'completed' ? 'disabled' : ''}>受取完了に変更</option>
                      <option value="canceled" ${reservation.status === 'canceled' ? 'disabled' : ''}>キャンセルに変更</option>
                    </select>
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
      reserved: { label: '予約済み', color: 'bg-green-100 text-green-800' },
      completed: { label: '受取完了', color: 'bg-purple-100 text-purple-800' },
      canceled: { label: 'キャンセル', color: 'bg-red-100 text-red-800' }
    }
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return `<span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color}">${config.label}</span>`
  }

  getFilteredReservations() {
    return this.reservations.filter(r => {
      if (this.filters.status && r.status !== this.filters.status) return false
      if (this.filters.store && r.store_location !== this.filters.store) return false
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
    this.filters.store = document.getElementById('filterStore')?.value || ''
    this.filters.date = document.getElementById('filterDate')?.value || ''
    this.render()
  }

  resetFilters() {
    this.filters = { status: '', store: '', date: '' }
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
                    <div>
                      <p class="text-sm text-gray-600">店舗</p>
                      <p class="font-bold">${r.store_location}</p>
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

    const headers = ['予約ID', '生年月日', '氏名', '電話番号', '冊数', '店舗', '受取日', '受取時間', 'ステータス', '予約日時']
    const rows = data.map(r => [
      r.reservation_id,
      r.birth_date,
      r.full_name,
      r.phone_number,
      r.quantity,
      r.store_location,
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

    // 店舗別チャート
    const storeCtx = document.getElementById('storeChart')
    if (storeCtx && this.statistics.byStore.length > 0) {
      new Chart(storeCtx, {
        type: 'bar',
        data: {
          labels: this.statistics.byStore.map(s => s.store_location),
          datasets: [{
            label: '予約冊数',
            data: this.statistics.byStore.map(s => s.total_quantity),
            backgroundColor: [
              'rgba(59, 130, 246, 0.7)',
              'rgba(16, 185, 129, 0.7)',
              'rgba(245, 158, 11, 0.7)',
              'rgba(139, 92, 246, 0.7)',
              'rgba(236, 72, 153, 0.7)'
            ],
            borderColor: [
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(139, 92, 246, 1)',
              'rgba(236, 72, 153, 1)'
            ],
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
                  const store = context.chart.data.labels[context.dataIndex]
                  const quantity = context.parsed.y
                  const storeData = this.statistics.byStore.find(s => s.store_location === store)
                  return [
                    `予約冊数: ${quantity}冊`,
                    `予約件数: ${storeData.count}件`
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
              ticks: {
                maxRotation: 45,
                minRotation: 45
              }
            }
          }
        }
      })
    } else if (storeCtx) {
      storeCtx.parentElement.innerHTML = `
        <div class="text-center py-12 text-gray-400">
          <i class="fas fa-chart-bar text-6xl mb-4"></i>
          <p>予約データがありません</p>
        </div>
      `
    }

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

    // 日別データ集計
    const dateMap = {}
    const storeTimeMap = {}
    const stores = ['パスート24上通', 'パスート24銀座プレス', 'パスート24辛島公園', 'パスート24熊本中央', '熊本市辛島公園地下駐車場']
    const timeSlots = [
      '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
      '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00'
    ]

    this.reservations.forEach(r => {
      if (r.status !== 'reserved') return

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

      // 店舗×時間帯マトリックス
      const key = `${r.store_location}|${r.pickup_time_slot}`
      if (!storeTimeMap[key]) {
        storeTimeMap[key] = { count: 0, quantity: 0 }
      }
      storeTimeMap[key].count++
      storeTimeMap[key].quantity += r.quantity
    })

    // 日付をソート
    const dates = Object.keys(dateMap).sort()

    // 最大値を計算（色の濃さ用）
    const maxQuantity = Math.max(...Object.values(storeTimeMap).map(v => v.quantity), 1)

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
                  <th class="px-4 py-3 text-left text-sm font-bold text-gray-700">店舗別内訳</th>
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
                      <td class="px-4 py-3 text-sm">
                        <div class="flex flex-wrap gap-2">
                          ${stores.map(store => {
                            const storeData = data.stores[store]
                            if (!storeData) return ''
                            return `
                              <span class="px-2 py-1 bg-gray-100 rounded text-xs">
                                ${store.replace('パスート24', '').replace('熊本市', '')}: ${storeData.quantity}冊
                              </span>
                            `
                          }).join('')}
                        </div>
                      </td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 店舗×時間帯ヒートマップ -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-gray-800 flex items-center">
              <i class="fas fa-th text-orange-600 mr-2"></i>
              店舗×時間帯 混雑ヒートマップ
            </h3>
            <div class="flex items-center gap-4 text-sm">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span>空き</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></div>
                <span>やや混雑</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-orange-300 border border-orange-500 rounded"></div>
                <span>混雑</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-red-400 border border-red-600 rounded"></div>
                <span>非常に混雑</span>
              </div>
            </div>
          </div>
          <p class="text-sm text-gray-600 mb-4">
            <i class="fas fa-info-circle text-blue-500 mr-1"></i>
            赤く表示されている時間帯は予約が集中しています。ヘルプ要員の配置を検討してください。
          </p>
          <div class="overflow-x-auto">
            <table class="min-w-full border-collapse">
              <thead>
                <tr>
                  <th class="px-3 py-2 text-left text-sm font-bold text-gray-700 bg-gray-100 border sticky left-0 z-10">
                    店舗 / 時間帯
                  </th>
                  ${timeSlots.map(time => `
                    <th class="px-3 py-2 text-center text-xs font-bold text-gray-700 bg-gray-100 border whitespace-nowrap">
                      ${time.replace(':00', '')}
                    </th>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                ${stores.map((store, sIndex) => {
                  return `
                    <tr class="${sIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                      <td class="px-3 py-3 text-sm font-medium text-gray-800 border sticky left-0 z-10 ${sIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                        ${store}
                      </td>
                      ${timeSlots.map(time => {
                        const key = `${store}|${time}`
                        const data = storeTimeMap[key]
                        const quantity = data ? data.quantity : 0
                        const count = data ? data.count : 0
                        
                        // 色の濃さを計算（0-100%）
                        const intensity = maxQuantity > 0 ? (quantity / maxQuantity) * 100 : 0
                        
                        let bgColor = 'bg-gray-50'
                        let textColor = 'text-gray-400'
                        let alertIcon = ''
                        
                        if (intensity > 75) {
                          bgColor = 'bg-red-400'
                          textColor = 'text-white font-bold'
                          alertIcon = '<i class="fas fa-exclamation-triangle text-white mr-1"></i>'
                        } else if (intensity > 50) {
                          bgColor = 'bg-orange-300'
                          textColor = 'text-gray-900 font-semibold'
                          alertIcon = '<i class="fas fa-exclamation-circle text-orange-800 mr-1"></i>'
                        } else if (intensity > 25) {
                          bgColor = 'bg-yellow-200'
                          textColor = 'text-gray-800'
                        } else if (intensity > 0) {
                          bgColor = 'bg-green-100'
                          textColor = 'text-gray-700'
                        }
                        
                        return `
                          <td class="px-2 py-3 text-center text-xs border ${bgColor} ${textColor} transition-all hover:scale-105 cursor-pointer"
                              title="${store}\n${time}\n予約: ${count}件 / ${quantity}冊">
                            <div class="flex flex-col items-center justify-center">
                              ${alertIcon}
                              ${quantity > 0 ? `<div class="font-bold">${quantity}</div><div class="text-xs opacity-75">${count}件</div>` : '-'}
                            </div>
                          </td>
                        `
                      }).join('')}
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 混雑予測アラート -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <i class="fas fa-bell text-red-600 mr-2"></i>
            混雑予測アラート
          </h3>
          ${this.renderCongestionAlerts(storeTimeMap, maxQuantity)}
        </div>
      </div>
    `
  }

  renderCongestionAlerts(storeTimeMap, maxQuantity) {
    const alerts = []
    
    Object.entries(storeTimeMap).forEach(([key, data]) => {
      const [store, time] = key.split('|')
      const intensity = (data.quantity / maxQuantity) * 100
      
      if (intensity > 75) {
        alerts.push({
          level: 'critical',
          store,
          time,
          count: data.count,
          quantity: data.quantity,
          message: '非常に混雑が予想されます。追加スタッフの配置を強く推奨します。'
        })
      } else if (intensity > 50) {
        alerts.push({
          level: 'warning',
          store,
          time,
          count: data.count,
          quantity: data.quantity,
          message: '混雑が予想されます。スタッフ配置の検討をお勧めします。'
        })
      }
    })

    // 重要度順にソート
    alerts.sort((a, b) => b.quantity - a.quantity)

    if (alerts.length === 0) {
      return `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-check-circle text-6xl text-green-500 mb-4"></i>
          <p class="text-lg font-medium">現在、特に混雑が予想される時間帯はありません</p>
          <p class="text-sm mt-2">すべての時間帯が比較的均等に予約されています。</p>
        </div>
      `
    }

    return `
      <div class="space-y-3">
        ${alerts.map(alert => {
          const iconClass = alert.level === 'critical' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'
          const bgClass = alert.level === 'critical' ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-300'
          const iconColor = alert.level === 'critical' ? 'text-red-600' : 'text-orange-600'
          
          return `
            <div class="border-2 ${bgClass} rounded-lg p-4">
              <div class="flex items-start gap-4">
                <i class="fas ${iconClass} text-2xl ${iconColor} mt-1"></i>
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-bold text-gray-800 text-lg">${alert.store}</h4>
                    <span class="px-3 py-1 bg-white rounded-full text-sm font-bold ${iconColor}">
                      ${alert.time}
                    </span>
                  </div>
                  <p class="text-gray-700 mb-2">${alert.message}</p>
                  <div class="flex gap-4 text-sm">
                    <span class="font-semibold">予約件数: <span class="text-blue-600">${alert.count}件</span></span>
                    <span class="font-semibold">予約冊数: <span class="text-green-600">${alert.quantity}冊</span></span>
                  </div>
                </div>
              </div>
            </div>
          `
        }).join('')}
      </div>
    `
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
})

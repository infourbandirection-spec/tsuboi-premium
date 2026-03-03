// プレミアム商品券応募システム - 単一ページ形式

class ReservationApp {
  constructor() {
    this.currentPhase = 1
    this.showConfirmation = false
    this.formData = {
      birthDate: '',
      fullName: '',
      kana: '',
      phoneNumber: '',
      email: '',
      quantity: 1,
      store: '株式会社パスート24（熊本県熊本市中央区中央街4-29）',
      pickupDate: '',
      pickupTime: ''
    }
    this.systemStatus = null
    this.stores = []
    this.init()
  }

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

  async init() {
    await this.loadSystemStatus()
    await this.loadStores()
    this.render()
  }

  async loadSystemStatus() {
    try {
      const response = await fetch('/api/status')
      const data = await response.json()
      if (data.success) {
        this.systemStatus = data.data
        this.currentPhase = data.data.currentPhase || 1
      }
    } catch (error) {
      console.error('Status load error:', error)
    }
  }

  async loadStores() {
    try {
      const response = await fetch('/api/stores')
      const data = await response.json()
      if (data.success) {
        this.stores = data.data
      }
    } catch (error) {
      console.error('Stores load error:', error)
    }
  }

  render() {
    const app = document.getElementById('app')
    
    if (!this.systemStatus) {
      app.innerHTML = '<div class="p-8 text-center"><i class="fas fa-spinner fa-spin text-4xl text-blue-500"></i><p class="mt-4">読み込み中...</p></div>'
      return
    }

    if (!this.systemStatus.isAccepting) {
      app.innerHTML = this.renderClosedView()
      window.scrollTo(0, 0)
      return
    }

    if (this.showConfirmation) {
      app.innerHTML = this.renderConfirmation()
    } else {
      app.innerHTML = this.renderSinglePageForm()
    }
    window.scrollTo(0, 0)
  }

  renderClosedView() {
    return `
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="bg-white shadow-lg p-8 max-w-md w-full text-center">
          <i class="fas fa-exclamation-triangle text-6xl text-red-500 mb-4"></i>
          <h1 class="text-2xl font-bold text-gray-800 mb-6">応募受付終了</h1>
          <p class="text-gray-600 mb-8">
            申し訳ございません。<br>
            応募期間外となり、現在受付を終了しております。
          </p>
          <a href="/lottery-results" 
             class="inline-block w-full bg-blue-600 text-white px-6 py-3 font-bold hover:bg-blue-700 transition">
            <i class="fas fa-trophy mr-2"></i>
            当選者発表を見る
          </a>
        </div>
      </div>
    `
  }

  renderSinglePageForm() {
    const remaining = this.systemStatus.remaining || 0
    const maxQuantity = Math.min(5, remaining)
    
    return `
      <div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
        <div class="max-w-4xl mx-auto">
          <!-- ヘッダー -->
          <div class="bg-white shadow-lg p-6 mb-6">
            <div class="flex justify-between items-start">
              <div>
                <h1 class="text-3xl font-bold text-gray-800 mb-2 flex items-center">
                  <i class="fas fa-ticket-alt text-blue-500 mr-2"></i>
                  パスート24プレミアム商品券<br>抽選・応募システム
                </h1>
                <p class="text-gray-600">ご希望の商品券をご予約いただけます</p>
              </div>
              <button onclick="location.href='/lookup'" 
                      class="px-4 py-2 bg-purple-500 text-white hover:bg-purple-600 transition">
                <i class="fas fa-search mr-2"></i>予約照会
              </button>
            </div>
          </div>

          <!-- 応募受付中ステータス -->
          <div class="bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-lg p-6 mb-6">
            <div class="text-center">
              <p class="text-lg mb-2">応募受付中</p>
              <p class="text-2xl font-bold">
                <i class="fas fa-check-circle mr-2"></i>受付可能
              </p>
            </div>
          </div>

          <!-- プログレスバー -->
          <div class="bg-white shadow-lg p-6 mb-6">
            <div class="flex justify-between items-center max-w-md mx-auto">
              <div class="flex flex-col items-center flex-1">
                <div class="w-12 h-12 flex items-center justify-center font-bold mb-2 text-lg bg-blue-500 text-white">
                  1
                </div>
                <span class="text-sm text-gray-600 text-center font-medium">生年月日</span>
              </div>
              <div class="flex-1 h-1 bg-gray-300 mx-2"></div>
              <div class="flex flex-col items-center flex-1">
                <div class="w-12 h-12 flex items-center justify-center font-bold mb-2 text-lg bg-gray-200 text-gray-500">
                  2
                </div>
                <span class="text-sm text-gray-600 text-center font-medium">氏名</span>
              </div>
              <div class="flex-1 h-1 bg-gray-300 mx-2"></div>
              <div class="flex flex-col items-center flex-1">
                <div class="w-12 h-12 flex items-center justify-center font-bold mb-2 text-lg bg-gray-200 text-gray-500">
                  3
                </div>
                <span class="text-sm text-gray-600 text-center font-medium">連絡先</span>
              </div>
              <div class="flex-1 h-1 bg-gray-300 mx-2"></div>
              <div class="flex flex-col items-center flex-1">
                <div class="w-12 h-12 flex items-center justify-center font-bold mb-2 text-lg bg-gray-200 text-gray-500">
                  4
                </div>
                <span class="text-sm text-gray-600 text-center font-medium">冊数</span>
              </div>
              <div class="flex-1 h-1 bg-gray-300 mx-2"></div>
              <div class="flex flex-col items-center flex-1">
                <div class="w-12 h-12 flex items-center justify-center font-bold mb-2 text-lg bg-gray-200 text-gray-500">
                  5
                </div>
                <span class="text-sm text-gray-600 text-center font-medium">日時</span>
              </div>
              <div class="flex-1 h-1 bg-gray-300 mx-2"></div>
              <div class="flex flex-col items-center flex-1">
                <div class="w-12 h-12 flex items-center justify-center font-bold mb-2 text-lg bg-gray-200 text-gray-500">
                  6
                </div>
                <span class="text-sm text-gray-600 text-center font-medium">確認</span>
              </div>
            </div>
          </div>

          <!-- 単一ページフォーム -->
          <div class="bg-white shadow-lg p-8">
            <form id="reservationForm" onsubmit="event.preventDefault(); app.submitToConfirmation()">
              
              <!-- 生年月日 -->
              <div class="mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-calendar-alt text-blue-500 mr-2"></i>
                  生年月日を入力してください
                </h2>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  生年月日 <span class="text-red-500">*</span>
                </label>
                <input type="date" 
                       id="birthDate"
                       value="${this.formData.birthDate}"
                       max="${new Date().toISOString().split('T')[0]}"
                       class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                       required>
                <p class="text-xs text-gray-500 mt-2">
                  <i class="fas fa-info-circle mr-1"></i>
                  未来の日付は選択できません
                </p>
              </div>

              <hr class="my-8 border-gray-200">

              <!-- 氏名・ふりがな -->
              <div class="mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-user text-blue-500 mr-2"></i>
                  氏名・ふりがなを入力してください
                </h2>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      氏名（フルネーム） <span class="text-red-500">*</span>
                    </label>
                    <input type="text" 
                           id="fullName"
                           value="${this.escapeHtml(this.formData.fullName)}"
                           placeholder="例: 山田 太郎"
                           class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                           required>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      ふりがな <span class="text-red-500">*</span>
                    </label>
                    <input type="text" 
                           id="kana"
                           value="${this.escapeHtml(this.formData.kana)}"
                           placeholder="例: やまだ たろう"
                           class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                           required>
                  </div>
                </div>
              </div>

              <hr class="my-8 border-gray-200">

              <!-- 連絡先 -->
              <div class="mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-phone text-blue-500 mr-2"></i>
                  連絡先を入力してください
                </h2>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      電話番号 <span class="text-red-500">*</span>
                    </label>
                    <input type="tel" 
                           id="phoneNumber"
                           value="${this.escapeHtml(this.formData.phoneNumber)}"
                           placeholder="例: 090-1234-5678 または 09012345678"
                           class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                           required>
                    <p class="text-xs text-gray-500 mt-2">
                      <i class="fas fa-info-circle mr-1"></i>
                      ハイフンあり・なしどちらでも可
                    </p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      メールアドレス <span class="text-red-500">*</span>
                    </label>
                    <input type="email" 
                           id="email"
                           value="${this.escapeHtml(this.formData.email)}"
                           placeholder="例: example@example.com"
                           class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                           required>
                    <p class="text-xs text-gray-500 mt-2">
                      <i class="fas fa-info-circle mr-1"></i>
                      確認メールが送信されます
                    </p>
                  </div>
                </div>
              </div>

              <hr class="my-8 border-gray-200">

              <!-- 冊数 -->
              <div class="mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-list-ol text-blue-500 mr-2"></i>
                  冊数を選択してください
                </h2>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  冊数 <span class="text-red-500">*</span>
                </label>
                <select id="quantity"
                        class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        required>
                  ${Array.from({length: maxQuantity}, (_, i) => i + 1).map(num => 
                    `<option value="${num}" ${num === this.formData.quantity ? 'selected' : ''}>${num}冊</option>`
                  ).join('')}
                </select>
                ${remaining < 6 ? `
                  <div class="mt-3 bg-yellow-50 border-l-4 border-yellow-400 p-3">
                    <p class="text-sm text-yellow-700">
                      <i class="fas fa-exclamation-triangle mr-2"></i>
                      残り${remaining}冊です
                    </p>
                  </div>
                ` : ''}
              </div>

              <hr class="my-8 border-gray-200">

              <!-- 受取日時 -->
              <div class="mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-clock text-blue-500 mr-2"></i>
                  受け取り日時を選択してください
                </h2>
                ${this.renderPickupDateTimeSection()}
              </div>

              <!-- 確認画面へボタン -->
              <div class="mt-8 text-center">
                <button type="submit"
                        class="px-12 py-4 bg-blue-500 text-white text-lg font-bold hover:bg-blue-600 transition shadow-lg">
                  次へ <i class="fas fa-arrow-right ml-2"></i>
                </button>
              </div>
            </form>
          </div>

          <!-- 注意事項 -->
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
            <div class="flex">
              <i class="fas fa-exclamation-circle text-yellow-400 mt-1 mr-3"></i>
              <div class="text-sm text-gray-700">
                <p class="font-bold mb-2">重要な注意事項</p>
                <ul class="list-disc list-inside space-y-1">
                  <li>受け取り予定日を過ぎた場合は自動的にキャンセルされます</li>
                  <li>応募IDは必ず控えてください</li>
                  <li>お一人様1回限りの応募です</li>
                  <li><strong>必ずご本人様がお越しください</strong>（代理人不可）</li>
                  <li><strong>受け取り時に身分証明証をご持参ください</strong></li>
                </ul>
              </div>
            </div>
          </div>

          <div class="mt-4 text-center">
            <a href="/privacy" class="text-sm text-gray-600 hover:text-blue-600 underline">
              <i class="fas fa-shield-alt mr-1"></i>プライバシーポリシー
            </a>
          </div>
        </div>
      </div>
    `
  }

  renderPickupDateTimeSection() {
    if (this.currentPhase === 2) {
      return this.renderPhase2PickupSection()
    } else {
      return this.renderPhase1PickupSection()
    }
  }

  renderPhase1PickupSection() {
    const pickupDates = [
      { value: '2026-03-16', label: '3月16日（月）' },
      { value: '2026-03-17', label: '3月17日（火）' },
      { value: '2026-03-18', label: '3月18日（水）' }
    ]

    const timeSlots = [
      '12:00～13:00', '13:00～14:00', '15:00～16:00', '16:00～17:00',
      '17:00～18:00', '18:00～19:00', '19:00～20:00'
    ]

    return `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            受け取り日 <span class="text-red-500">*</span>
          </label>
          <select id="pickupDate"
                  class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required>
            <option value="">選択してください</option>
            ${pickupDates.map(date => 
              `<option value="${date.value}" ${this.formData.pickupDate === date.value ? 'selected' : ''}>${date.label}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            受け取り時間 <span class="text-red-500">*</span>
          </label>
          <select id="pickupTime"
                  class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required>
            <option value="">選択してください</option>
            ${timeSlots.map(time => 
              `<option value="${time}" ${this.formData.pickupTime === time ? 'selected' : ''}>${time}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    `
  }

  renderPhase2PickupSection() {
    const today = new Date()
    const minDate = today.toISOString().split('T')[0]
    const maxDateObj = new Date(today)
    maxDateObj.setDate(maxDateObj.getDate() + 7)
    const maxDate = maxDateObj.toISOString().split('T')[0]

    const timeSlots = [
      '12:00～13:00', '13:00～14:00', '15:00～16:00', '16:00～17:00',
      '17:00～18:00', '18:00～19:00', '19:00～20:00'
    ]

    return `
      <div class="space-y-4">
        <div class="bg-green-50 border border-green-200 p-4 mb-4">
          <p class="text-sm text-green-800">
            <i class="fas fa-info-circle mr-2"></i>
            <strong>Phase 2: 自由日選択期間（先着順）</strong><br>
            応募日から1週間以内の任意の日付を選択できます
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            受け取り日 <span class="text-red-500">*</span>
          </label>
          <input type="date" 
                 id="pickupDate"
                 value="${this.formData.pickupDate}"
                 min="${minDate}"
                 max="${maxDate}"
                 class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                 required>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            受け取り時間 <span class="text-red-500">*</span>
          </label>
          <select id="pickupTime"
                  class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required>
            <option value="">選択してください</option>
            ${timeSlots.map(time => 
              `<option value="${time}" ${this.formData.pickupTime === time ? 'selected' : ''}>${time}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    `
  }

  submitToConfirmation() {
    // フォームデータを収集
    this.formData.birthDate = document.getElementById('birthDate').value
    this.formData.fullName = document.getElementById('fullName').value
    this.formData.kana = document.getElementById('kana').value
    this.formData.phoneNumber = document.getElementById('phoneNumber').value
    this.formData.email = document.getElementById('email').value
    this.formData.quantity = parseInt(document.getElementById('quantity').value)
    this.formData.pickupDate = document.getElementById('pickupDate').value
    this.formData.pickupTime = document.getElementById('pickupTime').value

    // バリデーション
    if (!this.formData.birthDate || !this.formData.fullName || !this.formData.kana ||
        !this.formData.phoneNumber || !this.formData.email || !this.formData.pickupDate || 
        !this.formData.pickupTime) {
      alert('すべての必須項目を入力してください')
      return
    }

    // 確認画面へ
    this.showConfirmation = true
    this.render()
  }

  renderConfirmation() {
    return `
      <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div class="max-w-4xl mx-auto">
          <div class="bg-white shadow-lg p-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <i class="fas fa-check-circle text-green-500 mr-2"></i>
              入力内容の確認
            </h2>

            <div class="space-y-4 mb-8">
              <div class="border-b pb-3">
                <p class="text-sm text-gray-600">生年月日</p>
                <p class="text-lg font-medium">${this.escapeHtml(this.formData.birthDate)}</p>
              </div>
              <div class="border-b pb-3">
                <p class="text-sm text-gray-600">氏名</p>
                <p class="text-lg font-medium">${this.escapeHtml(this.formData.fullName)}</p>
              </div>
              <div class="border-b pb-3">
                <p class="text-sm text-gray-600">ふりがな</p>
                <p class="text-lg font-medium">${this.escapeHtml(this.formData.kana)}</p>
              </div>
              <div class="border-b pb-3">
                <p class="text-sm text-gray-600">電話番号</p>
                <p class="text-lg font-medium">${this.escapeHtml(this.formData.phoneNumber)}</p>
              </div>
              <div class="border-b pb-3">
                <p class="text-sm text-gray-600">メールアドレス</p>
                <p class="text-lg font-medium">${this.escapeHtml(this.formData.email)}</p>
              </div>
              <div class="border-b pb-3">
                <p class="text-sm text-gray-600">冊数</p>
                <p class="text-lg font-medium">${this.formData.quantity}冊</p>
              </div>
              <div class="border-b pb-3">
                <p class="text-sm text-gray-600">受取店舗</p>
                <p class="text-lg font-medium">${this.escapeHtml(this.formData.store)}</p>
              </div>
              <div class="border-b pb-3">
                <p class="text-sm text-gray-600">受け取り日</p>
                <p class="text-lg font-medium">${this.escapeHtml(this.formData.pickupDate)}</p>
              </div>
              <div class="border-b pb-3">
                <p class="text-sm text-gray-600">受け取り時間</p>
                <p class="text-lg font-medium">${this.escapeHtml(this.formData.pickupTime)}</p>
              </div>
            </div>

            <div class="flex gap-4">
              <button onclick="app.backToForm()"
                      class="flex-1 px-6 py-3 bg-gray-300 text-gray-700 font-bold hover:bg-gray-400 transition">
                <i class="fas fa-arrow-left mr-2"></i>戻る
              </button>
              <button onclick="app.submitReservation()"
                      class="flex-1 px-6 py-3 bg-blue-500 text-white font-bold hover:bg-blue-600 transition">
                応募を確定する <i class="fas fa-check ml-2"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `
  }

  backToForm() {
    this.showConfirmation = false
    this.render()
  }

  async submitReservation() {
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.formData)
      })

      const data = await response.json()

      if (data.success) {
        // 成功画面へ遷移
        window.location.href = `/success?id=${data.data.reservationId}`
      } else {
        alert(`エラー: ${data.error || '応募に失敗しました'}`)
      }
    } catch (error) {
      console.error('Reservation error:', error)
      alert('応募中にエラーが発生しました。もう一度お試しください。')
    }
  }
}

// アプリ初期化
const app = new ReservationApp()

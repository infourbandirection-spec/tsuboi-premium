// プレミアム商品券応募フォーム - 単一ページ形式

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
      store: '一畳屋ショールーム（熊本県熊本市中央区坪井5丁目2-27）',
      pickupDate: '',
      pickupTime: ''
    }
    this.systemStatus = null
    this.stores = []
    this.availablePickupDates = []
    this.availableTimeSlots = []
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
    await this.loadPickupDates()
    await this.loadPickupTimeSlots()
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

  async loadPickupDates() {
    try {
      const phase = this.currentPhase || 1
      const response = await fetch(`/api/pickup-dates?phase=${phase}`)
      const data = await response.json()
      if (data.success) {
        this.availablePickupDates = data.data || []
        console.log(`[App] Loaded ${this.availablePickupDates.length} pickup dates for phase ${phase}`)
      }
    } catch (error) {
      console.error('Pickup dates load error:', error)
      this.availablePickupDates = []
    }
  }

  async loadPickupTimeSlots() {
    try {
      const phase = this.currentPhase || 1
      const response = await fetch(`/api/pickup-time-slots?phase=${phase}`)
      const data = await response.json()
      if (data.success) {
        this.availableTimeSlots = data.data || []
        console.log(`[App] Loaded ${this.availableTimeSlots.length} time slots for phase ${phase}`)
      }
    } catch (error) {
      console.error('Pickup time slots load error:', error)
      this.availableTimeSlots = []
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
    const maxQuantity = Math.min(6, remaining)
    
    return `
      <div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
        <div class="max-w-4xl mx-auto">
          <!-- ヘッダー -->
          <div class="bg-white shadow-lg p-4 sm:p-6 mb-6">
            <div class="flex justify-between items-center gap-2">
              <div class="flex-1 min-w-0">
                <h1 class="text-base sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 flex items-start">
                  <i class="fas fa-ticket-alt text-blue-500 mr-1 sm:mr-2 mt-1 text-sm sm:text-base"></i>
                  <span class="leading-tight">
                    坪井繁栄会プレミアム商品券<br class="sm:hidden">
                    <span class="hidden sm:inline"> </span>
                    抽選・応募フォーム
                  </span>
                </h1>
                <p class="text-xs sm:text-sm text-gray-600 hidden sm:block">ご希望の商品券をご応募いただけます</p>
              </div>
              <button onclick="location.href='/lookup'" 
                      class="flex-shrink-0 px-3 sm:px-4 py-2 bg-purple-500 text-white hover:bg-purple-600 transition text-xs sm:text-sm whitespace-nowrap rounded">
                <i class="fas fa-search mr-1 sm:mr-2"></i><span>応募照会</span>
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

          <!-- 単一ページフォーム -->
          <div class="bg-white shadow-lg p-8">
            <form id="reservationForm" onsubmit="event.preventDefault(); app.submitToConfirmation()">
              
              <!-- 生年月日 -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-calendar-alt text-blue-500 mr-2"></i>
                  生年月日 <span class="text-red-500">*</span>
                </label>
                <input type="date" 
                       id="birthDate"
                       value="${this.formData.birthDate}"
                       max="${new Date().toISOString().split('T')[0]}"
                       class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hide-calendar-icon"
                       required>
                <p class="text-xs text-gray-500 mt-2">
                  <i class="fas fa-info-circle mr-1"></i>
                  未来の日付は選択できません
                </p>
              </div>

              <!-- 氏名・ふりがな -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-user text-blue-500 mr-2"></i>
                  氏名（フルネーム） <span class="text-red-500">*</span>
                </label>
                    <input type="text" 
                           id="fullName"
                           value="${this.escapeHtml(this.formData.fullName)}"
                           placeholder="例: 山田 太郎"
                           class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                           required>
              </div>

              <div class="mb-6">
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

              <!-- 連絡先 -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-phone text-blue-500 mr-2"></i>
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

              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-envelope text-blue-500 mr-2"></i>
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

              <!-- 冊数 -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-list-ol text-blue-500 mr-2"></i>
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

              <!-- 購入日時 -->
              <div class="mb-6">
                <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
                  <i class="fas fa-clock text-blue-500 mr-2"></i>
                  購入日時
                </h3>
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
                  <li>購入予定日を過ぎた場合は自動的にキャンセルされます</li>
                  <li>応募IDは必ず控えてください</li>
                  <li>お一人様1回限りの応募です</li>
                  <li><strong>必ずご本人様がお越しください</strong>（代理人不可）</li>
                  <li><strong>購入時に本人確認書類をご持参ください</strong></li>
                </ul>
              </div>
            </div>
          </div>

          <!-- ご利用に際しての注意 -->
          <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
            <div class="flex">
              <i class="fas fa-info-circle text-blue-500 mt-1 mr-3"></i>
              <div class="text-sm text-gray-700">
                <p class="font-bold mb-2">ご利用に際しての注意</p>
                <div class="space-y-1">
                  <p>●坪井繁栄会プレミアム付商品券は、坪井繁栄会（一部店舗を除く）でご利用いただけます。</p>
                  <p>●お釣銭は出ませんので本券額面以上のお支払いの際にご利用ください。</p>
                  <p>●一度ご購入いただいた坪井繁栄会プレミアム付商品券の返品及び現金とのお取替えはできません。</p>
                  <p>●坪井繁栄会プレミアム付商品券は次に該当するものにはご利用できません。</p>

                  <div class="mt-3">
                    <p class="font-bold mb-2 text-red-600">ご利用できないもの：</p>
                    <div class="space-y-1">
                      <p>①出資や債権の支払い（税金、振込手数料、電気・ガス・水道料金等）</p>
                      <p>②有価証券、ビール券・図書カード、切手、印紙、プリペイドカード等の換金性の高いものの購入</p>
                      <p>③たばこ事業法（昭和59年法律68号）第2号第1項第3号に規程する製造たばこの購入</p>
                      <p>④事業活動に伴って使用する原材料、機器及び仕入れ商品等の調達</p>
                      <p>⑤土地、家屋購入、家賃・地代・駐車料（一時預かりを除く）等の不動産に関わる支払い（但し同条第1項第1号から第3号に該当する営業を除く）</p>
                      <p>⑥自転車競技法（昭和23年法律第209号）第8条に規程する車券の購入</p>
                      <p>⑦特定の宗教・政治団体と関わるものや公序良俗に反するものへの支払い</p>
                      <p>⑧当該商品券の交換又は売買</p>
                      <p>⑨国地方公共団体への支払いや公共料金の支払い</p>
                      <p>⑩電子マネーへのチャージ</p>
                      <p>⑪医療費、調剤薬、介護保険等の保険適用に係る一部負担金の支払い</p>
                      <p>⑫その他、熊本市が商品券の使用対象として適当と認めないもの</p>
                    </div>
                  </div>

                  <p class="mt-3">●坪井繁栄会プレミアム付商品券の盗難、紛失または減失に対し、発行者では一切その責任を負いません。</p>
                  
                  <div class="bg-white border border-blue-300 p-2 mt-3">
                    <p class="font-bold text-blue-700">◆ご利用期間：令和8年5月31日まで</p>
                  </div>
                </div>
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
    // 購入日はAPIから動的に取得されるため、プレースホルダーを表示
    const pickupDates = this.availablePickupDates || []
    const timeSlots = this.availableTimeSlots || []

    return `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            購入日 <span class="text-red-500">*</span>
          </label>
          <select id="pickupDate"
                  class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required>
            <option value="">選択してください</option>
            ${pickupDates.length === 0 ? 
              '<option value="" disabled>読み込み中...</option>' :
              pickupDates.map(date => 
                `<option value="${date.pickup_date}" ${this.formData.pickupDate === date.pickup_date ? 'selected' : ''}>${date.display_label}</option>`
              ).join('')
            }
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            購入時間 <span class="text-red-500">*</span>
          </label>
          <select id="pickupTime"
                  class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required>
            <option value="">選択してください</option>
            ${timeSlots.length === 0 ?
              '<option value="" disabled>読み込み中...</option>' :
              timeSlots.map(time => 
                `<option value="${time.time_slot}" ${this.formData.pickupTime === time.time_slot ? 'selected' : ''}>${time.display_label}</option>`
              ).join('')
            }
          </select>
          <p class="mt-1 text-xs text-gray-500">※購入いただく目安時間です。多少前後されても問題ございません</p>
        </div>
      </div>
    `
  }

  renderPhase2PickupSection() {
    // Phase 2では管理者が設定した購入日を選択
    const pickupDates = this.availablePickupDates || []
    const timeSlots = this.availableTimeSlots || []

    return `
      <div class="space-y-4">
        <div class="bg-green-50 border border-green-200 p-4 mb-4">
          <p class="text-sm text-green-800">
            <i class="fas fa-info-circle mr-2"></i>
            <strong>Phase 2: 指定購入日選択期間（先着順）</strong><br>
            管理者が設定した購入日から選択できます
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            購入日 <span class="text-red-500">*</span>
          </label>
          <select id="pickupDate"
                  class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required>
            <option value="">選択してください</option>
            ${pickupDates.length === 0 ? 
              '<option value="" disabled>読み込み中...</option>' :
              pickupDates.map(date => 
                `<option value="${date.pickup_date}" ${this.formData.pickupDate === date.pickup_date ? 'selected' : ''}>${date.display_label}</option>`
              ).join('')
            }
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            購入時間 <span class="text-red-500">*</span>
          </label>
          <select id="pickupTime"
                  class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required>
            <option value="">選択してください</option>
            ${timeSlots.length === 0 ?
              '<option value="" disabled>読み込み中...</option>' :
              timeSlots.map(time => 
                `<option value="${time.time_slot}" ${this.formData.pickupTime === time.time_slot ? 'selected' : ''}>${time.display_label}</option>`
              ).join('')
            }
          </select>
          <p class="mt-1 text-xs text-gray-500">※購入いただく目安時間です。多少前後されても問題ございません</p>
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
                <p class="text-sm text-gray-600">購入店舗</p>
                <p class="text-lg font-medium">${this.escapeHtml(this.formData.store)}</p>
              </div>
              <div class="border-b pb-3">
                <p class="text-sm text-gray-600">購入日</p>
                <p class="text-lg font-medium">${this.escapeHtml(this.formData.pickupDate)}</p>
              </div>
              <div class="border-b pb-3">
                <p class="text-sm text-gray-600">購入時間</p>
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
      const response = await fetch('/api/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.formData)
      })

      const data = await response.json()

      if (data.success) {
        // 成功画面へ遷移（APIレスポンスは直接reservationIdを返す）
        window.location.href = `/success?id=${data.reservationId}`
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

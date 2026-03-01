// プレミアム商品券予約システム - メインアプリケーション

class ReservationApp {
  constructor() {
    this.currentStep = 1
    this.currentPhase = 1 // Default: Phase 1 (fixed dates)
    this.reservationEnabled = true
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
    return String(text).replace(/[<>&"'/]/g, (m) => map[m])
  }

  async init() {
    await this.loadSystemStatus()
    await this.loadStores()
    this.render()
    this.attachEventListeners()
  }

  async loadSystemStatus() {
    try {
      const response = await fetch('/api/status')
      const data = await response.json()
      if (data.success) {
        this.systemStatus = data.data
        this.currentPhase = data.data.currentPhase || 1
        this.reservationEnabled = data.data.reservationEnabled !== false
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
      return
    }

    app.innerHTML = this.renderReservationForm()
  }

  renderClosedView() {
    return `
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <i class="fas fa-exclamation-triangle text-6xl text-red-500 mb-4"></i>
          <h1 class="text-2xl font-bold text-gray-800 mb-4">予約受付終了</h1>
          <p class="text-gray-600 mb-4">
            申し訳ございません。<br>
            予約上限に達したため、現在受付を終了しております。
          </p>
          <div class="bg-gray-100 rounded p-4">
            <p class="text-sm text-gray-700">
              総予約数: <span class="font-bold">${this.systemStatus.totalReserved}</span> 冊<br>
              上限: <span class="font-bold">${this.systemStatus.maxTotal}</span> 冊
            </p>
          </div>
        </div>
      </div>
    `
  }

  renderReservationForm() {
    return `
      <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div class="max-w-4xl mx-auto">
          <!-- ヘッダー -->
          <div class="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
            <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
              <div class="flex-1">
                <h1 class="text-lg md:text-3xl font-bold text-gray-800 mb-1 md:mb-2">
                  <div class="flex items-center mb-1">
                    <i class="fas fa-ticket-alt text-blue-500 mr-2 text-base md:text-2xl"></i>
                    <span class="leading-tight">パスート24プレミアム商品券</span>
                  </div>
                  <div class="leading-tight pl-6 md:pl-8">
                    抽選・応募システム
                  </div>
                </h1>
                <p class="text-sm md:text-base text-gray-600">ご希望の商品券をご予約いただけます</p>
              </div>
              <!-- ボタンエリア -->
              <div class="flex gap-2 justify-end">
                <button onclick="location.href='/lookup'" 
                        class="px-3 py-2 md:px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center text-xs md:text-sm whitespace-nowrap">
                  <i class="fas fa-search mr-1 md:mr-2"></i>
                  予約照会
                </button>
              </div>
            </div>
          </div>

          <!-- システム状態 -->
          <div class="bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
            <div class="flex items-center justify-center">
              <div class="text-center">
                <p class="text-sm md:text-lg opacity-90 mb-1 md:mb-2">応募受付中</p>
                <p class="text-lg md:text-2xl font-bold">
                  <i class="fas fa-check-circle mr-2"></i>受付可能
                </p>
              </div>
            </div>
          </div>

          <!-- プログレスバー -->
          ${this.renderProgressBar()}

          <!-- フォーム -->
          <div class="bg-white rounded-lg shadow-lg p-6 md:p-8">
            ${this.renderCurrentStep()}
          </div>

          <!-- 注意事項 -->
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6 mb-4 rounded">
            <div class="flex">
              <i class="fas fa-exclamation-circle text-yellow-400 mt-1 mr-3"></i>
              <div class="text-sm text-gray-700">
                <p class="font-bold mb-2">重要な注意事項</p>
                <ul class="list-disc list-inside space-y-1">
                  <li>受け取り予定日を過ぎた場合は自動的にキャンセルされます</li>
                  <li>予約IDは必ず控えてください</li>
                  <li>お一人様1回限りの予約です</li>
                  <li>受け取り時間は混雑状況の目安です（時間を多少前後しても大丈夫です）</li>
                  <li><strong>必ずご本人様がお越しください</strong>（代理人不可）</li>
                  <li><strong>受け取り時に身分証明証をご持参ください</strong></li>
                </ul>
              </div>
            </div>
          </div>

          <!-- ご利用に際しての注意 -->
          <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded">
            <div class="flex">
              <i class="fas fa-info-circle text-blue-500 mt-1 mr-3"></i>
              <div class="text-sm text-gray-700">
                <p class="font-bold mb-2">ご利用に際しての注意</p>
                <div class="space-y-1">
                  <p>●パスート24プレミアム付商品券は、パスート24の立体駐車場および熊本市辛島公園地下駐車場でご利用いただけます。</p>
                  <p>●お釣銭は出ませんので本券額面以上のお支払いの際にご利用ください。</p>
                  <p>●一度ご購入いただいたパスート24プレミアム付商品券の返品及び現金とのお取替えはできません。</p>
                  <p>●パスート24プレミアム付商品券は次に該当するものにはご利用できません。</p>
                  <p>●パスート24プレミアム付商品券の盗難、紛失または減失に対し、発行者では一切その責任を負いません。</p>
                  
                  <div class="bg-white border border-blue-300 rounded p-2 mt-3">
                    <p class="font-bold text-blue-700">◆ご利用期間：令和8年5月31日まで</p>
                  </div>

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
                </div>
              </div>
            </div>
          </div>

          <!-- プライバシーポリシーリンク -->
          <div class="mt-4 text-center">
            <a href="/privacy" class="text-sm text-gray-600 hover:text-blue-600 underline">
              <i class="fas fa-shield-alt mr-1"></i>プライバシーポリシー
            </a>
          </div>
        </div>
      </div>
    `
  }

  renderProgressBar() {
    const steps = [
      { num: 1, label: '生年月日' },
      { num: 2, label: '氏名' },
      { num: 3, label: '連絡先' },
      { num: 4, label: '冊数' },
      { num: 5, label: '日時' },
      { num: 6, label: '確認' }
    ]

    return `
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div class="flex justify-between items-center">
          ${steps.map(step => `
            <div class="flex flex-col items-center flex-1">
              <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2
                          ${this.currentStep === step.num ? 'bg-blue-500 text-white' : 
                            this.currentStep > step.num ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}">
                ${this.currentStep > step.num ? '<i class="fas fa-check"></i>' : step.num}
              </div>
              <span class="text-xs text-gray-600 text-center hidden md:block">${step.label}</span>
            </div>
            ${step.num < 6 ? '<div class="flex-1 h-1 bg-gray-200 mx-2 mt-5"></div>' : ''}
          `).join('')}
        </div>
      </div>
    `
  }

  renderCurrentStep() {
    switch (this.currentStep) {
      case 1: return this.renderStep1()
      case 2: return this.renderStep2()
      case 3: return this.renderStep3()
      case 4: return this.renderStep4()
      case 5: return this.renderStep5()
      case 6: return this.renderStep6()
      default: return ''
    }
  }

  renderStep1() {
    return `
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-calendar-alt text-blue-500 mr-2"></i>
        生年月日を入力してください
      </h2>
      <div class="max-w-md">
        <label class="block text-sm font-medium text-gray-700 mb-2">生年月日 <span class="text-red-500 text-xs align-super">★</span></label>
        <input type="date" id="birthDate" 
               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               value="${this.formData.birthDate}"
               max="${new Date().toISOString().split('T')[0]}">
        <p class="mt-2 text-sm text-gray-500">
          <i class="fas fa-info-circle mr-1"></i>
          未来の日付は選択できません
        </p>
      </div>
      <div class="mt-8 flex justify-end">
        <button onclick="app.nextStep()" class="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold shadow-lg">
          次へ <i class="fas fa-arrow-right ml-2"></i>
        </button>
      </div>
    `
  }

  renderStep2() {
    return `
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-user text-blue-500 mr-2"></i>
        お名前を入力してください
      </h2>
      <div class="max-w-md space-y-6">
        <!-- 氏名（漢字） -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">氏名 <span class="text-red-500 text-xs align-super">★</span></label>
          <input type="text" id="fullName" 
                 class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 value="${this.formData.fullName}"
                 placeholder="例: 山田 太郎"
                 maxlength="50">
        </div>
        
        <!-- かな（ひらがな） -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">かな <span class="text-red-500 text-xs align-super">★</span></label>
          <input type="text" id="kana" 
                 class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 value="${this.formData.kana}"
                 placeholder="例: やまだ たろう"
                 maxlength="50">
        </div>
      </div>
      <div class="mt-8 flex justify-between">
        <button onclick="app.prevStep()" class="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-bold">
          <i class="fas fa-arrow-left mr-2"></i> 戻る
        </button>
        <button onclick="app.nextStep()" class="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold shadow-lg">
          次へ <i class="fas fa-arrow-right ml-2"></i>
        </button>
      </div>
    `
  }

  renderStep3() {
    return `
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-envelope text-blue-500 mr-2"></i>
        連絡先を入力してください
      </h2>
      <div class="max-w-md">
        <label class="block text-sm font-medium text-gray-700 mb-2">電話番号 <span class="text-red-500 text-xs align-super">★</span></label>
        <input type="tel" id="phoneNumber" 
               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               value="${this.formData.phoneNumber}"
               placeholder="例: 090-1234-5678"
               maxlength="13">
        <p class="mt-2 text-sm text-gray-500">
          <i class="fas fa-info-circle mr-1"></i>
          ハイフンは自動で挿入されます
        </p>
        
        <!-- メールアドレス入力 -->
        <label class="block text-sm font-medium text-gray-700 mb-2 mt-6">
          メールアドレス <span class="text-red-500 text-xs align-super">★</span>
        </label>
        <input type="email" id="email" required
               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               value="${this.formData.email || ''}"
               placeholder="例: example@email.com">
        <p class="mt-2 text-sm text-gray-500">
          <i class="fas fa-envelope mr-1"></i>
          入力いただくと、予約完了メールと抽選結果をメールでお知らせします
        </p>
      </div>
      <div class="mt-8 flex justify-between">
        <button onclick="app.prevStep()" class="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-bold">
          <i class="fas fa-arrow-left mr-2"></i> 戻る
        </button>
        <button onclick="app.nextStep()" class="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold shadow-lg">
          次へ <i class="fas fa-arrow-right ml-2"></i>
        </button>
      </div>
    `
  }

  renderStep4() {
    const maxQuantity = Math.min(6, this.systemStatus.remaining)
    return `
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-shopping-cart text-blue-500 mr-2"></i>
        購入希望冊数を選択してください
      </h2>
      <div class="max-w-md">
        <label class="block text-sm font-medium text-gray-700 mb-2">冊数（1～6冊） <span class="text-red-500 text-xs align-super">★</span></label>
        <select id="quantity" 
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          ${Array.from({ length: maxQuantity }, (_, i) => i + 1).map(num => `
            <option value="${num}" ${this.formData.quantity === num ? 'selected' : ''}>
              ${num}冊
            </option>
          `).join('')}
        </select>
        ${this.systemStatus.remaining < 6 ? `
          <div class="mt-4 bg-orange-100 border-l-4 border-orange-500 p-4 rounded">
            <p class="text-sm text-orange-700">
              <i class="fas fa-exclamation-triangle mr-2"></i>
              残り冊数が少なくなっています（残り ${this.systemStatus.remaining} 冊）
            </p>
          </div>
        ` : ''}
      </div>
      <div class="mt-8 flex justify-between">
        <button onclick="app.prevStep()" class="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-bold">
          <i class="fas fa-arrow-left mr-2"></i> 戻る
        </button>
        <button onclick="app.nextStep()" class="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold shadow-lg">
          次へ <i class="fas fa-arrow-right ml-2"></i>
        </button>
      </div>
    `
  }

  renderStep5() {
    // Phase 2 (自由日選択) の場合
    if (this.currentPhase === 2) {
      return this.renderStep5Phase2()
    }

    // Phase 1 (固定日) の場合
    // 固定の受け取り日（3月16日～18日）
    const pickupDates = [
      { value: '2026-03-16', label: '3月16日（月）' },
      { value: '2026-03-17', label: '3月17日（火）' },
      { value: '2026-03-18', label: '3月18日（水）' }
    ]

    // 固定の受け取り時間（7つの時間帯）
    const timeSlots = [
      '12:00～13:00',
      '13:00～14:00',
      '15:00～16:00',
      '16:00～17:00',
      '17:00～18:00',
      '18:00～19:00',
      '19:00～20:00'
    ]

    return `
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-calendar-check text-blue-500 mr-2"></i>
        受け取り日時を選択してください
      </h2>
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            受け取り日 <span class="text-red-500 text-xs align-super">★</span>
          </label>
          <select id="pickupDate" 
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">選択してください</option>
            ${pickupDates.map(date => `
              <option value="${date.value}" ${this.formData.pickupDate === date.value ? 'selected' : ''}>
                ${date.label}
              </option>
            `).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            受け取り時間 <span class="text-red-500 text-xs align-super">★</span>
            <span class="text-xs text-gray-500 ml-2">（混雑状況の目安）</span>
          </label>
          <select id="pickupTime" 
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">選択してください</option>
            ${timeSlots.map(slot => `
              <option value="${slot}" ${this.formData.pickupTime === slot ? 'selected' : ''}>
                ${slot}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
      
      <!-- 注意事項 -->
      <div class="mt-6 space-y-4">
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p class="text-sm text-blue-800 font-medium mb-2">
            <i class="fas fa-info-circle mr-2"></i>
            受け取り時間について
          </p>
          <p class="text-sm text-blue-700">
            選択された時間帯は混雑状況の目安です。できる限り取りに来られる時間を選択してください。時間を多少前後しても受け取り可能です。
          </p>
          <p class="text-sm text-blue-700 mt-2">
            <strong>営業時間内にお越しください：</strong><br>
            • <strong>coug</strong>：10:00〜20:00<br>
            • <strong>ANERCA&L.I.V</strong>：各店舗の営業時間に準じます
          </p>
        </div>
        
        <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p class="text-sm text-red-800 font-medium mb-2">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            自動キャンセルについて
          </p>
          <p class="text-sm text-red-700">
            受け取り予定日を過ぎた場合は、自動的にキャンセルされます。
          </p>
        </div>
        
        <div class="bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
          <p class="text-sm text-gray-800 font-medium mb-2">
            <i class="fas fa-map-marker-alt mr-2"></i>
            受け取り場所
          </p>
          <p class="text-sm text-gray-700 font-bold">
            株式会社パスート24
          </p>
          <p class="text-sm text-gray-600 mt-1">
            〒860-0802 熊本県熊本市中央区中央街4-29
          </p>
        </div>
        
        <div class="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
          <p class="text-sm text-orange-800 font-medium mb-2">
            <i class="fas fa-id-card mr-2"></i>
            受け取り時の本人確認
          </p>
          <ul class="text-sm text-orange-700 space-y-1 list-disc list-inside">
            <li><strong>必ずご本人様がお越しください</strong>（代理人不可）</li>
            <li><strong>身分証明証をご持参ください</strong>（運転免許証、マイナンバーカード等）</li>
          </ul>
        </div>
      </div>
      
      <div class="mt-8 flex justify-between">
        <button onclick="app.prevStep()" class="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-bold">
          <i class="fas fa-arrow-left mr-2"></i> 戻る
        </button>
        <button onclick="app.nextStep()" class="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold shadow-lg">
          次へ <i class="fas fa-arrow-right ml-2"></i>
        </button>
      </div>
    `
  }

  renderStep5Phase2() {
    // Phase 2: 予約当日から1週間以内のみ選択可能
    const today = new Date()
    const minDate = today.toISOString().split('T')[0] // 今日
    const maxDateObj = new Date(today)
    maxDateObj.setDate(maxDateObj.getDate() + 7) // 7日後
    const maxDate = maxDateObj.toISOString().split('T')[0]

    // 固定の受け取り時間（7つの時間帯）
    const timeSlots = [
      '12:00～13:00',
      '13:00～14:00',
      '15:00～16:00',
      '16:00～17:00',
      '17:00～18:00',
      '18:00～19:00',
      '19:00～20:00'
    ]

    return `
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-calendar-check text-blue-500 mr-2"></i>
        受け取り日時を選択してください
      </h2>
      
      <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
        <p class="text-sm text-green-800 font-medium mb-1">
          <i class="fas fa-check-circle mr-2"></i>
          Phase 2: 自由日選択期間
        </p>
        <p class="text-sm text-green-700">
          予約当日から1週間以内のご都合の良い日をカレンダーから自由に選択できます
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            受け取り日（予約当日から1週間以内） <span class="text-red-500 text-xs align-super">★</span>
          </label>
          <input 
            type="date" 
            id="pickupDate" 
            value="${this.formData.pickupDate}"
            min="${minDate}"
            max="${maxDate}"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            受け取り時間 <span class="text-red-500 text-xs align-super">★</span>
            <span class="text-xs text-gray-500 ml-2">（混雑状況の目安）</span>
          </label>
          <select id="pickupTime" 
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">選択してください</option>
            ${timeSlots.map(slot => `
              <option value="${slot}" ${this.formData.pickupTime === slot ? 'selected' : ''}>
                ${slot}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
      
      <!-- 注意事項 -->
      <div class="mt-6 space-y-4">
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p class="text-sm text-blue-800 font-medium mb-2">
            <i class="fas fa-info-circle mr-2"></i>
            受け取り時間について
          </p>
          <p class="text-sm text-blue-700">
            選択された時間帯は混雑状況の目安です。できる限り取りに来られる時間を選択してください。時間を多少前後しても受け取り可能です。
          </p>
          <p class="text-sm text-blue-700 mt-2">
            <strong>営業時間内にお越しください：</strong><br>
            • <strong>coug</strong>：10:00〜20:00<br>
            • <strong>ANERCA&L.I.V</strong>：各店舗の営業時間に準じます
          </p>
        </div>
        
        <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p class="text-sm text-red-800 font-medium mb-2">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            自動キャンセルについて
          </p>
          <p class="text-sm text-red-700">
            受け取り予定日を過ぎた場合は、自動的にキャンセルされます。
          </p>
        </div>
        
        <div class="bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
          <p class="text-sm text-gray-800 font-medium mb-2">
            <i class="fas fa-map-marker-alt mr-2"></i>
            受け取り場所
          </p>
          <p class="text-sm text-gray-700 font-bold">
            株式会社パスート24
          </p>
          <p class="text-sm text-gray-600 mt-1">
            〒860-0802 熊本県熊本市中央区中央街4-29
          </p>
        </div>
        
        <div class="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
          <p class="text-sm text-orange-800 font-medium mb-2">
            <i class="fas fa-id-card mr-2"></i>
            受け取り時の本人確認
          </p>
          <ul class="text-sm text-orange-700 space-y-1 list-disc list-inside">
            <li><strong>必ずご本人様がお越しください</strong>（代理人不可）</li>
            <li><strong>身分証明証をご持参ください</strong>（運転免許証、マイナンバーカード等）</li>
          </ul>
        </div>
      </div>
      
      <div class="mt-8 flex justify-between">
        <button onclick="app.prevStep()" class="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-bold">
          <i class="fas fa-arrow-left mr-2"></i> 戻る
        </button>
        <button onclick="app.nextStep()" class="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold shadow-lg">
          次へ <i class="fas fa-arrow-right ml-2"></i>
        </button>
      </div>
    `
  }

  renderStep6() {
    // Phase判定のための注意書きを生成
    const phaseNotice = this.currentPhase === 1 ? `
      <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-6">
        <p class="text-sm text-yellow-800 font-medium mb-2">
          <i class="fas fa-info-circle mr-2"></i>
          応募期間中（抽選対象）
        </p>
        <ul class="text-sm text-yellow-700 space-y-1 list-disc list-inside">
          <li><strong>この応募は抽選対象です</strong></li>
          <li>応募締切: 2026年3月10日 23:59</li>
          <li>抽選結果: 2026年3月11日に確定</li>
          <li>当選者のみ受け取りが可能です</li>
          <li>抽選結果は予約照会ページでご確認ください</li>
        </ul>
      </div>
    ` : `
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
        <p class="text-sm text-blue-800 font-medium mb-2">
          <i class="fas fa-info-circle mr-2"></i>
          通常予約（抽選後）
        </p>
        <ul class="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li><strong>この予約は抽選対象外です</strong></li>
          <li>予約完了後、すぐに受け取りが可能です</li>
          <li>残り冊数がなくなり次第、受付終了となります</li>
        </ul>
      </div>
    `;
    
    return `
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-check-circle text-blue-500 mr-2"></i>
        入力内容をご確認ください
      </h2>
      ${phaseNotice}
      <div class="space-y-4">
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-600 mb-1">生年月日</p>
          <p class="text-lg font-bold">${this.escapeHtml(this.formData.birthDate)}</p>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-600 mb-1">氏名</p>
          <p class="text-lg font-bold">${this.escapeHtml(this.formData.fullName)}</p>
          <p class="text-sm text-gray-500 mt-1">（${this.escapeHtml(this.formData.kana)}）</p>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-600 mb-1">電話番号</p>
          <p class="text-lg font-bold">${this.escapeHtml(this.formData.phoneNumber)}</p>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-600 mb-1">購入冊数</p>
          <p class="text-lg font-bold">${this.escapeHtml(String(this.formData.quantity))} 冊</p>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-600 mb-1">受け取り場所</p>
          <p class="text-lg font-bold">${this.escapeHtml(this.formData.store)}</p>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-600 mb-1">受け取り日時</p>
          <p class="text-lg font-bold">${this.escapeHtml(this.formData.pickupDate)} ${this.escapeHtml(this.formData.pickupTime)}</p>
        </div>
      </div>
      <div class="mt-8 flex justify-between">
        <button onclick="app.prevStep()" class="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-bold">
          <i class="fas fa-arrow-left mr-2"></i> 戻る
        </button>
        <button onclick="app.submitReservation()" id="submitBtn" 
                class="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold shadow-lg">
          <i class="fas fa-check mr-2"></i> 予約を確定する
        </button>
      </div>
    `
  }

  attachEventListeners() {
    // 電話番号の自動ハイフン挿入
    document.addEventListener('input', (e) => {
      if (e.target.id === 'phoneNumber') {
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

  nextStep() {
    // 入力値の取得と検証
    switch (this.currentStep) {
      case 1:
        const birthDate = document.getElementById('birthDate')?.value
        if (!birthDate) {
          alert('生年月日を入力してください')
          return
        }
        this.formData.birthDate = birthDate
        break
      case 2:
        const fullName = document.getElementById('fullName')?.value
        const kana = document.getElementById('kana')?.value
        if (!fullName || fullName.trim().length < 2) {
          alert('氏名を正しく入力してください')
          return
        }
        if (!kana || kana.trim().length < 2) {
          alert('かなを正しく入力してください')
          return
        }
        // ひらがなのみのチェック
        if (!/^[ぁ-んー\s]+$/.test(kana)) {
          alert('かなはひらがなで入力してください')
          return
        }
        this.formData.fullName = fullName.trim()
        this.formData.kana = kana.trim()
        break
      case 3:
        const phoneNumber = document.getElementById('phoneNumber')?.value
        const email = document.getElementById('email')?.value
        if (!phoneNumber || !/^0\d{1,4}-?\d{1,4}-?\d{4}$/.test(phoneNumber)) {
          alert('電話番号を正しく入力してください')
          return
        }
        // メールアドレスのバリデーション（必須）
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          alert('メールアドレスを正しく入力してください')
          return
        }
        this.formData.phoneNumber = phoneNumber
        this.formData.email = email
        break
      case 4:
        const quantity = parseInt(document.getElementById('quantity')?.value)
        if (!quantity || quantity < 1 || quantity > 6) {
          alert('冊数を選択してください')
          return
        }
        this.formData.quantity = quantity
        break
      case 5:
        const pickupDate = document.getElementById('pickupDate')?.value
        const pickupTime = document.getElementById('pickupTime')?.value
        if (!pickupDate || !pickupTime) {
          alert('受け取り日時を選択してください')
          return
        }
        this.formData.pickupDate = pickupDate
        this.formData.pickupTime = pickupTime
        break
    }

    this.currentStep++
    this.render()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  prevStep() {
    this.currentStep--
    this.render()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async submitReservation() {
    const submitBtn = document.getElementById('submitBtn')
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 処理中...'

    try {
      // CSRFトークン取得（セキュリティ対策）
      const csrfResponse = await fetch('/api/csrf-token')
      const csrfData = await csrfResponse.json()
      
      if (!csrfData.success || !csrfData.token) {
        throw new Error('セキュリティトークンの取得に失敗しました')
      }
      
      // 予約リクエスト送信
      const response = await fetch('/api/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.token
        },
        body: JSON.stringify(this.formData)
      })

      const data = await response.json()

      if (data.success) {
        this.showSuccessPage(data)
      } else {
        // 在庫不足エラーの場合は詳細を表示
        if (data.remainingBooks !== undefined) {
          this.showInventoryError(data)
        } else {
          alert(data.error || '予約に失敗しました')
          submitBtn.disabled = false
          submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i> 予約を確定する'
        }
      }
    } catch (error) {
      console.error('Reservation error:', error)
      alert('通信エラーが発生しました。もう一度お試しください。')
      submitBtn.disabled = false
      submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i> 予約を確定する'
    }
  }

  showInventoryError(data) {
    const app = document.getElementById('app')
    app.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
          <div class="text-center mb-8">
            <i class="fas fa-exclamation-triangle text-6xl text-red-500 mb-4"></i>
            <h1 class="text-3xl font-bold text-gray-800 mb-2">予約できませんでした</h1>
            <p class="text-gray-600">在庫状況が変更されました</p>
          </div>

          <div class="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg mb-6">
            <p class="font-bold text-red-800 mb-3">
              ${data.error}
            </p>
            <div class="text-sm text-red-700 space-y-2">
              <p>
                <i class="fas fa-info-circle mr-2"></i>
                現在の残り冊数: <span class="font-bold text-lg">${data.remainingBooks}冊</span>
              </p>
              ${data.requestedQuantity ? `
                <p>
                  <i class="fas fa-shopping-cart mr-2"></i>
                  ご希望の冊数: <span class="font-bold">${data.requestedQuantity}冊</span>
                </p>
              ` : ''}
            </div>
          </div>

          <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-6">
            <p class="text-sm text-blue-700">
              <i class="fas fa-lightbulb mr-2"></i>
              <strong>お手数ですが、以下の対応をお願いします：</strong>
            </p>
            <ul class="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
              ${data.remainingBooks > 0 ? `
                <li>冊数を${data.remainingBooks}冊以下に変更して再度お試しください</li>
              ` : `
                <li>申し訳ございません。予約受付を終了いたしました</li>
              `}
              <li>最新の在庫状況を確認してください</li>
            </ul>
          </div>

          <div class="flex gap-4">
            ${data.remainingBooks > 0 ? `
              <button onclick="location.reload()" 
                      class="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold">
                <i class="fas fa-redo mr-2"></i> 最初からやり直す
              </button>
            ` : `
              <button onclick="location.reload()" 
                      class="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-bold">
                <i class="fas fa-home mr-2"></i> トップに戻る
              </button>
            `}
          </div>
        </div>
      </div>
    `
  }

  showSuccessPage(data) {
    const app = document.getElementById('app')
    
    // Phase判定
    const isPhase1 = this.currentPhase === 1;
    const pageTitle = isPhase1 ? '応募が完了しました！' : '予約が完了しました！';
    const mainMessage = isPhase1 ? '以下の応募IDを大切に保管してください' : '以下の予約IDを大切に保管してください';
    const idLabel = isPhase1 ? 'Application ID' : 'Reservation ID';
    
    const phaseNotice = isPhase1 ? `
      <div class="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
        <div class="flex items-start">
          <i class="fas fa-exclamation-triangle text-yellow-500 text-3xl mr-4 mt-1"></i>
          <div>
            <h3 class="text-lg font-bold text-yellow-700 mb-2">
              抽選結果のお知らせ
            </h3>
            <p class="text-sm text-gray-700 mb-2">
              • この応募は<strong>抽選対象</strong>です<br>
              • 応募締切: <strong>2026年3月10日 23:59</strong><br>
              • 抽選結果: <strong>2026年3月11日</strong>に確定<br>
              • 当選された方のみ受け取りが可能です<br>
              • 抽選結果は<strong>予約照会ページ</strong>でご確認ください
            </p>
          </div>
        </div>
      </div>
    ` : '';
    
    app.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
          <div class="text-center mb-8">
            <i class="fas fa-check-circle text-6xl text-green-500 mb-4 animate-bounce"></i>
            <h1 class="text-3xl font-bold text-gray-800 mb-2">${pageTitle}</h1>
            <p class="text-gray-600">${mainMessage}</p>
          </div>

          <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-8 mb-6 text-center shadow-lg">
            <p class="text-sm mb-3 opacity-90 uppercase tracking-wide">${idLabel}</p>
            <p class="text-5xl font-bold tracking-widest mb-6 break-all" id="reservationId">${data.reservationId}</p>
            <button onclick="app.copyToClipboard('${data.reservationId}')" 
                    class="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 shadow-md transform hover:scale-105 transition">
              <i class="fas fa-copy mr-2"></i> ${isPhase1 ? '応募IDをコピー' : '予約IDをコピー'}
            </button>
          </div>
          
          ${phaseNotice}

          <div class="bg-red-50 border-2 border-red-400 rounded-lg p-6 mb-6">
            <div class="flex items-start">
              <i class="fas fa-camera text-red-500 text-3xl mr-4 mt-1"></i>
              <div>
                <h3 class="text-lg font-bold text-red-700 mb-2">
                  必ずスクリーンショットを保存してください
                </h3>
                <p class="text-sm text-gray-700 mb-2">
                  • 予約照会には<strong>電話番号</strong>と<strong>生年月日</strong>が必要です<br>
                  • 受け取り時に<strong>予約ID</strong>をご提示ください<br>
                  • この画面を閉じるとIDを確認できなくなります
                </p>
                <p class="text-xs text-gray-600 mt-3">
                  <i class="fas fa-info-circle mr-1"></i>
                  スクリーンショット方法: Windows（Win+Shift+S）/ Mac（Cmd+Shift+4）/ スマホ（電源+音量下）
                </p>
              </div>
            </div>
          </div>

          <div class="bg-gray-50 rounded-lg p-6 mb-6 space-y-3">
            <h2 class="font-bold text-lg mb-4 text-gray-800">
              <i class="fas fa-clipboard-list text-blue-500 mr-2"></i>
              予約内容
            </h2>
            <div class="flex justify-between py-2 border-b border-gray-200">
              <span class="text-gray-600">氏名</span>
              <span class="font-bold text-gray-800">${data.reservationDetails.name}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-gray-200">
              <span class="text-gray-600">冊数</span>
              <span class="font-bold text-gray-800">${data.reservationDetails.quantity} 冊</span>
            </div>
            <div class="flex justify-between py-2 border-b border-gray-200">
              <span class="text-gray-600">受け取り場所</span>
              <span class="font-bold text-gray-800">${data.reservationDetails.store}</span>
            </div>
            <div class="flex justify-between py-2">
              <span class="text-gray-600">受け取り日時</span>
              <span class="font-bold text-gray-800">${data.reservationDetails.pickupDateTime}</span>
            </div>
          </div>

          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p class="text-sm text-gray-700 mb-2">
              <i class="fas fa-clock text-yellow-500 mr-2"></i>
              <strong>受け取りについて</strong>
            </p>
            <ul class="text-sm text-gray-700 space-y-1 list-disc list-inside ml-4">
              <li>受け取り予定日を過ぎた場合は自動的にキャンセルされます</li>
              <li>受け取り時間は混雑状況の目安です（時間を多少前後しても大丈夫です）</li>
            </ul>
          </div>
          
          <div class="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
            <p class="text-sm text-orange-800 mb-2">
              <i class="fas fa-id-card text-orange-500 mr-2"></i>
              <strong>本人確認について</strong>
            </p>
            <ul class="text-sm text-orange-700 space-y-1 list-disc list-inside ml-4">
              <li><strong>必ずご本人様がお越しください</strong>（代理人不可）</li>
              <li><strong>身分証明証をご持参ください</strong>（運転免許証、マイナンバーカード等）</li>
            </ul>
          </div>

          <div class="flex gap-4">
            <button onclick="window.print()" 
                    class="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold transition">
              <i class="fas fa-print mr-2"></i> 印刷する
            </button>
            <button onclick="location.href='/lookup'" 
                    class="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-bold transition">
              <i class="fas fa-search mr-2"></i> 予約照会
            </button>
            <button onclick="location.reload()" 
                    class="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold transition">
              <i class="fas fa-home mr-2"></i> トップ
            </button>
          </div>
        </div>
      </div>
    `
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      alert('予約IDをコピーしました')
    }).catch(err => {
      console.error('Copy failed:', err)
    })
  }

  showAdminLogin() {
    const app = document.getElementById('app')
    app.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <div class="text-center mb-8">
            <i class="fas fa-user-shield text-6xl text-blue-600 mb-4"></i>
            <h1 class="text-3xl font-bold text-gray-800 mb-2">管理者ログイン</h1>
            <p class="text-gray-600">IDとパスワードを入力してください</p>
          </div>

          <div id="loginError" class="hidden mb-4 bg-red-100 border-l-4 border-red-500 p-4 rounded">
            <p class="text-sm text-red-700">
              <i class="fas fa-exclamation-circle mr-2"></i>
              <span id="loginErrorText"></span>
            </p>
          </div>

          <form onsubmit="app.handleAdminLogin(event)" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-user mr-2"></i>ユーザーID
              </label>
              <input type="text" id="adminUsername" 
                     class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     placeholder="ユーザーIDを入力"
                     autocomplete="username"
                     required>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-lock mr-2"></i>パスワード
              </label>
              <input type="password" id="adminPassword" 
                     class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     placeholder="パスワードを入力"
                     autocomplete="current-password"
                     required>
            </div>

            <button type="submit" id="loginBtn"
                    class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg transition">
              <i class="fas fa-sign-in-alt mr-2"></i> ログイン
            </button>

            <button type="button" onclick="location.reload()"
                    class="w-full px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-bold transition">
              <i class="fas fa-arrow-left mr-2"></i> トップに戻る
            </button>
          </form>
        </div>
      </div>
    `
  }

  async handleAdminLogin(event) {
    event.preventDefault()
    
    const loginBtn = document.getElementById('loginBtn')
    const usernameInput = document.getElementById('adminUsername')
    const passwordInput = document.getElementById('adminPassword')
    const errorDiv = document.getElementById('loginError')
    const errorText = document.getElementById('loginErrorText')
    
    loginBtn.disabled = true
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 認証中...'
    errorDiv.classList.add('hidden')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: usernameInput.value,
          password: passwordInput.value
        })
      })

      const data = await response.json()

      if (data.success) {
        // トークンとユーザー名をlocalStorageに保存
        localStorage.setItem('adminToken', data.token)
        localStorage.setItem('adminUsername', data.username)
        
        // 管理画面にリダイレクト
        window.location.href = '/admin'
      } else {
        errorText.textContent = data.error || 'ログインに失敗しました'
        errorDiv.classList.remove('hidden')
        loginBtn.disabled = false
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> ログイン'
      }
    } catch (error) {
      console.error('Login error:', error)
      errorText.textContent = '通信エラーが発生しました。もう一度お試しください。'
      errorDiv.classList.remove('hidden')
      loginBtn.disabled = false
      loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> ログイン'
    }
  }
}

// アプリケーション初期化
let app
document.addEventListener('DOMContentLoaded', () => {
  app = new ReservationApp()
})

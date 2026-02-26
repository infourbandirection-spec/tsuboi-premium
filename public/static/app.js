// プレミアム商品券予約システム - メインアプリケーション

class ReservationApp {
  constructor() {
    this.currentStep = 1
    this.formData = {
      birthDate: '',
      fullName: '',
      phoneNumber: '',
      quantity: 1,
      store: '',
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
          <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div class="flex justify-between items-start">
              <div>
                <h1 class="text-3xl font-bold text-gray-800 mb-2 flex items-center">
                  <i class="fas fa-ticket-alt text-blue-500 mr-3"></i>
                  プレミアム商品券予約システム
                </h1>
                <p class="text-gray-600">ご希望の商品券をご予約いただけます</p>
              </div>
              <!-- 管理者ボタン -->
              <button onclick="app.showAdminLogin()" 
                      class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition flex items-center text-sm">
                <i class="fas fa-user-shield mr-2"></i>
                管理者
              </button>
            </div>
          </div>

          <!-- システム状態 -->
          <div class="bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-lg shadow-lg p-6 mb-6">
            <div class="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p class="text-sm opacity-90">予約受付中</p>
                <p class="text-2xl font-bold">
                  残り ${this.systemStatus.remaining} 冊
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm opacity-90">予約済み</p>
                <p class="text-xl font-bold">
                  ${this.systemStatus.totalReserved} / ${this.systemStatus.maxTotal} 冊
                </p>
              </div>
            </div>
            <div class="mt-4 bg-white bg-opacity-20 rounded-full h-3">
              <div class="bg-white rounded-full h-3 transition-all duration-500" 
                   style="width: ${(this.systemStatus.totalReserved / this.systemStatus.maxTotal * 100).toFixed(1)}%">
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
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6 rounded">
            <div class="flex">
              <i class="fas fa-exclamation-circle text-yellow-400 mt-1 mr-3"></i>
              <div class="text-sm text-gray-700">
                <p class="font-bold mb-2">重要な注意事項</p>
                <ul class="list-disc list-inside space-y-1">
                  <li>受け取り時間は厳守してください</li>
                  <li>予約IDは必ず控えてください</li>
                  <li>お一人様1回限りの予約です</li>
                  <li>指定時間を1時間以上過ぎた場合、自動的にキャンセルされます</li>
                </ul>
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
      { num: 3, label: '電話番号' },
      { num: 4, label: '冊数' },
      { num: 5, label: '店舗' },
      { num: 6, label: '日時' },
      { num: 7, label: '確認' }
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
            ${step.num < 7 ? '<div class="flex-1 h-1 bg-gray-200 mx-2 mt-5"></div>' : ''}
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
      case 7: return this.renderStep7()
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
        <label class="block text-sm font-medium text-gray-700 mb-2">生年月日</label>
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
      <div class="max-w-md">
        <label class="block text-sm font-medium text-gray-700 mb-2">氏名（フルネーム）</label>
        <input type="text" id="fullName" 
               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               value="${this.formData.fullName}"
               placeholder="例: 山田 太郎"
               maxlength="50">
        <p class="mt-2 text-sm text-gray-500">
          <i class="fas fa-info-circle mr-1"></i>
          姓名の間にスペースを入れてください
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

  renderStep3() {
    return `
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-phone text-blue-500 mr-2"></i>
        電話番号を入力してください
      </h2>
      <div class="max-w-md">
        <label class="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
        <input type="tel" id="phoneNumber" 
               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               value="${this.formData.phoneNumber}"
               placeholder="例: 090-1234-5678"
               maxlength="13">
        <p class="mt-2 text-sm text-gray-500">
          <i class="fas fa-info-circle mr-1"></i>
          ハイフンは自動で挿入されます
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
        <label class="block text-sm font-medium text-gray-700 mb-2">冊数（1～6冊）</label>
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
    return `
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-map-marker-alt text-blue-500 mr-2"></i>
        受け取り店舗を選択してください
      </h2>
      <div class="space-y-4">
        ${this.stores.map(store => `
          <div class="border border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition cursor-pointer store-option
                      ${this.formData.store === store.store_name ? 'border-blue-500 bg-blue-50' : ''}"
               onclick="app.selectStore('${store.store_name}')">
            <div class="flex items-start">
              <input type="radio" name="store" value="${store.store_name}" 
                     ${this.formData.store === store.store_name ? 'checked' : ''}
                     class="mt-1 mr-3">
              <div class="flex-1">
                <h3 class="font-bold text-lg text-gray-800">${store.store_name}</h3>
                <p class="text-sm text-gray-600 mt-1">
                  <i class="fas fa-map-marker-alt mr-1"></i> ${store.address}
                </p>
                <p class="text-sm text-gray-600">
                  <i class="fas fa-clock mr-1"></i> ${store.business_hours}
                </p>
                ${store.phone ? `
                  <p class="text-sm text-gray-600">
                    <i class="fas fa-phone mr-1"></i> ${store.phone}
                  </p>
                ` : ''}
              </div>
            </div>
          </div>
        `).join('')}
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
    const today = new Date()
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      dates.push(date)
    }

    const timeSlots = [
      '10:00～11:00', '11:00～12:00', '12:00～13:00',
      '13:00～14:00', '14:00～15:00', '15:00～16:00',
      '16:00～17:00', '17:00～18:00', '18:00～19:00', '19:00～20:00'
    ]

    return `
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-calendar-check text-blue-500 mr-2"></i>
        受け取り日時を選択してください
      </h2>
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">受け取り日</label>
          <select id="pickupDate" 
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">選択してください</option>
            ${dates.map(date => {
              const dateStr = date.toISOString().split('T')[0]
              const dayNames = ['日', '月', '火', '水', '木', '金', '土']
              const dayName = dayNames[date.getDay()]
              return `
                <option value="${dateStr}" ${this.formData.pickupDate === dateStr ? 'selected' : ''}>
                  ${date.getMonth() + 1}月${date.getDate()}日（${dayName}）
                </option>
              `
            }).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">受け取り時間</label>
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
      <div class="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <p class="text-sm text-blue-700">
          <i class="fas fa-info-circle mr-2"></i>
          指定時間を1時間以上過ぎた場合、自動的にキャンセルされます
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

  renderStep7() {
    return `
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-check-circle text-blue-500 mr-2"></i>
        入力内容をご確認ください
      </h2>
      <div class="space-y-4">
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-600 mb-1">生年月日</p>
          <p class="text-lg font-bold">${this.escapeHtml(this.formData.birthDate)}</p>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-600 mb-1">氏名</p>
          <p class="text-lg font-bold">${this.escapeHtml(this.formData.fullName)}</p>
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
          <p class="text-sm text-gray-600 mb-1">受け取り店舗</p>
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

  selectStore(storeName) {
    this.formData.store = storeName
    this.render()
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
        if (!fullName || fullName.trim().length < 2) {
          alert('氏名を正しく入力してください')
          return
        }
        this.formData.fullName = fullName.trim()
        break
      case 3:
        const phoneNumber = document.getElementById('phoneNumber')?.value
        if (!phoneNumber || !/^0\d{1,4}-?\d{1,4}-?\d{4}$/.test(phoneNumber)) {
          alert('電話番号を正しく入力してください')
          return
        }
        this.formData.phoneNumber = phoneNumber
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
        if (!this.formData.store) {
          alert('受け取り店舗を選択してください')
          return
        }
        break
      case 6:
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
    app.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
          <div class="text-center mb-8">
            <i class="fas fa-check-circle text-6xl text-green-500 mb-4"></i>
            <h1 class="text-3xl font-bold text-gray-800 mb-2">予約が完了しました！</h1>
            <p class="text-gray-600">以下の予約IDを必ず控えてください</p>
          </div>

          <div class="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg p-6 mb-6 text-center">
            <p class="text-sm mb-2 opacity-90">予約ID</p>
            <p class="text-4xl font-bold tracking-wider mb-4" id="reservationId">${data.reservationId}</p>
            <button onclick="app.copyToClipboard('${data.reservationId}')" 
                    class="bg-white text-blue-500 px-6 py-2 rounded-lg font-bold hover:bg-gray-100">
              <i class="fas fa-copy mr-2"></i> コピーする
            </button>
          </div>

          <div class="bg-gray-50 rounded-lg p-6 mb-6 space-y-3">
            <h2 class="font-bold text-lg mb-4">予約内容</h2>
            <div class="flex justify-between">
              <span class="text-gray-600">氏名</span>
              <span class="font-bold">${data.reservationDetails.name}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">冊数</span>
              <span class="font-bold">${data.reservationDetails.quantity} 冊</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">店舗</span>
              <span class="font-bold">${data.reservationDetails.store}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">受け取り日時</span>
              <span class="font-bold">${data.reservationDetails.pickupDateTime}</span>
            </div>
          </div>

          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p class="text-sm text-gray-700">
              <i class="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
              <strong>重要：</strong>このページをスクリーンショットで保存してください。<br>
              受け取り時に予約IDが必要です。
            </p>
          </div>

          <div class="flex gap-4">
            <button onclick="window.print()" 
                    class="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold">
              <i class="fas fa-print mr-2"></i> 印刷する
            </button>
            <button onclick="location.reload()" 
                    class="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold">
              <i class="fas fa-home mr-2"></i> トップに戻る
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
            <p class="text-gray-600">パスワードを入力してください</p>
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
                <i class="fas fa-lock mr-2"></i>パスワード
              </label>
              <input type="password" id="adminPassword" 
                     class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     placeholder="パスワードを入力"
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

          <div class="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p class="text-sm text-blue-700">
              <i class="fas fa-info-circle mr-2"></i>
              <strong>開発環境のデフォルトパスワード:</strong> admin123
            </p>
          </div>
        </div>
      </div>
    `
  }

  async handleAdminLogin(event) {
    event.preventDefault()
    
    const loginBtn = document.getElementById('loginBtn')
    const passwordInput = document.getElementById('adminPassword')
    const errorDiv = document.getElementById('loginError')
    const errorText = document.getElementById('loginErrorText')
    
    loginBtn.disabled = true
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 認証中...'
    errorDiv.classList.add('hidden')

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: passwordInput.value
        })
      })

      const data = await response.json()

      if (data.success) {
        // トークンをlocalStorageに保存
        localStorage.setItem('adminToken', data.token)
        
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

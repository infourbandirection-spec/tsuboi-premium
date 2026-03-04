// タブ切り替え
function switchTab(tab) {
  // タブボタンのスタイル更新
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active', 'border-blue-600', 'text-blue-600')
    btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300')
  })
  
  const activeBtn = document.getElementById(`tab-${tab}`)
  activeBtn.classList.add('active', 'border-blue-600', 'text-blue-600')
  activeBtn.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300')
  
  // コンテンツの表示切り替え
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden')
  })
  document.getElementById(`content-${tab}`).classList.remove('hidden')
  
  // 結果エリアをクリア
  document.getElementById('result-area').classList.add('hidden')
  document.getElementById('result-area').innerHTML = ''
}

// 応募IDで照会
document.getElementById('form-id').addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const reservationId = document.getElementById('input-reservation-id').value.trim()
  
  if (!reservationId) {
    showError('応募IDを入力してください')
    return
  }
  
  try {
    const response = await fetch('/api/reservation/lookup/id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId })
    })
    
    const data = await response.json()
    
    if (data.success) {
      showReservation(data.reservation)
    } else {
      showError(data.error || '応募が見つかりませんでした')
    }
  } catch (error) {
    console.error('Lookup error:', error)
    showError('システムエラーが発生しました')
  }
})

// 生年月日・電話番号で照会
document.getElementById('form-birthdate').addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const birthDate = document.getElementById('input-birth-date').value
  const phoneNumber = document.getElementById('input-phone-number').value.trim()
  
  if (!birthDate || !phoneNumber) {
    showError('生年月日と電話番号を入力してください')
    return
  }
  
  try {
    const response = await fetch('/api/reservation/lookup/birthdate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthDate, phoneNumber })
    })
    
    const data = await response.json()
    
    if (data.success) {
      if (data.reservations.length === 1) {
        showReservation(data.reservations[0])
      } else {
        showMultipleReservations(data.reservations)
      }
    } else {
      showError(data.error || '応募が見つかりませんでした')
    }
  } catch (error) {
    console.error('Lookup error:', error)
    showError('システムエラーが発生しました')
  }
})

// 応募情報表示（単一）
function showReservation(reservation) {
  const resultArea = document.getElementById('result-area')
  
  // ステータスバッジ
  let statusBadge = ''
  if (reservation.status === 'reserved') {
    statusBadge = '<span class="px-3 py-1 bg-gray-100 text-gray-800 border border-gray-300 rounded-full text-sm font-semibold"><i class="fas fa-clock mr-1"></i> 応募済み（未購入）</span>'
  } else if (reservation.status === 'picked_up') {
    statusBadge = '<span class="px-3 py-1 bg-green-100 text-green-800 border border-green-300 rounded-full text-sm font-semibold"><i class="fas fa-check mr-1"></i> 購入完了</span>'
  } else if (reservation.status === 'canceled') {
    statusBadge = '<span class="px-3 py-1 bg-red-100 text-red-800 border border-red-300 rounded-full text-sm font-semibold"><i class="fas fa-times mr-1"></i> キャンセル済み</span>'
  }
  
  // 抽選結果バッジ
  let lotteryBadge = ''
  if (reservation.reservation_phase === 1) {
    if (reservation.lottery_status === 'won') {
      lotteryBadge = '<span class="px-3 py-1 bg-green-100 text-green-800 border border-green-300 rounded-full text-sm font-semibold"><i class="fas fa-check-circle mr-1"></i> 当選</span>'
    } else if (reservation.lottery_status === 'lost') {
      lotteryBadge = '<span class="px-3 py-1 bg-red-100 text-red-800 border border-red-300 rounded-full text-sm font-semibold"><i class="fas fa-times-circle mr-1"></i> 落選</span>'
    } else {
      lotteryBadge = '<span class="px-3 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-full text-sm font-semibold"><i class="fas fa-hourglass-half mr-1"></i> 抽選前</span>'
    }
  } else {
    lotteryBadge = '<span class="px-3 py-1 bg-blue-100 text-blue-800 border border-blue-300 rounded-full text-sm font-semibold"><i class="fas fa-bolt mr-1"></i> Phase 2（先着順）</span>'
  }
  
  resultArea.innerHTML = `
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="border-b border-gray-200 pb-4 mb-4">
        <h2 class="text-xl font-bold text-gray-900 mb-2">
          <i class="fas fa-file-alt mr-2 text-blue-600"></i>
          応募詳細
        </h2>
        <div class="flex flex-wrap gap-2">
          ${statusBadge}
          ${lotteryBadge}
        </div>
      </div>
      
      <div class="space-y-4">
        <div class="flex items-start">
          <div class="w-32 text-sm font-medium text-gray-500">
            <i class="fas fa-id-card mr-2"></i>応募ID
          </div>
          <div class="flex-1 text-gray-900 font-mono">${reservation.reservation_id}</div>
        </div>
        
        <div class="flex items-start">
          <div class="w-32 text-sm font-medium text-gray-500">
            <i class="fas fa-book mr-2"></i>冊数
          </div>
          <div class="flex-1 text-gray-900 font-semibold">${reservation.quantity} 冊</div>
        </div>
        
        <div class="flex items-start">
          <div class="w-32 text-sm font-medium text-gray-500">
            <i class="fas fa-calendar mr-2"></i>購入日時
          </div>
          <div class="flex-1 text-gray-900">
            ${reservation.pickup_date}<br>
            ${reservation.pickup_time_slot}
          </div>
        </div>
        
        <div class="flex items-start">
          <div class="w-32 text-sm font-medium text-gray-500">
            <i class="fas fa-clock mr-2"></i>応募日時
          </div>
          <div class="flex-1 text-gray-900">${new Date(reservation.created_at).toLocaleString('ja-JP')}</div>
        </div>
      </div>
      
      ${reservation.lottery_status === 'won' ? `
        <div class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p class="text-green-800">
            <i class="fas fa-check-circle mr-2"></i>
            <strong>当選おめでとうございます！</strong><br>
            指定の日時に店舗でお購入ください。
          </p>
        </div>
      ` : ''}
      
      ${reservation.lottery_status === 'lost' ? `
        <div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-red-800">
            <i class="fas fa-times-circle mr-2"></i>
            <strong>誠に申し訳ございません。</strong><br>
            今回の抽選では落選となりました。
          </p>
        </div>
      ` : ''}
    </div>
  `
  
  resultArea.classList.remove('hidden')
}

// 複数応募情報表示
function showMultipleReservations(reservations) {
  const resultArea = document.getElementById('result-area')
  
  const reservationList = reservations.map(r => {
    let statusBadge = ''
    if (r.status === 'reserved') {
      statusBadge = '<span class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">応募済み</span>'
    } else if (r.status === 'picked_up') {
      statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">購入完了</span>'
    }
    
    let lotteryBadge = ''
    if (r.reservationPhase === 1) {
      if (r.lotteryStatus === 'won') {
        lotteryBadge = '<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">当選</span>'
      } else if (r.lotteryStatus === 'lost') {
        lotteryBadge = '<span class="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">落選</span>'
      } else {
        lotteryBadge = '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">抽選前</span>'
      }
    } else {
      lotteryBadge = '<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Phase 2</span>'
    }
    
    return `
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition">
        <div class="flex justify-between items-start mb-2">
          <div class="font-mono text-sm text-gray-900">${r.id}</div>
          <div class="flex gap-1">
            ${statusBadge}
            ${lotteryBadge}
          </div>
        </div>
        <div class="text-sm text-gray-600">
          <i class="fas fa-book mr-1"></i> ${r.quantity}冊 | 
          <i class="fas fa-calendar mr-1"></i> ${r.pickupDate} ${r.pickupTimeSlot}
        </div>
        <div class="text-sm text-gray-600">
          <i class="fas fa-map-marker-alt mr-1"></i> ${r.storeLocation}
        </div>
      </div>
    `
  }).join('')
  
  resultArea.innerHTML = `
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-bold text-gray-900 mb-4">
        <i class="fas fa-list mr-2 text-blue-600"></i>
        ${reservations.length}件の応募が見つかりました
      </h2>
      <div class="space-y-3">
        ${reservationList}
      </div>
    </div>
  `
  
  resultArea.classList.remove('hidden')
}

// エラー表示
function showError(message) {
  const resultArea = document.getElementById('result-area')
  resultArea.innerHTML = `
    <div class="bg-red-50 border border-red-200 rounded-lg p-6">
      <p class="text-red-800">
        <i class="fas fa-exclamation-circle mr-2"></i>
        ${message}
      </p>
    </div>
  `
  resultArea.classList.remove('hidden')
}

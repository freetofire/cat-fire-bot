// Withdrawal System
let withdrawalMethods = []
let withdrawalHistory = []
let withdrawalSettings = {}

// Declare variables
let db
let currentUser
let firebase
let getCurrentUserData
let updateUserBalance
let logTransaction
let sendTelegramNotification

// Initialize withdrawal system
async function initWithdrawals() {
  await loadWithdrawalSettings()
  await loadWithdrawalMethods()
  await loadWithdrawalHistory()
  await loadTopWithdrawers()
  renderWithdrawalMethods()
  renderWithdrawalHistory()
  setupWithdrawalForm()
}

// Load withdrawal settings
async function loadWithdrawalSettings() {
  try {
    const settingsDoc = await db.collection("settings").doc("withdrawals").get()
    withdrawalSettings = settingsDoc.exists
      ? settingsDoc.data()
      : {
          minWithdrawal: 1.0,
          maxWithdrawal: 100.0,
          processingTime: "24-48 hours",
        }

    // Update UI
    const minEl = document.getElementById("min-withdrawal")
    if (minEl) {
      minEl.textContent = withdrawalSettings.minWithdrawal.toFixed(2)
    }

    console.log("[v0] Withdrawal settings loaded:", withdrawalSettings)
  } catch (error) {
    console.error("[v0] Error loading withdrawal settings:", error)
  }
}

// Load withdrawal methods
async function loadWithdrawalMethods() {
  try {
    const methodsSnapshot = await db.collection("withdrawalMethods").where("active", "==", true).get()

    withdrawalMethods = methodsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log("[v0] Loaded withdrawal methods:", withdrawalMethods.length)
  } catch (error) {
    console.error("[v0] Error loading withdrawal methods:", error)
  }
}

// Load withdrawal history
async function loadWithdrawalHistory() {
  try {
    if (!currentUser) return

    const historySnapshot = await db
      .collection("withdrawals")
      .where("userId", "==", currentUser.uid)
      .orderBy("timestamp", "desc")
      .limit(20)
      .get()

    withdrawalHistory = historySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log("[v0] Loaded withdrawal history:", withdrawalHistory.length)
  } catch (error) {
    console.error("[v0] Error loading withdrawal history:", error)
  }
}

// Load top withdrawers
async function loadTopWithdrawers() {
  try {
    const topWithdrawersSnapshot = await db
      .collection("withdrawals")
      .where("status", "==", "completed")
      .orderBy("amount", "desc")
      .limit(10)
      .get()

    const topWithdrawers = []
    const userCache = new Map()

    for (const doc of topWithdrawersSnapshot.docs) {
      const withdrawal = doc.data()

      // Get user data
      let userData
      if (userCache.has(withdrawal.userId)) {
        userData = userCache.get(withdrawal.userId)
      } else {
        const userDoc = await db.collection("users").doc(withdrawal.userId).get()
        userData = userDoc.exists ? userDoc.data() : null
        userCache.set(withdrawal.userId, userData)
      }

      if (userData) {
        topWithdrawers.push({
          name: `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "User",
          amount: withdrawal.amount,
          date: withdrawal.timestamp,
        })
      }
    }

    renderTopWithdrawers(topWithdrawers)
  } catch (error) {
    console.error("[v0] Error loading top withdrawers:", error)
  }
}

// Render withdrawal methods
function renderWithdrawalMethods() {
  const container = document.getElementById("withdrawal-methods")
  if (!container) return

  container.innerHTML = ""

  withdrawalMethods.forEach((method) => {
    const card = document.createElement("div")
    card.className = "withdrawal-method-card"
    card.onclick = () => selectWithdrawalMethod(method.id)

    card.innerHTML = `
      <div class="method-icon">
        <img src="${method.icon || "/placeholder.svg?height=40&width=40"}" alt="${method.name}">
      </div>
      <div class="method-info">
        <h4>${method.name}</h4>
        <p>${method.description || ""}</p>
      </div>
    `

    container.appendChild(card)
  })
}

// Render withdrawal history
function renderWithdrawalHistory() {
  const container = document.getElementById("withdrawal-history-list")
  if (!container) return

  container.innerHTML = ""

  if (withdrawalHistory.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No withdrawal history yet.</p>
      </div>
    `
    return
  }

  withdrawalHistory.forEach((withdrawal) => {
    const card = createWithdrawalHistoryCard(withdrawal)
    container.appendChild(card)
  })
}

// Create withdrawal history card
function createWithdrawalHistoryCard(withdrawal) {
  const card = document.createElement("div")
  card.className = "withdrawal-history-card"

  const date = withdrawal.timestamp ? new Date(withdrawal.timestamp.toDate()).toLocaleDateString() : "N/A"

  const statusClass =
    {
      pending: "status-pending",
      processing: "status-processing",
      completed: "status-completed",
      rejected: "status-rejected",
    }[withdrawal.status] || "status-pending"

  card.innerHTML = `
    <div class="withdrawal-details">
      <h4>$${withdrawal.amount.toFixed(2)}</h4>
      <p>${withdrawal.method}</p>
      <p class="withdrawal-date">${date}</p>
    </div>
    <div class="withdrawal-status">
      <span class="status-badge ${statusClass}">${withdrawal.status}</span>
    </div>
  `

  return card
}

// Render top withdrawers
function renderTopWithdrawers(topWithdrawers) {
  const container = document.getElementById("top-withdrawers-list")
  if (!container) return

  container.innerHTML = ""

  topWithdrawers.forEach((withdrawer, index) => {
    const item = document.createElement("div")
    item.className = "top-withdrawer-item"

    const date = withdrawer.date ? new Date(withdrawer.date.toDate()).toLocaleDateString() : "N/A"

    item.innerHTML = `
      <div class="withdrawer-rank">#${index + 1}</div>
      <div class="withdrawer-info">
        <h4>${withdrawer.name}</h4>
        <p>${date}</p>
      </div>
      <div class="withdrawer-amount">$${withdrawer.amount.toFixed(2)}</div>
    `

    container.appendChild(item)
  })
}

// Select withdrawal method
function selectWithdrawalMethod(methodId) {
  const methodSelect = document.getElementById("withdrawal-method")
  if (methodSelect) {
    methodSelect.value = methodId
  }
}

// Setup withdrawal form
function setupWithdrawalForm() {
  const form = document.getElementById("withdrawal-form")
  if (!form) return

  form.addEventListener("submit", handleWithdrawalSubmit)
}

// Handle withdrawal submission
async function handleWithdrawalSubmit(e) {
  e.preventDefault()

  const methodId = document.getElementById("withdrawal-method").value
  const amount = Number.parseFloat(document.getElementById("withdrawal-amount").value)
  const account = document.getElementById("withdrawal-account").value

  if (!methodId || !amount || !account) {
    alert("Please fill in all fields.")
    return
  }

  // Validate amount
  if (amount < withdrawalSettings.minWithdrawal) {
    alert(`Minimum withdrawal amount is $${withdrawalSettings.minWithdrawal}`)
    return
  }

  if (amount > withdrawalSettings.maxWithdrawal) {
    alert(`Maximum withdrawal amount is $${withdrawalSettings.maxWithdrawal}`)
    return
  }

  // Check user balance
  const userData = await getCurrentUserData(currentUser.uid)
  if (!userData || userData.balance < amount) {
    alert("Insufficient balance.")
    return
  }

  try {
    // Create withdrawal request
    const method = withdrawalMethods.find((m) => m.id === methodId)

    await db.collection("withdrawals").add({
      userId: currentUser.uid,
      method: method.name,
      methodId: methodId,
      amount: amount,
      account: account,
      status: "pending",
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    })

    // Deduct from balance
    await updateUserBalance(currentUser.uid, amount, "subtract")
    await logTransaction(currentUser.uid, "withdrawal_request", -amount, `Withdrawal request via ${method.name}`)

    // Send notification
    await sendTelegramNotification(
      currentUser.uid,
      `Your withdrawal request of $${amount.toFixed(2)} has been submitted and is pending approval.`,
    )

    // Reset form
    e.target.reset()

    // Reload data
    await loadWithdrawalHistory()
    renderWithdrawalHistory()

    alert("Withdrawal request submitted successfully!")
  } catch (error) {
    console.error("[v0] Error submitting withdrawal:", error)
    alert("Failed to submit withdrawal request. Please try again.")
  }
}

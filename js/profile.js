// Profile Page
let incomeStats = {}

// Declare variables
let db
let currentUser
let getCurrentUserData

// Initialize profile page
async function initProfile() {
  await loadProfileData()
  await loadIncomeStats()
  await loadTransactionHistory()
  renderIncomeChart()
}

// Load profile data
async function loadProfileData() {
  try {
    if (!currentUser) return

    const userData = await getCurrentUserData(currentUser.uid)
    if (!userData) return

    // Update profile info
    document.getElementById("user-name").textContent =
      `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "User"
    document.getElementById("user-telegram-id").textContent = userData.telegramId
    document.getElementById("user-username").textContent = userData.username || "N/A"

    // Update balance
    document.getElementById("profile-balance").textContent = userData.balance.toFixed(2)

    // Update earnings breakdown
    document.getElementById("task-earnings").textContent = (userData.earnings?.tasks || 0).toFixed(2)
    document.getElementById("game-earnings").textContent = (userData.earnings?.games || 0).toFixed(2)
    document.getElementById("profile-referral-earnings").textContent = (userData.earnings?.referrals || 0).toFixed(2)

    // Calculate total earnings
    const totalEarnings =
      (userData.earnings?.tasks || 0) + (userData.earnings?.games || 0) + (userData.earnings?.referrals || 0)
    document.getElementById("total-earnings").textContent = totalEarnings.toFixed(2)
  } catch (error) {
    console.error("[v0] Error loading profile data:", error)
  }
}

// Load income stats
async function loadIncomeStats() {
  try {
    if (!currentUser) return

    // Get transactions for the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const transactionsSnapshot = await db
      .collection("transactions")
      .where("userId", "==", currentUser.uid)
      .where("timestamp", ">=", sevenDaysAgo)
      .orderBy("timestamp", "desc")
      .get()

    // Group by day
    incomeStats = {}
    transactionsSnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.amount > 0) {
        const date = new Date(data.timestamp.toDate()).toLocaleDateString()
        incomeStats[date] = (incomeStats[date] || 0) + data.amount
      }
    })

    console.log("[v0] Income stats loaded:", incomeStats)
  } catch (error) {
    console.error("[v0] Error loading income stats:", error)
  }
}

// Load transaction history
async function loadTransactionHistory() {
  try {
    if (!currentUser) return

    const transactionsSnapshot = await db
      .collection("transactions")
      .where("userId", "==", currentUser.uid)
      .orderBy("timestamp", "desc")
      .limit(20)
      .get()

    const container = document.getElementById("transaction-history")
    if (!container) return

    container.innerHTML = ""

    if (transactionsSnapshot.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No transactions yet.</p>
        </div>
      `
      return
    }

    transactionsSnapshot.forEach((doc) => {
      const transaction = doc.data()
      const card = createTransactionCard(transaction)
      container.appendChild(card)
    })
  } catch (error) {
    console.error("[v0] Error loading transaction history:", error)
  }
}

// Create transaction card
function createTransactionCard(transaction) {
  const card = document.createElement("div")
  card.className = "transaction-card"

  const date = transaction.timestamp ? new Date(transaction.timestamp.toDate()).toLocaleString() : "N/A"

  const amountClass = transaction.amount >= 0 ? "amount-positive" : "amount-negative"
  const amountPrefix = transaction.amount >= 0 ? "+" : ""

  card.innerHTML = `
    <div class="transaction-info">
      <h4>${transaction.description}</h4>
      <p class="transaction-date">${date}</p>
    </div>
    <div class="transaction-amount ${amountClass}">
      ${amountPrefix}$${Math.abs(transaction.amount).toFixed(2)}
    </div>
  `

  return card
}

// Render income chart
function renderIncomeChart() {
  const canvas = document.getElementById("income-chart")
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  const width = canvas.width
  const height = canvas.height

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  // Get data
  const dates = Object.keys(incomeStats).slice(0, 7).reverse()
  const values = dates.map((date) => incomeStats[date])

  if (values.length === 0) {
    ctx.fillStyle = "#666"
    ctx.font = "14px Arial"
    ctx.textAlign = "center"
    ctx.fillText("No data available", width / 2, height / 2)
    return
  }

  // Calculate max value for scaling
  const maxValue = Math.max(...values, 1)
  const padding = 40
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Draw axes
  ctx.strokeStyle = "#333"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(padding, padding)
  ctx.lineTo(padding, height - padding)
  ctx.lineTo(width - padding, height - padding)
  ctx.stroke()

  // Draw bars
  const barWidth = chartWidth / values.length - 10
  const barSpacing = 10

  values.forEach((value, index) => {
    const barHeight = (value / maxValue) * chartHeight
    const x = padding + index * (barWidth + barSpacing) + barSpacing / 2
    const y = height - padding - barHeight

    // Draw bar
    ctx.fillStyle = "#4ecdc4"
    ctx.fillRect(x, y, barWidth, barHeight)

    // Draw value
    ctx.fillStyle = "#fff"
    ctx.font = "12px Arial"
    ctx.textAlign = "center"
    ctx.fillText(`$${value.toFixed(2)}`, x + barWidth / 2, y - 5)
  })

  // Draw labels
  ctx.fillStyle = "#999"
  ctx.font = "10px Arial"
  dates.forEach((date, index) => {
    const x = padding + index * (barWidth + barSpacing) + barSpacing / 2 + barWidth / 2
    const shortDate = new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    ctx.fillText(shortDate, x, height - padding + 20)
  })
}

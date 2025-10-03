// Spin Wheel Game Logic
let isSpinning = false
let canSpin = true
let spinCount = 0
const MAX_DAILY_SPINS = 5

// Prize configuration
const prizes = [
  { id: 1, amount: 0.01, probability: 30, color: "#ff6b6b" },
  { id: 2, amount: 0.02, probability: 25, color: "#4ecdc4" },
  { id: 3, amount: 0.05, probability: 20, color: "#45b7d1" },
  { id: 4, amount: 0.1, probability: 15, color: "#f9ca24" },
  { id: 5, amount: 0.25, probability: 7, color: "#6c5ce7" },
  { id: 6, amount: 0.5, probability: 2, color: "#fd79a8" },
  { id: 7, amount: 1.0, probability: 0.8, color: "#00b894" },
  { id: 8, amount: 2.0, probability: 0.2, color: "#fdcb6e" },
]

// Declare variables before using them
const currentUser = {} // Placeholder for currentUser
const db = {} // Placeholder for db
const firebase = {} // Placeholder for firebase
const updateUserBalance = async (uid, amount, operation) => {} // Placeholder for updateUserBalance
const updateEarnings = async (uid, category, amount) => {} // Placeholder for updateEarnings
const logTransaction = async (uid, type, amount, description) => {} // Placeholder for logTransaction
const getCurrentUserData = async (uid) => {} // Placeholder for getCurrentUserData
const updateBalanceDisplays = (balance) => {} // Placeholder for updateBalanceDisplays
const currentPage = "home" // Placeholder for currentPage

// Initialize spin wheel
async function initSpinWheel() {
  await checkSpinAvailability()
  drawWheel()
  setupSpinButton()
}

// Check if user can spin today
async function checkSpinAvailability() {
  try {
    if (!currentUser) return

    const today = new Date().toDateString()
    const userRef = db.collection("users").doc(currentUser.uid)
    const userDoc = await userRef.get()
    const userData = userDoc.data()

    const lastSpinDate = userData.lastSpinDate ? new Date(userData.lastSpinDate.toDate()).toDateString() : null
    spinCount = userData.dailySpinCount || 0

    // Reset spin count if it's a new day
    if (lastSpinDate !== today) {
      spinCount = 0
      await userRef.update({
        dailySpinCount: 0,
        lastSpinDate: firebase.firestore.FieldValue.serverTimestamp(),
      })
    }

    canSpin = spinCount < MAX_DAILY_SPINS
    updateSpinButton()
  } catch (error) {
    console.error("[v0] Error checking spin availability:", error)
  }
}

// Draw the wheel on canvas
function drawWheel() {
  const canvas = document.getElementById("wheel-canvas")
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const radius = Math.min(centerX, centerY) - 10

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw wheel segments
  const totalSegments = prizes.length
  const anglePerSegment = (2 * Math.PI) / totalSegments

  prizes.forEach((prize, index) => {
    const startAngle = index * anglePerSegment
    const endAngle = startAngle + anglePerSegment

    // Draw segment
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.arc(centerX, centerY, radius, startAngle, endAngle)
    ctx.closePath()
    ctx.fillStyle = prize.color
    ctx.fill()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw text
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(startAngle + anglePerSegment / 2)
    ctx.textAlign = "center"
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 16px Arial"
    ctx.fillText(`$${prize.amount}`, radius / 2, 5)
    ctx.restore()
  })

  // Draw center circle
  ctx.beginPath()
  ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI)
  ctx.fillStyle = "#1a1f3a"
  ctx.fill()
  ctx.strokeStyle = "#ffffff"
  ctx.lineWidth = 3
  ctx.stroke()

  // Draw pointer
  drawPointer(ctx, centerX, centerY, radius)
}

// Draw pointer at top
function drawPointer(ctx, centerX, centerY, radius) {
  ctx.save()
  ctx.translate(centerX, centerY - radius - 10)

  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-15, -30)
  ctx.lineTo(15, -30)
  ctx.closePath()
  ctx.fillStyle = "#ff6b6b"
  ctx.fill()
  ctx.strokeStyle = "#ffffff"
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.restore()
}

// Setup spin button
function setupSpinButton() {
  const spinBtn = document.getElementById("spin-btn")
  if (!spinBtn) return

  spinBtn.addEventListener("click", handleSpin)
}

// Update spin button state
function updateSpinButton() {
  const spinBtn = document.getElementById("spin-btn")
  const spinsLeftEl = document.getElementById("spins-left")

  if (!spinBtn || !spinsLeftEl) return

  const spinsLeft = MAX_DAILY_SPINS - spinCount
  spinsLeftEl.textContent = spinsLeft

  if (!canSpin || isSpinning) {
    spinBtn.disabled = true
    spinBtn.textContent = spinsLeft === 0 ? "No Spins Left" : "Spinning..."
  } else {
    spinBtn.disabled = false
    spinBtn.textContent = "SPIN NOW"
  }
}

// Handle spin action
async function handleSpin() {
  if (!canSpin || isSpinning) return

  isSpinning = true
  updateSpinButton()

  try {
    // Select prize based on probability
    const prize = selectPrize()

    // Animate wheel
    await animateWheel(prize)

    // Award prize
    await awardPrize(prize)

    // Update spin count
    spinCount++
    await updateSpinCount()

    // Check if can still spin
    canSpin = spinCount < MAX_DAILY_SPINS
    updateSpinButton()

    // Show result
    showSpinResult(prize)
  } catch (error) {
    console.error("[v0] Spin error:", error)
    alert("Failed to spin. Please try again.")
  } finally {
    isSpinning = false
    updateSpinButton()
  }
}

// Select prize based on probability
function selectPrize() {
  const random = Math.random() * 100
  let cumulativeProbability = 0

  for (const prize of prizes) {
    cumulativeProbability += prize.probability
    if (random <= cumulativeProbability) {
      return prize
    }
  }

  return prizes[0] // Fallback
}

// Animate wheel spinning
function animateWheel(targetPrize) {
  return new Promise((resolve) => {
    const canvas = document.getElementById("wheel-canvas")
    if (!canvas) {
      resolve()
      return
    }

    const targetIndex = prizes.findIndex((p) => p.id === targetPrize.id)
    const segmentAngle = (2 * Math.PI) / prizes.length
    const targetAngle = targetIndex * segmentAngle + segmentAngle / 2

    // Calculate total rotation (multiple spins + target)
    const totalRotation = Math.PI * 2 * 5 + (Math.PI * 2 - targetAngle)

    let currentRotation = 0
    const duration = 4000 // 4 seconds
    const startTime = Date.now()

    function animate() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      currentRotation = totalRotation * easeOut

      // Rotate canvas
      canvas.style.transform = `rotate(${currentRotation}rad)`

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        resolve()
      }
    }

    animate()
  })
}

// Award prize to user
async function awardPrize(prize) {
  try {
    await updateUserBalance(currentUser.uid, prize.amount, "add")
    await updateEarnings(currentUser.uid, "games", prize.amount)
    await logTransaction(currentUser.uid, "spin_win", prize.amount, `Won $${prize.amount} from spin wheel`)

    // Refresh balance display
    const userData = await getCurrentUserData(currentUser.uid)
    if (userData) {
      updateBalanceDisplays(userData.balance)
    }
  } catch (error) {
    console.error("[v0] Error awarding prize:", error)
    throw error
  }
}

// Update spin count in database
async function updateSpinCount() {
  try {
    await db.collection("users").doc(currentUser.uid).update({
      dailySpinCount: spinCount,
      lastSpinDate: firebase.firestore.FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error updating spin count:", error)
  }
}

// Show spin result modal
function showSpinResult(prize) {
  const modal = document.getElementById("spin-result-modal")
  const amountEl = document.getElementById("spin-result-amount")

  if (modal && amountEl) {
    amountEl.textContent = prize.amount.toFixed(2)
    modal.classList.remove("hidden")

    // Auto close after 3 seconds
    setTimeout(() => {
      modal.classList.add("hidden")
    }, 3000)
  }
}

// Close spin result modal
document.getElementById("close-spin-result")?.addEventListener("click", () => {
  const modal = document.getElementById("spin-result-modal")
  if (modal) {
    modal.classList.add("hidden")
  }
})

// Initialize when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (currentPage === "home") {
      initSpinWheel()
    }
  })
} else {
  if (currentPage === "home") {
    initSpinWheel()
  }
}

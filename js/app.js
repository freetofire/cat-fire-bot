// Global state
let currentUser = null
let appSettings = null
const telegramUser = null
const db = null
const firebase = null
const APP_CONFIG = null

// Declare functions before using them
async function initTelegram() {
  // Placeholder for Telegram initialization logic
  return true
}

async function detectVPN() {
  // Placeholder for VPN detection logic
  return false
}

async function isUserBlocked(userId) {
  // Placeholder for user blocking logic
  return false
}

function getReferralCode() {
  // Placeholder for referral code logic
  return null
}

async function updateUserBalance(userId, amount, operation) {
  // Placeholder for updating user balance logic
}

async function updateEarnings(userId, type, amount) {
  // Placeholder for updating earnings logic
}

async function logTransaction(userId, transactionType, amount, description) {
  // Placeholder for logging transaction logic
}

async function sendTelegramNotification(userId, message) {
  // Placeholder for sending Telegram notification logic
}

async function getCurrentUserData(userId) {
  // Placeholder for getting current user data logic
  return { balance: 0, earnings: { tasks: 0, games: 0, referrals: 0 }, referralCount: 0, telegramId: userId }
}

function generateReferralLink(userId) {
  // Placeholder for generating referral link logic
  return `https://example.com/referral?code=${userId}`
}

// Initialize app
async function initApp() {
  console.log("[v0] Initializing app...")

  // Show loading screen
  showLoading()

  try {
    // Initialize Telegram
    const telegramInitialized = await initTelegram()
    if (!telegramInitialized) {
      throw new Error("Telegram initialization failed")
    }

    // Detect VPN
    const vpnDetected = await detectVPN()
    if (vpnDetected) {
      hideLoading()
      return
    }

    // Authenticate user
    await authenticateUser()

    // Load app settings
    await loadAppSettings()

    // Check if user is blocked
    const blocked = await isUserBlocked(currentUser.uid)
    if (blocked) {
      alert("Your account has been blocked. Please contact support.")
      return
    }

    // Show welcome modal for new users
    const isNewUser = await checkIfNewUser()
    if (isNewUser) {
      showWelcomeModal()
    }

    // Load user data
    await loadUserData()

    // Hide loading and show app
    hideLoading()
    showApp()

    console.log("[v0] App initialized successfully")
  } catch (error) {
    console.error("[v0] App initialization error:", error)
    hideLoading()
    alert("Failed to initialize app. Please try again.")
  }
}

// Authenticate user with Telegram
async function authenticateUser() {
  if (!telegramUser) {
    throw new Error("No Telegram user data")
  }

  try {
    // Create or get user in Firebase
    const userId = telegramUser.id.toString()
    const userRef = db.collection("users").doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      // New user - create account
      const referralCode = getReferralCode()

      await userRef.set({
        telegramId: telegramUser.id,
        firstName: telegramUser.first_name || "",
        lastName: telegramUser.last_name || "",
        username: telegramUser.username || "",
        balance: 0,
        earnings: {
          tasks: 0,
          games: 0,
          referrals: 0,
        },
        referralCount: 0,
        referredBy: referralCode || null,
        blocked: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      })

      // Process referral if exists
      if (referralCode) {
        await processReferral(userId, referralCode)
      }
    } else {
      // Existing user - update last login
      await userRef.update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      })
    }

    // Set current user
    currentUser = { uid: userId, ...telegramUser }
  } catch (error) {
    console.error("[v0] Authentication error:", error)
    throw error
  }
}

// Process referral bonus
async function processReferral(newUserId, referrerId) {
  try {
    // Get app settings for referral rewards
    const settingsDoc = await db.collection("settings").doc("app").get()
    const settings = settingsDoc.exists ? settingsDoc.data() : {}

    const referrerReward = settings.referrerReward || APP_CONFIG.defaultReferrerReward
    const refereeReward = settings.refereeReward || APP_CONFIG.defaultRefereeReward

    // Give bonus to referrer
    await updateUserBalance(referrerId, referrerReward, "add")
    await updateEarnings(referrerId, "referrals", referrerReward)
    await logTransaction(referrerId, "referral_bonus", referrerReward, `Referral bonus for inviting user ${newUserId}`)

    // Increment referral count
    await db
      .collection("users")
      .doc(referrerId)
      .update({
        referralCount: firebase.firestore.FieldValue.increment(1),
      })

    // Give bonus to new user
    await updateUserBalance(newUserId, refereeReward, "add")
    await updateEarnings(newUserId, "referrals", refereeReward)
    await logTransaction(newUserId, "signup_bonus", refereeReward, "Welcome bonus for joining")

    // Send notification to referrer
    await sendTelegramNotification(referrerId, `🎉 You earned $${referrerReward} for referring a new user!`)

    console.log("[v0] Referral processed successfully")
  } catch (error) {
    console.error("[v0] Error processing referral:", error)
  }
}

// Load app settings
async function loadAppSettings() {
  try {
    const settingsDoc = await db.collection("settings").doc("app").get()
    appSettings = settingsDoc.exists ? settingsDoc.data() : {}
    console.log("[v0] App settings loaded:", appSettings)
  } catch (error) {
    console.error("[v0] Error loading app settings:", error)
    appSettings = {}
  }
}

// Check if user is new
async function checkIfNewUser() {
  try {
    const userDoc = await db.collection("users").doc(currentUser.uid).get()
    const userData = userDoc.data()

    // Check if this is their first login (within 1 minute of account creation)
    if (userData.createdAt && userData.lastLogin) {
      const createdTime = userData.createdAt.toMillis()
      const loginTime = userData.lastLogin.toMillis()
      return loginTime - createdTime < 60000 // 1 minute
    }

    return false
  } catch (error) {
    return false
  }
}

// Show welcome modal
function showWelcomeModal() {
  const modal = document.getElementById("welcome-modal")
  if (modal) {
    modal.classList.remove("hidden")
  }
}

// Close welcome modal
document.getElementById("close-welcome")?.addEventListener("click", () => {
  const modal = document.getElementById("welcome-modal")
  if (modal) {
    modal.classList.add("hidden")
  }
})

// Load user data
async function loadUserData() {
  try {
    const userData = await getCurrentUserData(currentUser.uid)
    if (!userData) return

    // Update balance displays
    updateBalanceDisplays(userData.balance)

    // Update profile info
    updateProfileInfo(userData)

    // Update earnings
    updateEarningsDisplays(userData.earnings)

    // Update referral stats
    updateReferralStats(userData)
  } catch (error) {
    console.error("[v0] Error loading user data:", error)
  }
}

// Update balance displays
function updateBalanceDisplays(balance) {
  const balanceElements = [document.getElementById("user-balance"), document.getElementById("profile-balance")]

  balanceElements.forEach((el) => {
    if (el) {
      el.textContent = balance.toFixed(2)
    }
  })
}

// Update profile info
function updateProfileInfo(userData) {
  const nameEl = document.getElementById("user-name")
  const idEl = document.getElementById("user-telegram-id")
  const usernameEl = document.getElementById("user-username")

  if (nameEl) {
    nameEl.textContent = `${userData.firstName} ${userData.lastName}`.trim()
  }
  if (idEl) {
    idEl.textContent = userData.telegramId
  }
  if (usernameEl) {
    usernameEl.textContent = userData.username || "N/A"
  }
}

// Update earnings displays
function updateEarningsDisplays(earnings) {
  const taskEarningsEl = document.getElementById("task-earnings")
  const gameEarningsEl = document.getElementById("game-earnings")
  const referralEarningsEl = document.getElementById("profile-referral-earnings")

  if (taskEarningsEl) {
    taskEarningsEl.textContent = (earnings.tasks || 0).toFixed(2)
  }
  if (gameEarningsEl) {
    gameEarningsEl.textContent = (earnings.games || 0).toFixed(2)
  }
  if (referralEarningsEl) {
    referralEarningsEl.textContent = (earnings.referrals || 0).toFixed(2)
  }
}

// Update referral stats
function updateReferralStats(userData) {
  const countEl = document.getElementById("referral-count")
  const earningsEl = document.getElementById("referral-earnings")

  if (countEl) {
    countEl.textContent = userData.referralCount || 0
  }
  if (earningsEl) {
    earningsEl.textContent = (userData.earnings?.referrals || 0).toFixed(2)
  }

  // Generate and display referral link
  const linkEl = document.getElementById("referral-link")
  if (linkEl) {
    linkEl.value = generateReferralLink(currentUser.uid)
  }
}

// Show/hide loading
function showLoading() {
  const loading = document.getElementById("loading-screen")
  if (loading) {
    loading.classList.remove("hidden")
  }
}

function hideLoading() {
  const loading = document.getElementById("loading-screen")
  if (loading) {
    loading.classList.add("hidden")
  }
}

// Show app
function showApp() {
  const app = document.getElementById("app-container")
  if (app) {
    app.classList.remove("hidden")
  }
}

// Initialize app when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp)
} else {
  initApp()
}

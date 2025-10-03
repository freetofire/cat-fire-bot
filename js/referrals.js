// Referral System
let referralList = []

// Declare variables
let db
let currentUser
let generateReferralLink
let sendTelegramNotification

// Initialize referral system
async function initReferrals() {
  await loadReferralList()
  renderReferralList()
  setupReferralActions()
}

// Load referral list
async function loadReferralList() {
  try {
    if (!currentUser) return

    const referralsSnapshot = await db
      .collection("users")
      .where("referredBy", "==", currentUser.uid)
      .orderBy("createdAt", "desc")
      .get()

    referralList = referralsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log("[v0] Loaded referrals:", referralList.length)
  } catch (error) {
    console.error("[v0] Error loading referrals:", error)
  }
}

// Render referral list
function renderReferralList() {
  const container = document.getElementById("referral-list")
  if (!container) return

  container.innerHTML = ""

  if (referralList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No referrals yet. Share your link to start earning!</p>
      </div>
    `
    return
  }

  referralList.forEach((referral) => {
    const card = createReferralCard(referral)
    container.appendChild(card)
  })
}

// Create referral card
function createReferralCard(referral) {
  const card = document.createElement("div")
  card.className = "referral-card"

  const name = `${referral.firstName || ""} ${referral.lastName || ""}`.trim() || "User"
  const username = referral.username ? `@${referral.username}` : ""
  const joinDate = referral.createdAt ? new Date(referral.createdAt.toDate()).toLocaleDateString() : "N/A"

  card.innerHTML = `
    <div class="referral-avatar">
      <div class="avatar-placeholder">${name.charAt(0).toUpperCase()}</div>
    </div>
    <div class="referral-info">
      <h4>${name}</h4>
      <p class="referral-username">${username}</p>
      <p class="referral-date">Joined: ${joinDate}</p>
    </div>
    <div class="referral-status">
      <span class="status-badge active">Active</span>
    </div>
  `

  return card
}

// Setup referral actions
function setupReferralActions() {
  // Copy referral link
  const copyBtn = document.getElementById("copy-referral-link")
  if (copyBtn) {
    copyBtn.addEventListener("click", copyReferralLink)
  }

  // Share via Telegram
  const shareBtn = document.getElementById("share-telegram")
  if (shareBtn) {
    shareBtn.addEventListener("click", shareViaTelegram)
  }
}

// Copy referral link to clipboard
async function copyReferralLink() {
  const linkInput = document.getElementById("referral-link")
  if (!linkInput) return

  try {
    await navigator.clipboard.writeText(linkInput.value)
    showNotification("Referral link copied to clipboard!")
  } catch (error) {
    // Fallback for older browsers
    linkInput.select()
    document.execCommand("copy")
    showNotification("Referral link copied to clipboard!")
  }
}

// Share via Telegram
function shareViaTelegram() {
  if (!currentUser) return

  const referralLink = generateReferralLink(currentUser.uid)
  const message = encodeURIComponent(`Join Cat Fire Bot and start earning! Use my referral link: ${referralLink}`)

  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${message}`

  window.open(telegramShareUrl, "_blank")
}

// Show notification
function showNotification(message) {
  const notification = document.createElement("div")
  notification.className = "notification-toast"
  notification.textContent = message

  document.body.appendChild(notification)

  setTimeout(() => {
    notification.classList.add("show")
  }, 100)

  setTimeout(() => {
    notification.classList.remove("show")
    setTimeout(() => {
      notification.remove()
    }, 300)
  }, 3000)
}

// Load referral stats
async function loadReferralStats() {
  try {
    if (!currentUser) return

    const userDoc = await db.collection("users").doc(currentUser.uid).get()
    const userData = userDoc.data()

    // Update referral count
    const countEl = document.getElementById("referral-count")
    if (countEl) {
      countEl.textContent = userData.referralCount || 0
    }

    // Update referral earnings
    const earningsEl = document.getElementById("referral-earnings")
    if (earningsEl) {
      earningsEl.textContent = (userData.earnings?.referrals || 0).toFixed(2)
    }

    // Calculate total referral earnings
    const totalEarnings = await calculateTotalReferralEarnings()
    const totalEl = document.getElementById("total-referral-earnings")
    if (totalEl) {
      totalEl.textContent = totalEarnings.toFixed(2)
    }
  } catch (error) {
    console.error("[v0] Error loading referral stats:", error)
  }
}

// Calculate total referral earnings
async function calculateTotalReferralEarnings() {
  try {
    const transactionsSnapshot = await db
      .collection("transactions")
      .where("userId", "==", currentUser.uid)
      .where("type", "==", "referral_bonus")
      .get()

    let total = 0
    transactionsSnapshot.forEach((doc) => {
      total += doc.data().amount || 0
    })

    return total
  } catch (error) {
    console.error("[v0] Error calculating referral earnings:", error)
    return 0
  }
}

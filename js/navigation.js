// Navigation system
let currentPage = "home"
const currentUser = {} // Declare currentUser variable

function navigateTo(pageName) {
  // Hide all pages
  const pages = document.querySelectorAll(".page")
  pages.forEach((page) => page.classList.remove("active"))

  // Show selected page
  const targetPage = document.getElementById(`${pageName}-page`)
  if (targetPage) {
    targetPage.classList.add("active")
  }

  // Update navigation buttons
  const navButtons = document.querySelectorAll(".nav-item")
  navButtons.forEach((btn) => btn.classList.remove("active"))

  const activeBtn = Array.from(navButtons).find((btn) => btn.getAttribute("onclick")?.includes(pageName))
  if (activeBtn) {
    activeBtn.classList.add("active")
  }

  currentPage = pageName

  // Load page-specific data
  loadPageData(pageName)
}

// Load page-specific data
async function loadPageData(pageName) {
  switch (pageName) {
    case "home":
      await loadHomePage()
      break
    case "withdraw":
      await loadWithdrawPage()
      break
    case "refer":
      await loadReferPage()
      break
    case "profile":
      await loadProfilePage()
      break
  }
}

// Load home page data
async function loadHomePage() {
  // Refresh user balance
  if (currentUser) {
    const userData = await getCurrentUserData(currentUser.uid)
    if (userData) {
      updateBalanceDisplays(userData.balance)
    }
  }
}

// Load withdraw page data
async function loadWithdrawPage() {
  await loadWithdrawalSettings()
  await loadWithdrawalHistory()
  await loadTopWithdrawers()
}

// Load refer page data
async function loadReferPage() {
  await loadReferralList()
}

// Load profile page data
async function loadProfilePage() {
  if (currentUser) {
    const userData = await getCurrentUserData(currentUser.uid)
    if (userData) {
      updateProfileInfo(userData)
      updateBalanceDisplays(userData.balance)
      updateEarningsDisplays(userData.earnings)
    }
  }
}

// Declare functions used in the code
async function getCurrentUserData(uid) {
  // Placeholder for function implementation
  return { uid: uid, balance: 100, earnings: 200 }
}

function updateBalanceDisplays(balance) {
  // Placeholder for function implementation
  console.log(`Balance: ${balance}`)
}

function updateProfileInfo(userData) {
  // Placeholder for function implementation
  console.log(`Profile Info: ${userData}`)
}

function updateEarningsDisplays(earnings) {
  // Placeholder for function implementation
  console.log(`Earnings: ${earnings}`)
}

async function loadWithdrawalSettings() {
  // Placeholder for function implementation
  console.log("Loading withdrawal settings...")
}

async function loadWithdrawalHistory() {
  // Placeholder for function implementation
  console.log("Loading withdrawal history...")
}

async function loadTopWithdrawers() {
  // Placeholder for function implementation
  console.log("Loading top withdrawers...")
}

async function loadReferralList() {
  // Placeholder for function implementation
  console.log("Loading referral list...")
}

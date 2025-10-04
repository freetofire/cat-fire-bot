// Admin Panel JavaScript
import { auth, db, rtdb } from "./firebase-init.js"
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js"
import { ref, get, update } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js"

class AdminPanel {
  constructor() {
    this.currentUser = null
    this.init()
  }

  async init() {
    // Check authentication
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user is admin
        const isAdmin = await this.checkAdminRole(user.uid)
        if (isAdmin) {
          this.currentUser = user
          this.showAdminPanel()
          this.loadDashboard()
          this.setupEventListeners()
        } else {
          this.showError("You do not have admin access")
          this.showLoginForm()
        }
      } else {
        this.showLoginForm()
      }
    })
  }

  async checkAdminRole(uid) {
    try {
      const userRef = doc(db, "users", uid)
      const userSnap = await getDoc(userRef)
      return userSnap.exists() && userSnap.data().role === "admin"
    } catch (error) {
      console.error("[v0] Error checking admin role:", error)
      return false
    }
  }

  showLoginForm() {
    document.getElementById("loginSection").classList.remove("hidden")
    document.getElementById("adminPanel").classList.add("hidden")
  }

  showAdminPanel() {
    document.getElementById("loginSection").classList.add("hidden")
    document.getElementById("adminPanel").classList.remove("hidden")
  }

  setupEventListeners() {
    // Login form
    document.getElementById("loginForm")?.addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleLogin()
    })

    // Logout button
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      this.handleLogout()
    })

    // Tab navigation
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchTab(e.target.dataset.tab)
      })
    })

    // Settings forms
    document.getElementById("spinSettingsForm")?.addEventListener("submit", (e) => {
      e.preventDefault()
      this.saveSpinSettings()
    })

    document.getElementById("taskSettingsForm")?.addEventListener("submit", (e) => {
      e.preventDefault()
      this.saveTaskSettings()
    })

    document.getElementById("withdrawalSettingsForm")?.addEventListener("submit", (e) => {
      e.preventDefault()
      this.saveWithdrawalSettings()
    })

    document.getElementById("referralSettingsForm")?.addEventListener("submit", (e) => {
      e.preventDefault()
      this.saveReferralSettings()
    })

    // Withdrawal actions
    this.setupWithdrawalListeners()
  }

  async handleLogin() {
    const email = document.getElementById("adminEmail").value
    const password = document.getElementById("adminPassword").value
    const errorDiv = document.getElementById("loginError")

    try {
      await signInWithEmailAndPassword(auth, email, password)
      errorDiv.classList.add("hidden")
    } catch (error) {
      errorDiv.textContent = "Invalid email or password"
      errorDiv.classList.remove("hidden")
    }
  }

  async handleLogout() {
    try {
      await signOut(auth)
      this.showLoginForm()
    } catch (error) {
      console.error("[v0] Logout error:", error)
    }
  }

  switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll(".tab-content").forEach((tab) => {
      tab.classList.add("hidden")
    })

    // Remove active class from all buttons
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active")
    })

    // Show selected tab
    document.getElementById(`${tabName}Tab`).classList.remove("hidden")
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active")

    // Load data for the tab
    this.loadTabData(tabName)
  }

  async loadDashboard() {
    try {
      // Load statistics
      const usersSnapshot = await getDocs(collection(db, "users"))
      const withdrawalsSnapshot = await getDocs(collection(db, "withdrawals"))

      let totalUsers = 0
      let totalBalance = 0
      let pendingWithdrawals = 0
      let totalWithdrawn = 0

      usersSnapshot.forEach((doc) => {
        totalUsers++
        const data = doc.data()
        totalBalance += data.balance || 0
      })

      withdrawalsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.status === "pending") {
          pendingWithdrawals++
        } else if (data.status === "approved") {
          totalWithdrawn += data.amount || 0
        }
      })

      // Update dashboard
      document.getElementById("totalUsers").textContent = totalUsers
      document.getElementById("totalBalance").textContent = `$${totalBalance.toFixed(2)}`
      document.getElementById("pendingWithdrawals").textContent = pendingWithdrawals
      document.getElementById("totalWithdrawn").textContent = `$${totalWithdrawn.toFixed(2)}`
    } catch (error) {
      console.error("[v0] Error loading dashboard:", error)
    }
  }

  async loadTabData(tabName) {
    switch (tabName) {
      case "users":
        await this.loadUsers()
        break
      case "withdrawals":
        await this.loadWithdrawals()
        break
      case "settings":
        await this.loadSettings()
        break
    }
  }

  async loadUsers() {
    try {
      const usersSnapshot = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")))
      const tbody = document.getElementById("usersTableBody")
      tbody.innerHTML = ""

      usersSnapshot.forEach((doc) => {
        const user = doc.data()
        const row = document.createElement("tr")
        row.innerHTML = `
          <td class="px-4 py-3">${user.telegramId || "N/A"}</td>
          <td class="px-4 py-3">${user.username || user.firstName || "Unknown"}</td>
          <td class="px-4 py-3">$${(user.balance || 0).toFixed(2)}</td>
          <td class="px-4 py-3">${user.referralCount || 0}</td>
          <td class="px-4 py-3">
            <span class="px-2 py-1 rounded text-xs ${user.blocked ? "bg-red-500" : "bg-green-500"}">
              ${user.blocked ? "Blocked" : "Active"}
            </span>
          </td>
          <td class="px-4 py-3">
            <button onclick="adminPanel.toggleUserBlock('${doc.id}', ${!user.blocked})" 
                    class="px-3 py-1 rounded text-sm ${user.blocked ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}">
              ${user.blocked ? "Unblock" : "Block"}
            </button>
          </td>
        `
        tbody.appendChild(row)
      })
    } catch (error) {
      console.error("[v0] Error loading users:", error)
    }
  }

  async toggleUserBlock(userId, block) {
    try {
      await updateDoc(doc(db, "users", userId), {
        blocked: block,
      })
      this.loadUsers()
      this.showSuccess(`User ${block ? "blocked" : "unblocked"} successfully`)
    } catch (error) {
      console.error("[v0] Error toggling user block:", error)
      this.showError("Failed to update user status")
    }
  }

  async loadWithdrawals() {
    try {
      const withdrawalsRef = collection(db, "withdrawals")

      // Real-time listener for withdrawals
      onSnapshot(query(withdrawalsRef, orderBy("createdAt", "desc")), (snapshot) => {
        const tbody = document.getElementById("withdrawalsTableBody")
        tbody.innerHTML = ""

        snapshot.forEach((doc) => {
          const withdrawal = doc.data()
          const row = document.createElement("tr")
          row.innerHTML = `
            <td class="px-4 py-3">${withdrawal.username || "Unknown"}</td>
            <td class="px-4 py-3">$${withdrawal.amount.toFixed(2)}</td>
            <td class="px-4 py-3">${withdrawal.method}</td>
            <td class="px-4 py-3">${withdrawal.accountId}</td>
            <td class="px-4 py-3">
              <span class="px-2 py-1 rounded text-xs ${
                withdrawal.status === "pending"
                  ? "bg-yellow-500"
                  : withdrawal.status === "approved"
                    ? "bg-green-500"
                    : "bg-red-500"
              }">
                ${withdrawal.status}
              </span>
            </td>
            <td class="px-4 py-3">
              ${new Date(withdrawal.createdAt).toLocaleDateString()}
            </td>
            <td class="px-4 py-3">
              ${
                withdrawal.status === "pending"
                  ? `
                <button onclick="adminPanel.approveWithdrawal('${doc.id}', '${withdrawal.userId}')" 
                        class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm mr-2">
                  Approve
                </button>
                <button onclick="adminPanel.rejectWithdrawal('${doc.id}', '${withdrawal.userId}', ${withdrawal.amount})" 
                        class="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm">
                  Reject
                </button>
              `
                  : "-"
              }
            </td>
          `
          tbody.appendChild(row)
        })
      })
    } catch (error) {
      console.error("[v0] Error loading withdrawals:", error)
    }
  }

  setupWithdrawalListeners() {
    // These functions are called from inline onclick handlers
    window.adminPanel = this
  }

  async approveWithdrawal(withdrawalId, userId) {
    try {
      await updateDoc(doc(db, "withdrawals", withdrawalId), {
        status: "approved",
        approvedAt: Date.now(),
      })
      this.showSuccess("Withdrawal approved successfully")
    } catch (error) {
      console.error("[v0] Error approving withdrawal:", error)
      this.showError("Failed to approve withdrawal")
    }
  }

  async rejectWithdrawal(withdrawalId, userId, amount) {
    try {
      // Return money to user
      const userRef = doc(db, "users", userId)
      const userSnap = await getDoc(userRef)
      if (userSnap.exists()) {
        const currentBalance = userSnap.data().balance || 0
        await updateDoc(userRef, {
          balance: currentBalance + amount,
        })
      }

      // Update withdrawal status
      await updateDoc(doc(db, "withdrawals", withdrawalId), {
        status: "rejected",
        rejectedAt: Date.now(),
      })

      this.showSuccess("Withdrawal rejected and amount refunded")
    } catch (error) {
      console.error("[v0] Error rejecting withdrawal:", error)
      this.showError("Failed to reject withdrawal")
    }
  }

  async loadSettings() {
    try {
      const settingsRef = ref(rtdb, "settings")
      const snapshot = await get(settingsRef)

      if (snapshot.exists()) {
        const settings = snapshot.val()

        // Spin settings
        document.getElementById("dailySpinLimit").value = settings.spin?.dailyLimit || 5

        // Task settings
        document.getElementById("adReward").value = settings.tasks?.adReward || 0.05
        document.getElementById("adDailyLimit").value = settings.tasks?.adDailyLimit || 10
        document.getElementById("linkReward1").value = settings.tasks?.linkRewards?.[0] || 0.1
        document.getElementById("linkUrl1").value = settings.tasks?.linkUrls?.[0] || ""
        document.getElementById("videoReward").value = settings.tasks?.videoReward || 0.15
        document.getElementById("loginBonus").value = settings.tasks?.loginBonus || 0.25
        document.getElementById("telegramChannelUrl").value = settings.tasks?.telegramChannel || ""
        document.getElementById("telegramChannelReward").value = settings.tasks?.telegramChannelReward || 1.0
        document.getElementById("youtubeChannelUrl").value = settings.tasks?.youtubeChannel || ""
        document.getElementById("youtubeChannelReward").value = settings.tasks?.youtubeChannelReward || 1.0

        // Withdrawal settings
        document.getElementById("minWithdrawal").value = settings.withdrawal?.minAmount || 5

        // Referral settings
        document.getElementById("referrerBonus").value = settings.referral?.referrerBonus || 2.66
        document.getElementById("refereeBonus").value = settings.referral?.refereeBonus || 2.0
      }
    } catch (error) {
      console.error("[v0] Error loading settings:", error)
    }
  }

  async saveSpinSettings() {
    try {
      const dailyLimit = Number.parseInt(document.getElementById("dailySpinLimit").value)

      await update(ref(rtdb, "settings/spin"), {
        dailyLimit,
        updatedAt: Date.now(),
      })

      this.showSuccess("Spin settings saved successfully")
    } catch (error) {
      console.error("[v0] Error saving spin settings:", error)
      this.showError("Failed to save spin settings")
    }
  }

  async saveTaskSettings() {
    try {
      const taskSettings = {
        adReward: Number.parseFloat(document.getElementById("adReward").value),
        adDailyLimit: Number.parseInt(document.getElementById("adDailyLimit").value),
        linkRewards: [
          Number.parseFloat(document.getElementById("linkReward1").value),
          Number.parseFloat(document.getElementById("linkReward2")?.value || 0),
          Number.parseFloat(document.getElementById("linkReward3")?.value || 0),
        ],
        linkUrls: [
          document.getElementById("linkUrl1").value,
          document.getElementById("linkUrl2")?.value || "",
          document.getElementById("linkUrl3")?.value || "",
        ],
        videoReward: Number.parseFloat(document.getElementById("videoReward").value),
        loginBonus: Number.parseFloat(document.getElementById("loginBonus").value),
        telegramChannel: document.getElementById("telegramChannelUrl").value,
        telegramChannelReward: Number.parseFloat(document.getElementById("telegramChannelReward").value),
        youtubeChannel: document.getElementById("youtubeChannelUrl").value,
        youtubeChannelReward: Number.parseFloat(document.getElementById("youtubeChannelReward").value),
        updatedAt: Date.now(),
      }

      await update(ref(rtdb, "settings/tasks"), taskSettings)
      this.showSuccess("Task settings saved successfully")
    } catch (error) {
      console.error("[v0] Error saving task settings:", error)
      this.showError("Failed to save task settings")
    }
  }

  async saveWithdrawalSettings() {
    try {
      const minAmount = Number.parseFloat(document.getElementById("minWithdrawal").value)

      await update(ref(rtdb, "settings/withdrawal"), {
        minAmount,
        updatedAt: Date.now(),
      })

      this.showSuccess("Withdrawal settings saved successfully")
    } catch (error) {
      console.error("[v0] Error saving withdrawal settings:", error)
      this.showError("Failed to save withdrawal settings")
    }
  }

  async saveReferralSettings() {
    try {
      const referralSettings = {
        referrerBonus: Number.parseFloat(document.getElementById("referrerBonus").value),
        refereeBonus: Number.parseFloat(document.getElementById("refereeBonus").value),
        updatedAt: Date.now(),
      }

      await update(ref(rtdb, "settings/referral"), referralSettings)
      this.showSuccess("Referral settings saved successfully")
    } catch (error) {
      console.error("[v0] Error saving referral settings:", error)
      this.showError("Failed to save referral settings")
    }
  }

  showSuccess(message) {
    // You can implement a toast notification here
    alert(message)
  }

  showError(message) {
    // You can implement a toast notification here
    alert(message)
  }
}

// Initialize admin panel
const adminPanel = new AdminPanel()

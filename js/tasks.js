// Daily Tasks System
let tasks = []
let completedTasks = new Set()

// Task types
const TASK_TYPES = {
  AD: "ad",
  LINK: "link",
  VIDEO: "video",
  LOGIN: "login",
}

// Declare variables
let db
let currentUser
let updateUserBalance
let updateEarnings
let logTransaction
let firebase
let appSettings
let getCurrentUserData
let updateBalanceDisplays

// Initialize tasks
async function initTasks() {
  await loadTasks()
  await loadCompletedTasks()
  renderTasks()
  checkLoginBonus()
}

// Load tasks from Firebase
async function loadTasks() {
  try {
    const tasksSnapshot = await db.collection("tasks").where("active", "==", true).get()

    tasks = tasksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log("[v0] Loaded tasks:", tasks.length)
  } catch (error) {
    console.error("[v0] Error loading tasks:", error)
  }
}

// Load completed tasks for today
async function loadCompletedTasks() {
  try {
    if (!currentUser) return

    const today = new Date().toDateString()
    const completedSnapshot = await db
      .collection("completedTasks")
      .where("userId", "==", currentUser.uid)
      .where("date", "==", today)
      .get()

    completedTasks = new Set(completedSnapshot.docs.map((doc) => doc.data().taskId))

    console.log("[v0] Completed tasks today:", completedTasks.size)
  } catch (error) {
    console.error("[v0] Error loading completed tasks:", error)
  }
}

// Render tasks in UI
function renderTasks() {
  const adTasksContainer = document.getElementById("ad-tasks")
  const linkTasksContainer = document.getElementById("link-tasks")
  const videoTasksContainer = document.getElementById("video-tasks")

  if (!adTasksContainer || !linkTasksContainer || !videoTasksContainer) return

  // Clear containers
  adTasksContainer.innerHTML = ""
  linkTasksContainer.innerHTML = ""
  videoTasksContainer.innerHTML = ""

  // Group tasks by type
  const adTasks = tasks.filter((t) => t.type === TASK_TYPES.AD)
  const linkTasks = tasks.filter((t) => t.type === TASK_TYPES.LINK)
  const videoTasks = tasks.filter((t) => t.type === TASK_TYPES.VIDEO)

  // Render each type
  adTasks.forEach((task) => {
    adTasksContainer.appendChild(createTaskCard(task))
  })

  linkTasks.forEach((task) => {
    linkTasksContainer.appendChild(createTaskCard(task))
  })

  videoTasks.forEach((task) => {
    videoTasksContainer.appendChild(createTaskCard(task))
  })
}

// Create task card element
function createTaskCard(task) {
  const card = document.createElement("div")
  card.className = "task-card"

  const isCompleted = completedTasks.has(task.id)

  card.innerHTML = `
    <div class="task-info">
      <h4>${task.title}</h4>
      <p>${task.description}</p>
      <div class="task-reward">+$${task.reward.toFixed(2)}</div>
    </div>
    <button 
      class="task-btn ${isCompleted ? "completed" : ""}" 
      onclick="handleTaskClick('${task.id}')"
      ${isCompleted ? "disabled" : ""}
    >
      ${isCompleted ? "Completed" : "Start"}
    </button>
  `

  return card
}

// Handle task click
async function handleTaskClick(taskId) {
  const task = tasks.find((t) => t.id === taskId)
  if (!task || completedTasks.has(taskId)) return

  try {
    // Open task URL in new window
    if (task.url) {
      window.open(task.url, "_blank")
    }

    // Show verification modal
    showTaskVerification(task)
  } catch (error) {
    console.error("[v0] Error handling task click:", error)
  }
}

// Show task verification modal
function showTaskVerification(task) {
  const modal = document.getElementById("task-verification-modal")
  const titleEl = document.getElementById("verification-task-title")
  const timerEl = document.getElementById("verification-timer")
  const verifyBtn = document.getElementById("verify-task-btn")

  if (!modal || !titleEl || !timerEl || !verifyBtn) return

  titleEl.textContent = task.title
  modal.classList.remove("hidden")

  // Countdown timer
  let timeLeft = task.verificationTime || 30
  timerEl.textContent = timeLeft

  verifyBtn.disabled = true
  verifyBtn.textContent = "Please wait..."

  const countdown = setInterval(() => {
    timeLeft--
    timerEl.textContent = timeLeft

    if (timeLeft <= 0) {
      clearInterval(countdown)
      verifyBtn.disabled = false
      verifyBtn.textContent = "Verify & Claim"
      verifyBtn.onclick = () => completeTask(task.id)
    }
  }, 1000)
}

// Complete task and award reward
async function completeTask(taskId) {
  try {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    // Award reward
    await updateUserBalance(currentUser.uid, task.reward, "add")
    await updateEarnings(currentUser.uid, "tasks", task.reward)
    await logTransaction(currentUser.uid, "task_complete", task.reward, `Completed task: ${task.title}`)

    // Mark as completed
    const today = new Date().toDateString()
    await db.collection("completedTasks").add({
      userId: currentUser.uid,
      taskId: task.id,
      date: today,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    })

    completedTasks.add(taskId)

    // Update UI
    renderTasks()

    // Refresh balance
    const userData = await getCurrentUserData(currentUser.uid)
    if (userData) {
      updateBalanceDisplays(userData.balance)
    }

    // Close modal
    const modal = document.getElementById("task-verification-modal")
    if (modal) {
      modal.classList.add("hidden")
    }

    // Show success message
    alert(`Task completed! You earned $${task.reward.toFixed(2)}`)
  } catch (error) {
    console.error("[v0] Error completing task:", error)
    alert("Failed to complete task. Please try again.")
  }
}

// Check and award login bonus
async function checkLoginBonus() {
  try {
    if (!currentUser) return

    const today = new Date().toDateString()
    const userRef = db.collection("users").doc(currentUser.uid)
    const userDoc = await userRef.get()
    const userData = userDoc.data()

    const lastLoginBonus = userData.lastLoginBonus ? new Date(userData.lastLoginBonus.toDate()).toDateString() : null

    // Award login bonus if not claimed today
    if (lastLoginBonus !== today) {
      const loginBonus = appSettings.loginBonus || 0.01

      await updateUserBalance(currentUser.uid, loginBonus, "add")
      await updateEarnings(currentUser.uid, "tasks", loginBonus)
      await logTransaction(currentUser.uid, "login_bonus", loginBonus, "Daily login bonus")

      await userRef.update({
        lastLoginBonus: firebase.firestore.FieldValue.serverTimestamp(),
      })

      // Show notification
      showLoginBonusNotification(loginBonus)

      // Refresh balance
      const updatedUserData = await getCurrentUserData(currentUser.uid)
      if (updatedUserData) {
        updateBalanceDisplays(updatedUserData.balance)
      }
    }
  } catch (error) {
    console.error("[v0] Error checking login bonus:", error)
  }
}

// Show login bonus notification
function showLoginBonusNotification(amount) {
  const notification = document.createElement("div")
  notification.className = "login-bonus-notification"
  notification.innerHTML = `
    <div class="notification-content">
      <h3>Daily Login Bonus!</h3>
      <p>You received $${amount.toFixed(2)}</p>
    </div>
  `

  document.body.appendChild(notification)

  setTimeout(() => {
    notification.remove()
  }, 3000)
}

// Close task verification modal
document.getElementById("close-task-verification")?.addEventListener("click", () => {
  const modal = document.getElementById("task-verification-modal")
  if (modal) {
    modal.classList.add("hidden")
  }
})

// Telegram WebApp initialization
const tg = window.Telegram?.WebApp
let telegramUser = null
const TELEGRAM_BOT_CONFIG = {
  botToken: "YOUR_BOT_TOKEN",
  botUsername: "YOUR_BOT_USERNAME",
}

function initTelegram() {
  if (!tg) {
    console.error("[v0] Telegram WebApp not available")
    return false
  }

  // Expand the WebApp
  tg.expand()

  // Get user data from Telegram
  telegramUser = tg.initDataUnsafe?.user

  if (!telegramUser) {
    console.error("[v0] No Telegram user data available")
    return false
  }

  console.log("[v0] Telegram user:", telegramUser)

  // Set theme colors
  document.documentElement.style.setProperty("--tg-theme-bg-color", tg.themeParams.bg_color || "#0a0e27")
  document.documentElement.style.setProperty("--tg-theme-text-color", tg.themeParams.text_color || "#ffffff")

  return true
}

// Get referral parameter from Telegram start param
function getReferralCode() {
  if (!tg || !tg.initDataUnsafe) return null

  const startParam = tg.initDataUnsafe.start_param
  return startParam || null
}

// Send notification to Telegram bot
async function sendTelegramNotification(userId, message) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_CONFIG.botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: userId,
        text: message,
        parse_mode: "HTML",
      }),
    })

    const data = await response.json()
    return data.ok
  } catch (error) {
    console.error("[v0] Error sending Telegram notification:", error)
    return false
  }
}

// Generate referral link
function generateReferralLink(userId) {
  return `https://t.me/${TELEGRAM_BOT_CONFIG.botUsername}/app?startapp=${userId}`
}

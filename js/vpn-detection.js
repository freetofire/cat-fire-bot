// VPN Detection
let isVPNDetected = false

async function detectVPN() {
  try {
    // Check timezone mismatch
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    // Check for common VPN indicators
    const checks = [checkWebRTC(), checkTimezone(), checkIPConsistency()]

    const results = await Promise.all(checks)
    isVPNDetected = results.some((result) => result === true)

    if (isVPNDetected) {
      showVPNWarning()
      return true
    }

    return false
  } catch (error) {
    console.error("[v0] VPN detection error:", error)
    return false
  }
}

// Check WebRTC for IP leaks
function checkWebRTC() {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] })
      const ips = []

      pc.createDataChannel("")
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => {})

      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
          resolve(false)
          return
        }

        const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/
        const match = ipRegex.exec(ice.candidate.candidate)

        if (match) {
          ips.push(match[0])
        }
      }

      setTimeout(() => {
        pc.close()
        // Simple check: if multiple IPs detected, might be VPN
        resolve(ips.length > 2)
      }, 2000)
    } catch (error) {
      resolve(false)
    }
  })
}

// Check timezone consistency
function checkTimezone() {
  return new Promise((resolve) => {
    try {
      const offset = new Date().getTimezoneOffset()
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      // Check if timezone seems suspicious
      // This is a basic check - you can enhance it
      const suspiciousTimezones = ["Etc/GMT", "UTC"]
      const isSuspicious = suspiciousTimezones.some((tz) => timezone.includes(tz))

      resolve(isSuspicious)
    } catch (error) {
      resolve(false)
    }
  })
}

// Check IP consistency (requires external API)
async function checkIPConsistency() {
  try {
    // Using a free IP check API
    const response = await fetch("https://api.ipify.org?format=json")
    const data = await response.json()

    // Store IP for consistency check
    const storedIP = localStorage.getItem("user_ip")

    if (!storedIP) {
      localStorage.setItem("user_ip", data.ip)
      return false
    }

    // If IP changed dramatically, might be VPN
    return storedIP !== data.ip
  } catch (error) {
    return false
  }
}

// Show VPN warning
function showVPNWarning() {
  const vpnWarning = document.getElementById("vpn-warning")
  if (vpnWarning) {
    vpnWarning.classList.remove("hidden")
  }
}

// Hide VPN warning
function hideVPNWarning() {
  const vpnWarning = document.getElementById("vpn-warning")
  if (vpnWarning) {
    vpnWarning.classList.add("hidden")
  }
}

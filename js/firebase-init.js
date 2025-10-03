// Import Firebase
import firebase from "firebase/app"
import "firebase/auth"
import "firebase/firestore"
import "firebase/database"

// Initialize Firebase
const firebaseConfig = {
  // Your Firebase configuration here
}

firebase.initializeApp(firebaseConfig)

const auth = firebase.auth()
const db = firebase.firestore()
const rtdb = firebase.database()

console.log("[v0] Firebase initialized successfully")

// Helper function to get current user data
async function getCurrentUserData(userId) {
  try {
    const userDoc = await db.collection("users").doc(userId).get()
    return userDoc.exists ? userDoc.data() : null
  } catch (error) {
    console.error("[v0] Error getting user data:", error)
    return null
  }
}

// Helper function to update user balance
async function updateUserBalance(userId, amount, type = "add") {
  try {
    const userRef = db.collection("users").doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      console.error("[v0] User not found")
      return false
    }

    const currentBalance = userDoc.data().balance || 0
    const newBalance = type === "add" ? currentBalance + amount : currentBalance - amount

    if (newBalance < 0) {
      console.error("[v0] Insufficient balance")
      return false
    }

    await userRef.update({
      balance: newBalance,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    })

    // Update earnings breakdown
    return true
  } catch (error) {
    console.error("[v0] Error updating balance:", error)
    return false
  }
}

// Helper function to update earnings breakdown
async function updateEarnings(userId, category, amount) {
  try {
    const userRef = db.collection("users").doc(userId)
    const field = `earnings.${category}`

    await userRef.update({
      [field]: firebase.firestore.FieldValue.increment(amount),
    })
  } catch (error) {
    console.error("[v0] Error updating earnings:", error)
  }
}

// Helper function to log transaction
async function logTransaction(userId, type, amount, description) {
  try {
    await db.collection("transactions").add({
      userId,
      type,
      amount,
      description,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error logging transaction:", error)
  }
}

// Helper function to check if user is blocked
async function isUserBlocked(userId) {
  try {
    const userDoc = await db.collection("users").doc(userId).get()
    return userDoc.exists ? userDoc.data().blocked === true : false
  } catch (error) {
    console.error("[v0] Error checking user status:", error)
    return false
  }
}

/**
 * Profile Page JavaScript
 * Handles profile management functionality
 */

// Initialize profile page
document.addEventListener("DOMContentLoaded", () => {
  // Load profile data
  loadProfile()

  // Setup form handlers
  const profileForm = document.getElementById("profileForm")
  if (profileForm) {
    profileForm.addEventListener("submit", handleProfileUpdate)
  }

  const passwordForm = document.getElementById("passwordForm")
  if (passwordForm) {
    passwordForm.addEventListener("submit", handlePasswordChange)
  }

  const deleteAccountForm = document.getElementById("deleteAccountForm")
  if (deleteAccountForm) {
    deleteAccountForm.addEventListener("submit", handleAccountDeletion)
  }

  // Setup delete confirmation
  const deleteConfirmation = document.getElementById("deleteConfirmation")
  const confirmDeleteBtn = document.getElementById("confirmDeleteAccount")

  if (deleteConfirmation && confirmDeleteBtn) {
    deleteConfirmation.addEventListener("input", function () {
      confirmDeleteBtn.disabled = this.value !== "DELETE"
    })

    confirmDeleteBtn.addEventListener("click", handleAccountDeletion)
  }
})

/**
 * Load profile data
 */
function loadProfile() {
  fetch("../php/api/profile.php")
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        populateProfileData(data.profile)
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Error loading profile:", error)
      showAlert("Error loading profile data", "danger")
    })
}

/**
 * Populate profile data in forms
 */
function populateProfileData(profile) {
  // User information
  const nameInput = document.querySelector('input[name="name"]')
  const emailInput = document.querySelector('input[name="email"]')
  const memberSinceInput = document.getElementById("memberSince")

  if (nameInput) nameInput.value = profile.user.name
  if (emailInput) emailInput.value = profile.user.email
  if (memberSinceInput) {
    const memberDate = new Date(profile.user.created_at)
    memberSinceInput.value = memberDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Statistics
  const stats = profile.statistics
  const totalTransactionsElement = document.getElementById("totalTransactions")
  const activeBudgetsElement = document.getElementById("activeBudgets")
  const savingsGoalsElement = document.getElementById("savingsGoals")
  const currentBalanceElement = document.getElementById("currentBalance")

  if (totalTransactionsElement) {
    totalTransactionsElement.textContent = stats.total_transactions
  }

  if (activeBudgetsElement) {
    activeBudgetsElement.textContent = stats.active_budgets
  }

  if (savingsGoalsElement) {
    savingsGoalsElement.textContent = stats.savings_goals
  }

  if (currentBalanceElement) {
    currentBalanceElement.textContent = formatCurrency(stats.current_balance)
    currentBalanceElement.style.color = stats.current_balance >= 0 ? "var(--primary-green)" : "var(--danger-red)"
  }
}

/**
 * Handle profile update
 */
function handleProfileUpdate(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  formData.append("action", "update_profile")

  const submitButton = event.target.querySelector('button[type="submit"]')
  submitButton.disabled = true
  submitButton.textContent = "Updating..."

  fetch("../php/api/profile.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert(data.message, "success")
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Profile update error:", error)
      showAlert("An error occurred while updating profile", "danger")
    })
    .finally(() => {
      submitButton.disabled = false
      submitButton.textContent = "Update Profile"
    })
}

/**
 * Handle password change
 */
function handlePasswordChange(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const newPassword = formData.get("new_password")
  const confirmPassword = formData.get("confirm_password")

  // Validate password match
  if (newPassword !== confirmPassword) {
    showAlert("New passwords do not match", "danger")
    return
  }

  formData.append("action", "change_password")

  const submitButton = event.target.querySelector('button[type="submit"]')
  submitButton.disabled = true
  submitButton.textContent = "Changing..."

  fetch("../php/api/profile.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert(data.message, "success")
        event.target.reset()
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Password change error:", error)
      showAlert("An error occurred while changing password", "danger")
    })
    .finally(() => {
      submitButton.disabled = false
      submitButton.textContent = "Change Password"
    })
}

/**
 * Handle account deletion
 */
function handleAccountDeletion(event) {
  if (event) event.preventDefault()

  const deleteConfirmation = document.getElementById("deleteConfirmation")
  const passwordInput = document.querySelector('#deleteAccountForm input[name="password"]')

  if (deleteConfirmation.value !== "DELETE") {
    showAlert("Please type DELETE to confirm", "danger")
    return
  }

  if (!passwordInput.value) {
    showAlert("Please enter your password", "danger")
    return
  }

  const confirmBtn = document.getElementById("confirmDeleteAccount")
  confirmBtn.disabled = true
  confirmBtn.textContent = "Deleting..."

  const requestData = {
    password: passwordInput.value,
  }

  fetch("../php/api/profile.php", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert("Account deleted successfully. Redirecting...", "success")
        setTimeout(() => {
          window.location.href = "../index.html"
        }, 2000)
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Account deletion error:", error)
      showAlert("An error occurred while deleting account", "danger")
    })
    .finally(() => {
      confirmBtn.disabled = false
      confirmBtn.textContent = "Delete Account"
    })
}

/**
 * Export all user data
 */
function exportAllData(format) {
  const url = `../php/api/export.php?type=all_data&format=${format}`

  // Create temporary link to download file
  const link = document.createElement("a")
  link.href = url
  link.download = `fintech_data_${new Date().toISOString().split("T")[0]}.${format}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  showAlert(`All data exported as ${format.toUpperCase()}`, "success")
}

/**
 * Show modal
 */
function showModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.add("show")
    document.body.style.overflow = "hidden"
  }
}

/**
 * Close modal
 */
function closeModal() {
  const modals = document.querySelectorAll(".modal")
  modals.forEach((modal) => {
    modal.classList.remove("show")
  })
  document.body.style.overflow = "auto"

  // Reset delete confirmation form
  const deleteForm = document.getElementById("deleteAccountForm")
  if (deleteForm) {
    deleteForm.reset()
  }

  const deleteConfirmation = document.getElementById("deleteConfirmation")
  const confirmDeleteBtn = document.getElementById("confirmDeleteAccount")
  if (deleteConfirmation) deleteConfirmation.value = ""
  if (confirmDeleteBtn) confirmDeleteBtn.disabled = true
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

/**
 * Show alert message
 */
function showAlert(message, type = "info") {
  const alertContainer = document.getElementById("alertContainer")
  if (!alertContainer) return

  const alert = document.createElement("div")
  alert.className = `alert alert-${type}`
  alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 1.2rem; cursor: pointer;">&times;</button>
    `

  alertContainer.appendChild(alert)

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (alert.parentElement) {
      alert.remove()
    }
  }, 5000)
}

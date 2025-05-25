/**
 * Authentication JavaScript
 * Handles login, registration, and password reset functionality
 */

// Initialize authentication page
document.addEventListener("DOMContentLoaded", () => {
  // Setup form handlers
  const loginForm = document.getElementById("loginForm")
  const registerForm = document.getElementById("registerForm")
  const forgotPasswordForm = document.getElementById("forgotPasswordForm")
  const resetPasswordForm = document.getElementById("resetPasswordForm")

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin)
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister)
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", handleForgotPassword)
  }

  if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", handleResetPassword)
  }

  // Setup password visibility toggles
  setupPasswordToggles()

  // Setup real-time validation
  setupRealTimeValidation()

  // Check if user is already logged in
  checkAuthStatus()
})

/**
 * Handle login form submission
 */
function handleLogin(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const submitButton = event.target.querySelector('button[type="submit"]')
  const email = formData.get("email")
  const password = formData.get("password")

  // Client-side validation
  if (!email || !password) {
    showAlert("Please fill in all fields", "danger")
    return
  }

  if (!isValidEmail(email)) {
    showAlert("Please enter a valid email address", "danger")
    return
  }

  // Show loading state
  submitButton.disabled = true
  submitButton.innerHTML = '<span class="spinner"></span> Signing In...'

  fetch("../php/auth/login.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert("Login successful! Redirecting...", "success")
        setTimeout(() => {
          window.location.href = "../html/dashboard.html"
        }, 1500)
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Login error:", error)
      showAlert("An error occurred during login. Please try again.", "danger")
    })
    .finally(() => {
      submitButton.disabled = false
      submitButton.innerHTML = "Sign In"
    })
}

/**
 * Handle registration form submission
 */
function handleRegister(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const submitButton = event.target.querySelector('button[type="submit"]')
  const name = formData.get("name")
  const email = formData.get("email")
  const password = formData.get("password")
  const confirmPassword = formData.get("confirm_password")

  // Client-side validation
  if (!name || !email || !password || !confirmPassword) {
    showAlert("Please fill in all fields", "danger")
    return
  }

  if (name.length < 2) {
    showAlert("Name must be at least 2 characters long", "danger")
    return
  }

  if (!isValidEmail(email)) {
    showAlert("Please enter a valid email address", "danger")
    return
  }

  if (password.length < 6) {
    showAlert("Password must be at least 6 characters long", "danger")
    return
  }

  if (password !== confirmPassword) {
    showAlert("Passwords do not match", "danger")
    return
  }

  // Check password strength
  const passwordStrength = checkPasswordStrength(password)
  if (passwordStrength.score < 2) {
    showAlert("Password is too weak. " + passwordStrength.feedback, "danger")
    return
  }

  // Show loading state
  submitButton.disabled = true
  submitButton.innerHTML = '<span class="spinner"></span> Creating Account...'

  fetch("../php/auth/register.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert("Account created successfully! Please log in.", "success")
        setTimeout(() => {
          window.location.href = "../html/login.html"
        }, 2000)
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Registration error:", error)
      showAlert("An error occurred during registration. Please try again.", "danger")
    })
    .finally(() => {
      submitButton.disabled = false
      submitButton.innerHTML = "Create Account"
    })
}

/**
 * Handle forgot password form submission
 */
function handleForgotPassword(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const submitButton = event.target.querySelector('button[type="submit"]')
  const email = formData.get("email")

  if (!email) {
    showAlert("Please enter your email address", "danger")
    return
  }

  if (!isValidEmail(email)) {
    showAlert("Please enter a valid email address", "danger")
    return
  }

  submitButton.disabled = true
  submitButton.innerHTML = '<span class="spinner"></span> Sending...'

  fetch("../php/auth/forgot-password.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert("Password reset instructions sent to your email", "success")
        event.target.reset()
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Forgot password error:", error)
      showAlert("An error occurred. Please try again.", "danger")
    })
    .finally(() => {
      submitButton.disabled = false
      submitButton.innerHTML = "Send Reset Link"
    })
}

/**
 * Validate reset token
 */
function validateResetToken(token) {
  fetch(`../php/auth/reset-password.php?token=${token}`)
    .then((response) => response.json())
    .then((data) => {
      if (!data.success) {
        showAlert(data.message, "danger")
        // Disable form if token is invalid
        const form = document.getElementById("resetPasswordForm")
        if (form) {
          const inputs = form.querySelectorAll("input, button")
          inputs.forEach((input) => (input.disabled = true))
        }
      }
    })
    .catch((error) => {
      console.error("Token validation error:", error)
      showAlert("Error validating reset token", "danger")
    })
}

/**
 * Handle reset password form submission
 */
function handleResetPassword(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const submitButton = event.target.querySelector('button[type="submit"]')
  const password = formData.get("password")
  const confirmPassword = formData.get("confirm_password")

  if (!password || !confirmPassword) {
    showAlert("Please fill in all fields", "danger")
    return
  }

  if (password.length < 6) {
    showAlert("Password must be at least 6 characters long", "danger")
    return
  }

  if (password !== confirmPassword) {
    showAlert("Passwords do not match", "danger")
    return
  }

  const passwordStrength = checkPasswordStrength(password)
  if (passwordStrength.score < 2) {
    showAlert("Password is too weak. " + passwordStrength.feedback, "danger")
    return
  }

  submitButton.disabled = true
  submitButton.innerHTML = '<span class="spinner"></span> Resetting...'

  fetch("../php/auth/reset-password.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert("Password reset successfully! Redirecting to login...", "success")
        setTimeout(() => {
          window.location.href = "../html/login.html"
        }, 2000)
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Reset password error:", error)
      showAlert("An error occurred. Please try again.", "danger")
    })
    .finally(() => {
      submitButton.disabled = false
      submitButton.innerHTML = "Reset Password"
    })
}

/**
 * Setup password visibility toggles
 */
function setupPasswordToggles() {
  const toggleButtons = document.querySelectorAll(".password-toggle")

  toggleButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const input = this.previousElementSibling
      const icon = this.querySelector("i")

      if (input.type === "password") {
        input.type = "text"
        icon.className = "fas fa-eye-slash"
        this.setAttribute("aria-label", "Hide password")
      } else {
        input.type = "password"
        icon.className = "fas fa-eye"
        this.setAttribute("aria-label", "Show password")
      }
    })
  })
}

/**
 * Setup real-time validation
 */
function setupRealTimeValidation() {
  // Email validation
  const emailInputs = document.querySelectorAll('input[type="email"]')
  emailInputs.forEach((input) => {
    input.addEventListener("blur", function () {
      if (this.value && !isValidEmail(this.value)) {
        showFieldError(this, "Please enter a valid email address")
      } else {
        clearFieldError(this)
      }
    })
  })

  // Password strength indicator
  const passwordInputs = document.querySelectorAll('input[name="password"]:not([name="confirm_password"])')
  passwordInputs.forEach((input) => {
    input.addEventListener("input", function () {
      if (this.value.length > 0) {
        const strength = checkPasswordStrength(this.value)
        showPasswordStrength(this, strength)
      } else {
        clearPasswordStrength(this)
      }
    })
  })

  // Confirm password validation
  const confirmPasswordInputs = document.querySelectorAll('input[name="confirm_password"]')
  confirmPasswordInputs.forEach((input) => {
    input.addEventListener("input", function () {
      const passwordInput = document.querySelector('input[name="password"]')
      if (this.value && passwordInput.value !== this.value) {
        showFieldError(this, "Passwords do not match")
      } else {
        clearFieldError(this)
      }
    })
  })
}

/**
 * Check password strength
 */
function checkPasswordStrength(password) {
  let score = 0
  const feedback = []

  // Length check
  if (password.length >= 8) score++
  else feedback.push("Use at least 8 characters")

  // Uppercase check
  if (/[A-Z]/.test(password)) score++
  else feedback.push("Include uppercase letters")

  // Lowercase check
  if (/[a-z]/.test(password)) score++
  else feedback.push("Include lowercase letters")

  // Number check
  if (/\d/.test(password)) score++
  else feedback.push("Include numbers")

  // Special character check
  if (/[^A-Za-z0-9]/.test(password)) score++
  else feedback.push("Include special characters")

  return {
    score: score,
    feedback: feedback.join(", "),
  }
}

/**
 * Show password strength indicator
 */
function showPasswordStrength(input, strength) {
  let indicator = input.parentNode.querySelector(".password-strength")

  if (!indicator) {
    indicator = document.createElement("div")
    indicator.className = "password-strength"
    input.parentNode.appendChild(indicator)
  }

  const strengthLevels = ["Very Weak", "Weak", "Fair", "Good", "Strong"]
  const strengthColors = ["#ff4757", "#ff6b7a", "#ffa502", "#2ed573", "#1e90ff"]

  indicator.innerHTML = `
        <div class="strength-bar">
            <div class="strength-fill" style="width: ${(strength.score / 5) * 100}%; background-color: ${strengthColors[strength.score - 1] || strengthColors[0]}"></div>
        </div>
        <span class="strength-text">${strengthLevels[strength.score - 1] || strengthLevels[0]}</span>
    `
}

/**
 * Clear password strength indicator
 */
function clearPasswordStrength(input) {
  const indicator = input.parentNode.querySelector(".password-strength")
  if (indicator) {
    indicator.remove()
  }
}

/**
 * Show field error
 */
function showFieldError(input, message) {
  clearFieldError(input)

  input.classList.add("error")
  const errorDiv = document.createElement("div")
  errorDiv.className = "field-error"
  errorDiv.textContent = message
  input.parentNode.appendChild(errorDiv)
}

/**
 * Clear field error
 */
function clearFieldError(input) {
  input.classList.remove("error")
  const errorDiv = input.parentNode.querySelector(".field-error")
  if (errorDiv) {
    errorDiv.remove()
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check authentication status
 */
function checkAuthStatus() {
  // If on login/register page and user is already logged in, redirect to dashboard
  const currentPage = window.location.pathname
  if (currentPage.includes("login.html") || currentPage.includes("register.html")) {
    fetch("../php/auth/check_auth.php")
      .then((response) => response.json())
      .then((data) => {
        if (data.authenticated) {
          window.location.href = "../html/dashboard.html"
        }
      })
      .catch((error) => {
        console.log("Auth check failed:", error)
      })
  }
}

/**
 * Logout function
 */
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    fetch("../php/auth/logout.php", {
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          window.location.href = "../index.html"
        }
      })
      .catch((error) => {
        console.error("Logout error:", error)
        // Force redirect even if request fails
        window.location.href = "../index.html"
      })
  }
}

/**
 * Show alert message
 */
function showAlert(message, type = "info") {
  // Remove existing alerts
  const existingAlerts = document.querySelectorAll(".alert")
  existingAlerts.forEach((alert) => alert.remove())

  const alertDiv = document.createElement("div")
  alertDiv.className = `alert alert-${type}`
  alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `

  // Insert at the top of the main content
  const container = document.querySelector(".auth-container") || document.querySelector("main") || document.body
  container.insertBefore(alertDiv, container.firstChild)

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (alertDiv.parentElement) {
      alertDiv.remove()
    }
  }, 5000)
}

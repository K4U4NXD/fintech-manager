import { Chart } from "@/components/ui/chart"
/**
 * FINTECH MANAGER - Main JavaScript File
 * Complete frontend functionality with proper error handling
 */

// Global variables
let currentUser = null
let notifications = []
const charts = {}
let isInitialized = false

// Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
})

/**
 * Initialize the application
 */
async function initializeApp() {
  if (isInitialized) return

  console.log("Initializing FINTECH MANAGER...")

  try {
    // Check authentication status
    await checkAuthStatus()

    // Initialize event listeners
    initializeEventListeners()

    // Load user-specific data if logged in
    if (currentUser) {
      await Promise.all([loadNotifications(), loadDashboardData()])
    }

    // Initialize charts if on dashboard
    if (document.getElementById("incomeExpenseChart")) {
      initializeCharts()
    }

    isInitialized = true
    console.log("FINTECH MANAGER initialized successfully")
  } catch (error) {
    console.error("Initialization error:", error)
    showAlert("❌ Application failed to initialize. Please refresh the page.", "danger")
  }
}

/**
 * Check authentication status
 */
async function checkAuthStatus() {
  const isInSubfolder = window.location.pathname.includes("/html/")
  const authPath = isInSubfolder ? "../php/auth/check_auth.php" : "php/auth/check_auth.php"

  try {
    const response = await fetch(authPath)
    const data = await response.json()

    if (data.authenticated) {
      currentUser = data.user
      updateUIForLoggedInUser()
    } else {
      updateUIForLoggedOutUser()
    }
  } catch (error) {
    console.error("Auth check error:", error)
    updateUIForLoggedOutUser()
  }
}

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
  // Mobile menu toggle
  const menuToggle = document.querySelector(".menu-toggle")
  const sidebar = document.querySelector(".sidebar")

  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("show")
    })
  }

  // Close sidebar when clicking outside
  document.addEventListener("click", (e) => {
    if (sidebar && sidebar.classList.contains("show")) {
      if (!sidebar.contains(e.target) && !menuToggle?.contains(e.target)) {
        sidebar.classList.remove("show")
      }
    }
  })

  // Modal event listeners
  initializeModalListeners()

  // Form event listeners
  initializeFormListeners()

  // Notification bell
  const notificationBell = document.querySelector(".notification-bell")
  if (notificationBell) {
    notificationBell.addEventListener("click", toggleNotifications)
  }

  // Real-time form validation
  setupFormValidation()

  // Keyboard shortcuts
  setupKeyboardShortcuts()

  // Window events
  window.addEventListener("beforeunload", handleBeforeUnload)
  window.addEventListener("online", handleOnline)
  window.addEventListener("offline", handleOffline)
}

/**
 * Initialize modal event listeners
 */
function initializeModalListeners() {
  // Modal close buttons
  document.querySelectorAll(".modal-close").forEach((element) => {
    element.addEventListener("click", closeModal)
  })

  // Close modal when clicking backdrop
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal()
      }
    })
  })

  // Escape key to close modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal()
    }
  })
}

/**
 * Initialize form event listeners
 */
function initializeFormListeners() {
  const forms = {
    loginForm: handleLogin,
    registerForm: handleRegister,
    transactionForm: handleTransactionSubmit,
    budgetForm: handleBudgetSubmit,
    goalForm: handleGoalSubmit,
    addMoneyForm: handleAddMoney,
    profileForm: handleProfileUpdate,
    passwordForm: handlePasswordChange,
    forgotPasswordForm: handleForgotPassword,
    resetPasswordForm: handleResetPassword,
  }

  Object.entries(forms).forEach(([formId, handler]) => {
    const form = document.getElementById(formId)
    if (form) {
      form.addEventListener("submit", handler)
    }
  })

  // Transaction type change handler
  const transactionTypeSelect = document.querySelector('#transactionModal [name="type"]')
  if (transactionTypeSelect) {
    transactionTypeSelect.addEventListener("change", function () {
      updateCategoryOptions(this.value)
    })
  }
}

/**
 * Setup real-time form validation
 */
function setupFormValidation() {
  // Email validation
  document.querySelectorAll('input[type="email"]').forEach((input) => {
    input.addEventListener("blur", () => validateEmailField(input))
    input.addEventListener("input", () => clearFieldError(input))
  })

  // Password validation
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    input.addEventListener("blur", () => validatePasswordField(input))
    input.addEventListener("input", () => clearFieldError(input))
  })

  // Name validation
  document.querySelectorAll('input[name="name"]').forEach((input) => {
    input.addEventListener("blur", () => validateNameField(input))
    input.addEventListener("input", () => clearFieldError(input))
  })

  // Amount validation
  document.querySelectorAll('input[type="number"]').forEach((input) => {
    input.addEventListener("blur", () => validateAmountField(input))
    input.addEventListener("input", () => clearFieldError(input))
  })
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Ctrl/Cmd + N for new transaction
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      e.preventDefault()
      if (currentUser && document.getElementById("transactionModal")) {
        showModal("transactionModal")
      }
    }

    // Ctrl/Cmd + D for dashboard
    if ((e.ctrlKey || e.metaKey) && e.key === "d") {
      e.preventDefault()
      if (currentUser) {
        window.location.href = "dashboard.html"
      }
    }
  })
}

/**
 * Validation functions
 */
function validateEmailField(field) {
  const email = field.value.trim()
  if (!email) {
    showFieldError(field, "Email is required")
    return false
  }
  if (!validateEmail(email)) {
    showFieldError(field, "Please enter a valid email address")
    return false
  }
  clearFieldError(field)
  return true
}

function validatePasswordField(field) {
  const password = field.value
  if (!password) {
    showFieldError(field, "Password is required")
    return false
  }
  if (!validatePassword(password)) {
    showFieldError(field, "Password must be at least 6 characters long")
    return false
  }
  clearFieldError(field)
  return true
}

function validateNameField(field) {
  const name = field.value.trim()
  if (!name) {
    showFieldError(field, "Name is required")
    return false
  }
  if (name.length < 2) {
    showFieldError(field, "Name must be at least 2 characters long")
    return false
  }
  clearFieldError(field)
  return true
}

function validateAmountField(field) {
  const amount = Number.parseFloat(field.value)
  if (isNaN(amount) || amount <= 0) {
    showFieldError(field, "Amount must be greater than 0")
    return false
  }
  clearFieldError(field)
  return true
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validatePassword(password) {
  return password.length >= 6
}

function showFieldError(field, message) {
  clearFieldError(field)
  field.classList.add("error")

  const errorDiv = document.createElement("div")
  errorDiv.className = "field-error"
  errorDiv.textContent = message
  field.parentNode.appendChild(errorDiv)
}

function clearFieldError(field) {
  const existingError = field.parentNode.querySelector(".field-error")
  if (existingError) {
    existingError.remove()
  }
  field.classList.remove("error")
}

/**
 * Form handlers
 */
async function handleLogin(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const email = formData.get("email").trim()
  const password = formData.get("password")
  const submitButton = event.target.querySelector('button[type="submit"]')

  // Validate inputs
  const emailField = event.target.querySelector('input[name="email"]')
  const passwordField = event.target.querySelector('input[name="password"]')

  let hasErrors = false
  if (!validateEmailField(emailField)) hasErrors = true
  if (!validatePasswordField(passwordField)) hasErrors = true

  if (hasErrors) {
    showAlert("❌ Please fix the errors above and try again.", "danger")
    return
  }

  // Show loading state
  setButtonLoading(submitButton, "Logging in...")

  try {
    const cleanFormData = new FormData()
    cleanFormData.append("email", email)
    cleanFormData.append("password", password)

    const response = await fetch("../php/auth/login.php", {
      method: "POST",
      body: cleanFormData,
    })

    const data = await response.json()

    if (data.success) {
      showAlert("✅ Login successful! Redirecting to dashboard...", "success")
      setTimeout(() => {
        window.location.href = "dashboard.html"
      }, 1500)
    } else {
      showAlert("❌ " + data.message, "danger")
    }
  } catch (error) {
    console.error("Login error:", error)
    showAlert("❌ Connection error. Please try again.", "danger")
  } finally {
    resetButtonLoading(submitButton, "Login")
  }
}

async function handleRegister(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const name = formData.get("name").trim()
  const email = formData.get("email").trim()
  const password = formData.get("password")
  const confirmPassword = formData.get("confirm_password")
  const submitButton = event.target.querySelector('button[type="submit"]')

  // Validate inputs
  const nameField = event.target.querySelector('input[name="name"]')
  const emailField = event.target.querySelector('input[name="email"]')
  const passwordField = event.target.querySelector('input[name="password"]')
  const confirmPasswordField = event.target.querySelector('input[name="confirm_password"]')

  let hasErrors = false
  if (!validateNameField(nameField)) hasErrors = true
  if (!validateEmailField(emailField)) hasErrors = true
  if (!validatePasswordField(passwordField)) hasErrors = true

  if (!confirmPassword) {
    showFieldError(confirmPasswordField, "Please confirm your password")
    hasErrors = true
  } else if (password !== confirmPassword) {
    showFieldError(confirmPasswordField, "Passwords do not match")
    hasErrors = true
  }

  if (hasErrors) {
    showAlert("❌ Please fix the errors above and try again.", "danger")
    return
  }

  setButtonLoading(submitButton, "Creating Account...")

  try {
    const cleanFormData = new FormData()
    cleanFormData.append("name", name)
    cleanFormData.append("email", email)
    cleanFormData.append("password", password)

    const response = await fetch("../php/auth/register.php", {
      method: "POST",
      body: cleanFormData,
    })

    const data = await response.json()

    if (data.success) {
      showAlert("🎉 Account created successfully! Redirecting to login page...", "success")
      setTimeout(() => {
        window.location.href = "login.html"
      }, 2000)
    } else {
      showAlert("❌ " + data.message, "danger")
    }
  } catch (error) {
    console.error("Registration error:", error)
    showAlert("❌ Connection error. Please try again.", "danger")
  } finally {
    resetButtonLoading(submitButton, "Create Account")
  }
}

async function handleTransactionSubmit(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const submitButton = event.target.querySelector('button[type="submit"]')

  // Validate required fields
  const type = formData.get("type")
  const category = formData.get("category")
  const amount = formData.get("amount")
  const date = formData.get("date")

  if (!type || !category || !amount || !date) {
    showAlert("⚠️ Please fill in all required fields.", "warning")
    return
  }

  if (Number.parseFloat(amount) <= 0) {
    showAlert("⚠️ Amount must be greater than $0.00", "warning")
    return
  }

  setButtonLoading(submitButton, "Saving...")

  try {
    const transactionId = formData.get("id")
    const method = transactionId ? "PUT" : "POST"
    const url = transactionId ? `../php/api/transactions.php?id=${transactionId}` : "../php/api/transactions.php"

    const response = await fetch(url, {
      method: method,
      body: formData,
    })

    const data = await response.json()

    if (data.success) {
      const action = transactionId ? "updated" : "added"
      const emoji = type === "income" ? "💰" : "💸"
      showAlert(`${emoji} Transaction ${action} successfully!`, "success")

      closeModal()
      event.target.reset()

      // Reload data
      await Promise.all([loadDashboardData(), loadNotifications()])

      // Reload page-specific data
      if (typeof window.loadTransactions === "function") {
        window.loadTransactions()
      }
    } else {
      showAlert("❌ " + data.message, "danger")
    }
  } catch (error) {
    console.error("Transaction error:", error)
    showAlert("❌ Failed to save transaction. Please try again.", "danger")
  } finally {
    resetButtonLoading(submitButton, "Save Transaction")
  }
}

/**
 * Dashboard data management
 */
async function loadDashboardData() {
  if (!currentUser) return

  const isInSubfolder = window.location.pathname.includes("/html/")
  const dashboardPath = isInSubfolder ? "../php/api/dashboard.php" : "php/api/dashboard.php"

  try {
    const response = await fetch(dashboardPath)
    const data = await response.json()

    if (data.success) {
      updateDashboardSummary(data.summary)
      updateRecentTransactions(data.recent_transactions)
      updateChartData(data.chart_data)
    }
  } catch (error) {
    console.error("Dashboard data error:", error)
  }
}

function updateDashboardSummary(summary) {
  const elements = {
    totalBalance: document.getElementById("totalBalance"),
    totalIncome: document.getElementById("totalIncome"),
    totalExpense: document.getElementById("totalExpense"),
  }

  if (elements.totalBalance) {
    elements.totalBalance.textContent = formatCurrency(summary.balance)
    elements.totalBalance.style.color = summary.balance >= 0 ? "var(--primary-green)" : "var(--danger-red)"
  }

  if (elements.totalIncome) {
    elements.totalIncome.textContent = formatCurrency(summary.income)
  }

  if (elements.totalExpense) {
    elements.totalExpense.textContent = formatCurrency(summary.expense)
  }
}

function updateRecentTransactions(transactions) {
  const tbody = document.querySelector("#recentTransactions tbody")
  if (!tbody) return

  tbody.innerHTML = ""

  if (transactions.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center" style="padding: 2rem;">
                    No transactions found. <a href="#" onclick="showModal('transactionModal')">Add your first transaction</a>
                </td>
            </tr>
        `
    return
  }

  transactions.forEach((transaction) => {
    const row = document.createElement("tr")
    row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td>${transaction.category}</td>
            <td>${transaction.note || "-"}</td>
            <td class="${transaction.type === "income" ? "text-success" : "text-danger"}">
                ${transaction.type === "income" ? "+" : "-"}${formatCurrency(transaction.amount)}
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editTransaction(${transaction.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTransaction(${transaction.id})">Delete</button>
            </td>
        `
    tbody.appendChild(row)
  })
}

/**
 * Chart initialization and management
 */
function initializeCharts() {
  // Income vs Expense Chart
  const incomeExpenseCtx = document.getElementById("incomeExpenseChart")
  if (incomeExpenseCtx && typeof Chart !== "undefined") {
    charts.incomeExpense = new Chart(incomeExpenseCtx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Income",
            data: [],
            backgroundColor: "#28a745",
            borderColor: "#28a745",
            borderWidth: 1,
          },
          {
            label: "Expense",
            data: [],
            backgroundColor: "#dc3545",
            borderColor: "#dc3545",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => "$" + value.toLocaleString(),
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
          },
          title: {
            display: true,
            text: "Monthly Income vs Expenses",
          },
        },
      },
    })
  }

  // Category Pie Chart
  const categoryCtx = document.getElementById("categoryChart")
  if (categoryCtx && typeof Chart !== "undefined") {
    charts.category = new Chart(categoryCtx, {
      type: "pie",
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: ["#007bff", "#28a745", "#ffc107", "#dc3545", "#6f42c1", "#fd7e14", "#20c997", "#e83e8c"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
          },
          title: {
            display: true,
            text: "Expenses by Category",
          },
        },
      },
    })
  }
}

function updateChartData(chartData) {
  if (charts.incomeExpense && chartData.monthly) {
    charts.incomeExpense.data.labels = chartData.monthly.labels
    charts.incomeExpense.data.datasets[0].data = chartData.monthly.income
    charts.incomeExpense.data.datasets[1].data = chartData.monthly.expense
    charts.incomeExpense.update()
  }

  if (charts.category && chartData.categories) {
    charts.category.data.labels = chartData.categories.labels
    charts.category.data.datasets[0].data = chartData.categories.data
    charts.category.update()
  }
}

/**
 * Notification management
 */
async function loadNotifications() {
  if (!currentUser) return

  const isInSubfolder = window.location.pathname.includes("/html/")
  const notificationsPath = isInSubfolder ? "../php/api/notifications.php" : "php/api/notifications.php"

  try {
    const response = await fetch(notificationsPath)
    const data = await response.json()

    if (data.success) {
      notifications = data.notifications
      updateNotificationBell()
    }
  } catch (error) {
    console.error("Notifications error:", error)
  }
}

function updateNotificationBell() {
  const notificationCount = document.querySelector(".notification-count")
  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (notificationCount) {
    if (unreadCount > 0) {
      notificationCount.textContent = unreadCount
      notificationCount.style.display = "flex"
    } else {
      notificationCount.style.display = "none"
    }
  }
}

function toggleNotifications() {
  const dropdown = document.getElementById("notificationDropdown")

  if (!dropdown) {
    createNotificationDropdown()
    return
  }

  if (dropdown.classList.contains("show")) {
    dropdown.classList.remove("show")
  } else {
    dropdown.classList.add("show")
    loadNotificationDropdown()
  }
}

function createNotificationDropdown() {
  const notificationBell = document.querySelector(".notification-bell")
  if (!notificationBell) return

  // Remove existing dropdown
  const existingDropdown = document.getElementById("notificationDropdown")
  if (existingDropdown) {
    existingDropdown.remove()
  }

  const dropdown = document.createElement("div")
  dropdown.id = "notificationDropdown"
  dropdown.className = "notification-dropdown"
  dropdown.innerHTML = `
        <div class="notification-header">
            <h4>🔔 Notifications</h4>
            <button onclick="markAllAsRead()" class="btn btn-sm btn-outline">Mark All Read</button>
        </div>
        <div class="notification-list">
            <div class="loading">📡 Loading notifications...</div>
        </div>
    `

  notificationBell.parentNode.style.position = "relative"
  notificationBell.parentNode.appendChild(dropdown)

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!notificationBell.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("show")
    }
  })

  dropdown.classList.add("show")
  loadNotificationDropdown()
}

async function loadNotificationDropdown() {
  const isInSubfolder = window.location.pathname.includes("/html/")
  const notificationsPath = isInSubfolder ? "../php/api/notifications.php" : "php/api/notifications.php"

  try {
    const response = await fetch(notificationsPath)
    const data = await response.json()

    if (data.success) {
      updateNotificationDropdown(data.notifications)
    }
  } catch (error) {
    console.error("Error loading notifications:", error)
    const notificationList = document.querySelector(".notification-list")
    if (notificationList) {
      notificationList.innerHTML = `
                <div class="no-notifications">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">❌</div>
                    <div>Failed to load notifications</div>
                    <small style="color: var(--text-gray);">Please try again later</small>
                </div>
            `
    }
  }
}

function updateNotificationDropdown(notifications) {
  const notificationList = document.querySelector(".notification-list")
  if (!notificationList) return

  if (notifications.length === 0) {
    notificationList.innerHTML = `
            <div class="no-notifications">
                <div style="font-size: 2rem; margin-bottom: 1rem;">🔕</div>
                <div>No notifications yet</div>
                <small style="color: var(--text-gray);">You'll see important updates here</small>
            </div>
        `
    return
  }

  notificationList.innerHTML = notifications
    .map(
      (notification) => `
        <div class="notification-item ${notification.is_read ? "" : "unread"}" onclick="markAsRead(${notification.id})">
            <div class="notification-title">${getNotificationIcon(notification.type)} ${formatNotificationType(notification.type)}</div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${formatTimeAgo(notification.created_at)}</div>
        </div>
    `,
    )
    .join("")
}

function formatNotificationType(type) {
  const typeMap = {
    budget_alert: "Budget Alert",
    goal_achieved: "Goal Achieved",
    reminder: "Reminder",
    info: "Information",
  }
  return typeMap[type] || "Notification"
}

function getNotificationIcon(type) {
  const icons = {
    budget_alert: "⚠️",
    goal_achieved: "🎉",
    reminder: "🔔",
    info: "ℹ️",
  }
  return icons[type] || "ℹ️"
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) return "Just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

async function markAsRead(notificationId) {
  const isInSubfolder = window.location.pathname.includes("/html/")
  const notificationsPath = isInSubfolder ? "../php/api/notifications.php" : "php/api/notifications.php"

  try {
    await fetch(`${notificationsPath}?id=${notificationId}`, {
      method: "PUT",
    })

    await Promise.all([loadNotifications(), loadNotificationDropdown()])
  } catch (error) {
    console.error("Error marking notification as read:", error)
  }
}

async function markAllAsRead() {
  const isInSubfolder = window.location.pathname.includes("/html/")
  const notificationsPath = isInSubfolder ? "../php/api/notifications.php" : "php/api/notifications.php"

  try {
    await fetch(notificationsPath, {
      method: "PUT",
    })

    await Promise.all([loadNotifications(), loadNotificationDropdown()])

    showAlert("✅ All notifications marked as read", "success")
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    showAlert("❌ Failed to mark notifications as read", "danger")
  }
}

/**
 * Modal management
 */
function showModal(modalId) {
  console.log("Showing modal:", modalId)
  const modal = document.getElementById(modalId)
  if (!modal) {
    console.error("Modal not found:", modalId)
    showAlert("❌ Error: Could not open form. Please refresh the page.", "danger")
    return
  }

  // Reset form if it's a transaction modal
  if (modalId === "transactionModal") {
    const form = document.getElementById("transactionForm")
    if (form) {
      form.reset()
      const idField = form.querySelector('[name="id"]')
      if (idField) idField.value = ""

      const dateField = form.querySelector('[name="date"]')
      if (dateField) dateField.value = new Date().toISOString().split("T")[0]
    }

    const modalTitle = modal.querySelector(".modal-title")
    if (modalTitle) modalTitle.textContent = "Add Transaction"
  }

  // Show modal with animation
  modal.style.display = "flex"
  setTimeout(() => {
    modal.classList.add("show")
  }, 10)

  document.body.style.overflow = "hidden"

  // Focus first input
  const firstInput = modal.querySelector("input, select, textarea")
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 300)
  }
}

function closeModal() {
  const modals = document.querySelectorAll(".modal")
  modals.forEach((modal) => {
    modal.classList.remove("show")
    setTimeout(() => {
      modal.style.display = "none"
    }, 300)
  })
  document.body.style.overflow = "auto"
}

/**
 * Specialized modal functions
 */
function showAddIncomeModal() {
  console.log("Showing Add Income Modal")
  showModal("transactionModal")

  setTimeout(() => {
    const typeSelect = document.querySelector('#transactionModal [name="type"]')
    const modalTitle = document.querySelector("#transactionModal .modal-title")

    if (typeSelect) {
      typeSelect.value = "income"
      typeSelect.dispatchEvent(new Event("change"))
      updateCategoryOptions("income")
    }

    if (modalTitle) {
      modalTitle.textContent = "💰 Add Income"
    }
  }, 100)
}

function showAddExpenseModal() {
  console.log("Showing Add Expense Modal")
  showModal("transactionModal")

  setTimeout(() => {
    const typeSelect = document.querySelector('#transactionModal [name="type"]')
    const modalTitle = document.querySelector("#transactionModal .modal-title")

    if (typeSelect) {
      typeSelect.value = "expense"
      typeSelect.dispatchEvent(new Event("change"))
      updateCategoryOptions("expense")
    }

    if (modalTitle) {
      modalTitle.textContent = "💸 Add Expense"
    }
  }, 100)
}

function updateCategoryOptions(type) {
  const categorySelect = document.querySelector('#transactionModal [name="category"]')
  if (!categorySelect) return

  const incomeCategories = [
    { value: "Salary", text: "Salary" },
    { value: "Freelance", text: "Freelance" },
    { value: "Investment", text: "Investment" },
    { value: "Business", text: "Business" },
    { value: "Rental", text: "Rental Income" },
    { value: "Bonus", text: "Bonus" },
    { value: "Gift", text: "Gift" },
    { value: "Other", text: "Other Income" },
  ]

  const expenseCategories = [
    { value: "Food", text: "Food & Dining" },
    { value: "Transportation", text: "Transportation" },
    { value: "Housing", text: "Housing" },
    { value: "Entertainment", text: "Entertainment" },
    { value: "Healthcare", text: "Healthcare" },
    { value: "Shopping", text: "Shopping" },
    { value: "Utilities", text: "Utilities" },
    { value: "Education", text: "Education" },
    { value: "Insurance", text: "Insurance" },
    { value: "Debt", text: "Debt Payment" },
    { value: "Other", text: "Other Expense" },
  ]

  const categories = type === "income" ? incomeCategories : expenseCategories

  categorySelect.innerHTML = '<option value="">Select Category</option>'
  categories.forEach((category) => {
    const option = document.createElement("option")
    option.value = category.value
    option.textContent = category.text
    categorySelect.appendChild(option)
  })
}

/**
 * Transaction management
 */
async function editTransaction(id) {
  try {
    const response = await fetch(`../php/api/transactions.php?id=${id}`)
    const data = await response.json()

    if (data.success) {
      populateTransactionForm(data.transaction)
      document.querySelector(".modal-title").textContent = "Edit Transaction"
      showModal("transactionModal")
    } else {
      showAlert("❌ Failed to load transaction details", "danger")
    }
  } catch (error) {
    console.error("Edit transaction error:", error)
    showAlert("❌ Failed to load transaction details", "danger")
  }
}

async function deleteTransaction(id) {
  if (!confirm("Are you sure you want to delete this transaction?")) {
    return
  }

  try {
    const response = await fetch(`../php/api/transactions.php?id=${id}`, {
      method: "DELETE",
    })

    const data = await response.json()

    if (data.success) {
      showAlert("🗑️ Transaction deleted successfully!", "success")

      // Reload data
      await Promise.all([loadDashboardData(), loadNotifications()])

      if (typeof window.loadTransactions === "function") {
        window.loadTransactions()
      }
    } else {
      showAlert("❌ " + data.message, "danger")
    }
  } catch (error) {
    console.error("Delete transaction error:", error)
    showAlert("❌ Failed to delete transaction", "danger")
  }
}

function populateTransactionForm(transaction) {
  const form = document.getElementById("transactionForm")
  if (!form) return

  const fields = {
    id: transaction.id || "",
    type: transaction.type || "",
    category: transaction.category || "",
    amount: transaction.amount || "",
    tags: transaction.tags || "",
    note: transaction.note || "",
    date: transaction.date || "",
  }

  Object.entries(fields).forEach(([name, value]) => {
    const field = form.querySelector(`[name="${name}"]`)
    if (field) {
      field.value = value
    }
  })
}

/**
 * UI management
 */
function updateUIForLoggedInUser() {
  const userElements = document.querySelectorAll(".user-only")
  const guestElements = document.querySelectorAll(".guest-only")

  userElements.forEach((el) => (el.style.display = "block"))
  guestElements.forEach((el) => (el.style.display = "none"))
}

function updateUIForLoggedOutUser() {
  const userElements = document.querySelectorAll(".user-only")
  const guestElements = document.querySelectorAll(".guest-only")

  userElements.forEach((el) => (el.style.display = "none"))
  guestElements.forEach((el) => (el.style.display = "block"))
}

/**
 * Logout functionality
 */
async function logout() {
  if (!confirm("Are you sure you want to logout?")) {
    return
  }

  showAlert("🔄 Logging out...", "info")

  try {
    const response = await fetch("../php/auth/logout.php", {
      method: "POST",
    })

    const data = await response.json()

    if (data.success) {
      showAlert("👋 Logged out successfully! Redirecting...", "success")
      setTimeout(() => {
        window.location.href = "../index.html"
      }, 1500)
    } else {
      showAlert("❌ Logout failed. Please try again.", "danger")
    }
  } catch (error) {
    console.error("Logout error:", error)
    // Force redirect even if there's an error
    window.location.href = "../index.html"
  }
}

/**
 * Alert system
 */
function showAlert(message, type = "info") {
  console.log("Showing alert:", message, type)

  // Create alert container if it doesn't exist
  let alertContainer = document.getElementById("alertContainer")
  if (!alertContainer) {
    alertContainer = document.createElement("div")
    alertContainer.id = "alertContainer"
    alertContainer.style.cssText = `
            position: fixed;
            top: 90px;
            right: 20px;
            z-index: 3000;
            max-width: 400px;
            width: 100%;
        `
    document.body.appendChild(alertContainer)
  }

  const alert = document.createElement("div")
  alert.className = `alert alert-${type}`
  alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()">&times;</button>
    `

  alertContainer.insertBefore(alert, alertContainer.firstChild)

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (alert.parentElement) {
      alert.remove()
    }
  }, 5000)
}

/**
 * Utility functions
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function setButtonLoading(button, text) {
  button.disabled = true
  button.innerHTML = `<span class="spinner"></span> ${text}`
}

function resetButtonLoading(button, text) {
  button.disabled = false
  button.textContent = text
}

/**
 * Event handlers
 */
function handleBeforeUnload(event) {
  // Check if there are unsaved changes
  const forms = document.querySelectorAll("form")
  for (const form of forms) {
    if (form.checkValidity && form.checkValidity() === false) {
      event.preventDefault()
      event.returnValue = ""
      return ""
    }
  }
}

function handleOnline() {
  showAlert("🌐 Connection restored", "success")
  // Retry any failed requests
  if (currentUser) {
    loadDashboardData()
    loadNotifications()
  }
}

function handleOffline() {
  showAlert("📡 Connection lost. Some features may not work.", "warning")
}

/**
 * Additional form handlers (stubs for other forms)
 */
async function handleBudgetSubmit(event) {
  // Implementation would be similar to handleTransactionSubmit
  console.log("Budget form submitted")
}

async function handleGoalSubmit(event) {
  // Implementation would be similar to handleTransactionSubmit
  console.log("Goal form submitted")
}

async function handleAddMoney(event) {
  // Implementation for adding money to goals
  console.log("Add money form submitted")
}

async function handleProfileUpdate(event) {
  // Implementation for profile updates
  console.log("Profile form submitted")
}

async function handlePasswordChange(event) {
  // Implementation for password changes
  console.log("Password form submitted")
}

async function handleForgotPassword(event) {
  // Implementation for forgot password
  console.log("Forgot password form submitted")
}

async function handleResetPassword(event) {
  // Implementation for reset password
  console.log("Reset password form submitted")
}

// Make functions globally available
window.showModal = showModal
window.closeModal = closeModal
window.showAddIncomeModal = showAddIncomeModal
window.showAddExpenseModal = showAddExpenseModal
window.logout = logout
window.editTransaction = editTransaction
window.deleteTransaction = deleteTransaction
window.markAsRead = markAsRead
window.markAllAsRead = markAllAsRead
window.toggleNotifications = toggleNotifications

// Initialize app when script loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp)
} else {
  initializeApp()
}

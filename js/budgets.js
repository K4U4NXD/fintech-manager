import { Chart } from "@/components/ui/chart"
/**
 * Budgets Page JavaScript
 * Handles budget management functionality
 */

let budgetToDelete = null
let budgetChart = null

// Initialize budgets page
document.addEventListener("DOMContentLoaded", () => {
  // Set default dates for new budget
  const startDateInput = document.querySelector('input[name="start_date"]')
  const endDateInput = document.querySelector('input[name="end_date"]')

  if (startDateInput && endDateInput) {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    startDateInput.value = firstDay.toISOString().split("T")[0]
    endDateInput.value = lastDay.toISOString().split("T")[0]
  }

  // Load budgets
  loadBudgets()

  // Initialize budget chart
  initializeBudgetChart()

  // Setup form handlers
  const budgetForm = document.getElementById("budgetForm")
  if (budgetForm) {
    budgetForm.addEventListener("submit", handleBudgetSubmit)
  }

  // Setup delete confirmation
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn")
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", confirmDeleteBudget)
  }

  // Setup keyboard shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts)
})

/**
 * Initialize budget chart
 */
function initializeBudgetChart() {
  const chartCanvas = document.getElementById("budgetChart")
  if (!chartCanvas) return

  const ctx = chartCanvas.getContext("2d")
  budgetChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: ["#007bff", "#28a745", "#ffc107", "#dc3545", "#6f42c1", "#fd7e14", "#20c997", "#e83e8c"],
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || ""
              const value = formatCurrency(context.parsed)
              const percentage = ((context.parsed / context.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1)
              return `${label}: ${value} (${percentage}%)`
            },
          },
        },
      },
    },
  })
}

/**
 * Load all budgets
 */
function loadBudgets() {
  const loadingSpinner = document.getElementById("loadingSpinner")
  if (loadingSpinner) {
    loadingSpinner.style.display = "block"
  }

  fetch("../php/api/budgets.php")
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        updateBudgetsSummary(data.summary)
        updateBudgetsGrid(data.budgets)
        updateBudgetChart(data.budgets)
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Error loading budgets:", error)
      showAlert("Error loading budgets", "danger")
    })
    .finally(() => {
      if (loadingSpinner) {
        loadingSpinner.style.display = "none"
      }
    })
}

/**
 * Update budgets summary cards
 */
function updateBudgetsSummary(summary) {
  const totalBudgetsElement = document.getElementById("totalBudgets")
  const totalBudgetAmountElement = document.getElementById("totalBudgetAmount")
  const totalSpentElement = document.getElementById("totalSpent")
  const budgetRemainingElement = document.getElementById("budgetRemaining")

  if (totalBudgetsElement) {
    totalBudgetsElement.textContent = summary.total_budgets
  }

  if (totalBudgetAmountElement) {
    totalBudgetAmountElement.textContent = formatCurrency(summary.total_budget_amount)
  }

  if (totalSpentElement) {
    totalSpentElement.textContent = formatCurrency(summary.total_spent)
  }

  if (budgetRemainingElement) {
    budgetRemainingElement.textContent = formatCurrency(summary.total_remaining)
    budgetRemainingElement.className = summary.total_remaining >= 0 ? "text-success" : "text-danger"
  }
}

/**
 * Update budgets grid
 */
function updateBudgetsGrid(budgets) {
  const budgetsGrid = document.getElementById("budgetsGrid")
  const noBudgetsMessage = document.getElementById("noBudgetsMessage")

  if (!budgetsGrid) return

  budgetsGrid.innerHTML = ""

  if (budgets.length === 0) {
    if (noBudgetsMessage) {
      noBudgetsMessage.style.display = "block"
    }
    return
  }

  if (noBudgetsMessage) {
    noBudgetsMessage.style.display = "none"
  }

  budgets.forEach((budget) => {
    const budgetCard = createBudgetCard(budget)
    budgetsGrid.appendChild(budgetCard)
  })
}

/**
 * Update budget chart
 */
function updateBudgetChart(budgets) {
  if (!budgetChart) return

  const activeBudgets = budgets.filter((budget) => budget.is_active)
  const labels = activeBudgets.map((budget) => budget.category)
  const data = activeBudgets.map((budget) => Number.parseFloat(budget.spent))

  budgetChart.data.labels = labels
  budgetChart.data.datasets[0].data = data
  budgetChart.update()
}

/**
 * Create budget card element
 */
function createBudgetCard(budget) {
  const col = document.createElement("div")
  col.className = "col-md-6 col-lg-4"

  const percentage = Math.min(budget.percentage, 100)
  const progressBarClass = getProgressBarClass(budget.status)
  const statusBadge = getStatusBadge(budget.status)
  const isActive = budget.is_active

  col.innerHTML = `
        <div class="card budget-card ${!isActive ? "inactive" : ""}">
            <div class="card-header">
                <div class="budget-header">
                    <div class="budget-title">
                        <i class="fas ${getCategoryIcon(budget.category)}"></i>
                        <h4>${budget.category}</h4>
                    </div>
                    <div class="budget-badges">
                        ${statusBadge}
                        ${!isActive ? '<span class="badge badge-secondary">Inactive</span>' : ""}
                    </div>
                </div>
            </div>
            <div class="card-body">
                <!-- Progress Circle -->
                <div class="budget-progress">
                    <div class="progress-circle">
                        <svg width="100" height="100">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-gray)" stroke-width="6"/>
                            <circle cx="50" cy="50" r="40" fill="none" stroke="${getProgressColor(budget.status)}" 
                                    stroke-width="6" stroke-linecap="round"
                                    stroke-dasharray="${2 * Math.PI * 40}" 
                                    stroke-dashoffset="${2 * Math.PI * 40 * (1 - percentage / 100)}"
                                    style="transition: stroke-dashoffset 0.5s ease;"/>
                        </svg>
                        <div class="progress-text">
                            <span class="percentage">${percentage.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                
                <!-- Budget Details -->
                <div class="budget-details">
                    <div class="detail-row">
                        <span class="label">Spent:</span>
                        <span class="value spent">${formatCurrency(budget.spent)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Budget:</span>
                        <span class="value budget">${formatCurrency(budget.budget_limit)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Remaining:</span>
                        <span class="value remaining ${budget.remaining >= 0 ? "positive" : "negative"}">
                            ${formatCurrency(budget.remaining)}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Period:</span>
                        <span class="value period">${formatDateRange(budget.start_date, budget.end_date)}</span>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="budget-actions">
                    <button class="btn btn-outline btn-sm" onclick="editBudget(${budget.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteBudget(${budget.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `

  return col
}

/**
 * Get progress bar class based on status
 */
function getProgressBarClass(status) {
  switch (status) {
    case "exceeded":
      return "progress-bar-danger"
    case "warning":
      return "progress-bar-warning"
    default:
      return "progress-bar-success"
  }
}

/**
 * Get progress color based on status
 */
function getProgressColor(status) {
  switch (status) {
    case "exceeded":
      return "var(--danger-red)"
    case "warning":
      return "var(--primary-yellow)"
    default:
      return "var(--primary-green)"
  }
}

/**
 * Get status badge
 */
function getStatusBadge(status) {
  switch (status) {
    case "exceeded":
      return '<span class="badge badge-danger"><i class="fas fa-exclamation-triangle"></i> Over Budget</span>'
    case "warning":
      return '<span class="badge badge-warning"><i class="fas fa-exclamation"></i> Near Limit</span>'
    default:
      return '<span class="badge badge-success"><i class="fas fa-check"></i> On Track</span>'
  }
}

/**
 * Get category icon
 */
function getCategoryIcon(category) {
  const icons = {
    "Food & Dining": "fa-utensils",
    Transportation: "fa-car",
    Shopping: "fa-shopping-bag",
    Entertainment: "fa-film",
    "Bills & Utilities": "fa-file-invoice",
    Healthcare: "fa-heartbeat",
    Education: "fa-graduation-cap",
    Travel: "fa-plane",
    Insurance: "fa-shield-alt",
    Savings: "fa-piggy-bank",
    Investment: "fa-chart-line",
    "Other Expense": "fa-circle",
  }

  return icons[category] || "fa-circle"
}

/**
 * Handle budget form submission with validation
 */
function handleBudgetSubmit(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const submitButton = event.target.querySelector('button[type="submit"]')

  // Validate required fields
  const category = formData.get("category")
  const budgetLimit = formData.get("budget_limit")
  const startDate = formData.get("start_date")
  const endDate = formData.get("end_date")

  if (!category || !budgetLimit || !startDate || !endDate) {
    showAlert("Please fill in all required fields", "danger")
    return
  }

  if (Number.parseFloat(budgetLimit) <= 0) {
    showAlert("Budget limit must be greater than 0", "danger")
    return
  }

  if (new Date(startDate) >= new Date(endDate)) {
    showAlert("End date must be after start date", "danger")
    return
  }

  // Check if end date is too far in the future (more than 2 years)
  const twoYearsFromNow = new Date()
  twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2)

  if (new Date(endDate) > twoYearsFromNow) {
    showAlert("Budget period cannot exceed 2 years", "danger")
    return
  }

  submitButton.disabled = true
  submitButton.innerHTML = '<span class="spinner"></span> Saving...'

  const budgetId = formData.get("id")
  const method = budgetId ? "PUT" : "POST"
  const url = budgetId ? `../php/api/budgets.php?id=${budgetId}` : "../php/api/budgets.php"

  fetch(url, {
    method: method,
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert(data.message, "success")
        closeModal()
        loadBudgets()
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Budget error:", error)
      showAlert("An error occurred while saving budget", "danger")
    })
    .finally(() => {
      submitButton.disabled = false
      submitButton.textContent = "Save Budget"
    })
}

/**
 * Edit budget
 */
function editBudget(id) {
  fetch(`../php/api/budgets.php?id=${id}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        populateBudgetForm(data.budget)
        document.querySelector(".modal-title").textContent = "Edit Budget"
        showModal("budgetModal")
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Error loading budget:", error)
      showAlert("Error loading budget", "danger")
    })
}

/**
 * Delete budget
 */
function deleteBudget(id) {
  budgetToDelete = id
  showModal("deleteModal")
}

/**
 * Confirm delete budget
 */
function confirmDeleteBudget() {
  if (!budgetToDelete) return

  const confirmBtn = document.getElementById("confirmDeleteBtn")
  confirmBtn.disabled = true
  confirmBtn.innerHTML = '<span class="spinner"></span> Deleting...'

  fetch(`../php/api/budgets.php?id=${budgetToDelete}`, {
    method: "DELETE",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert("Budget deleted successfully!", "success")
        closeModal()
        loadBudgets()
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Error deleting budget:", error)
      showAlert("Error deleting budget", "danger")
    })
    .finally(() => {
      confirmBtn.disabled = false
      confirmBtn.textContent = "Delete"
      budgetToDelete = null
    })
}

/**
 * Populate budget form with data
 */
function populateBudgetForm(budget) {
  const form = document.getElementById("budgetForm")
  if (!form) return

  form.querySelector('[name="id"]').value = budget.id || ""
  form.querySelector('[name="category"]').value = budget.category || ""
  form.querySelector('[name="budget_limit"]').value = budget.budget_limit || ""
  form.querySelector('[name="start_date"]').value = budget.start_date || ""
  form.querySelector('[name="end_date"]').value = budget.end_date || ""
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
  // Ctrl/Cmd + N: New budget
  if ((event.ctrlKey || event.metaKey) && event.key === "n") {
    event.preventDefault()
    showModal("budgetModal")
  }

  // Escape: Close modal
  if (event.key === "Escape") {
    closeModal()
  }
}

/**
 * Reset budget form when modal is opened for new budget
 */
function showModal(modalId) {
  if (modalId === "budgetModal") {
    const form = document.getElementById("budgetForm")
    if (form) {
      form.reset()
      form.querySelector('[name="id"]').value = ""

      // Set default dates
      const today = new Date()
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

      form.querySelector('[name="start_date"]').value = firstDay.toISOString().split("T")[0]
      form.querySelector('[name="end_date"]').value = lastDay.toISOString().split("T")[0]
    }
    document.querySelector(".modal-title").textContent = "Create Budget"
  }

  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.add("show")
    document.body.style.overflow = "hidden"

    // Focus first input
    const firstInput = modal.querySelector("input, select, textarea")
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100)
    }
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
 * Format date range
 */
function formatDateRange(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const startFormatted = start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const endFormatted = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  return `${startFormatted} - ${endFormatted}`
}

/**
 * Show alert message
 */
function showAlert(message, type = "info") {
  const alertContainer = document.getElementById("alertContainer") || document.body

  // Remove existing alerts
  const existingAlerts = alertContainer.querySelectorAll(".alert")
  existingAlerts.forEach((alert) => alert.remove())

  const alert = document.createElement("div")
  alert.className = `alert alert-${type}`
  alert.innerHTML = `
        <div class="alert-content">
            <i class="fas ${type === "success" ? "fa-check-circle" : type === "danger" ? "fa-exclamation-circle" : "fa-info-circle"}"></i>
            <span>${message}</span>
        </div>
        <button type="button" class="btn-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `

  alertContainer.appendChild(alert)

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (alert.parentElement) {
      alert.remove()
    }
  }, 5000)
}

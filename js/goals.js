import { Chart } from "@/components/ui/chart"
/**
 * Goals Page JavaScript
 * Handles savings goals management functionality
 */

let goalToDelete = null
let currentGoalForMoney = null
let goalsChart = null

// Initialize goals page
document.addEventListener("DOMContentLoaded", () => {
  // Set default target date (6 months from now)
  const targetDateInput = document.querySelector('input[name="target_date"]')
  if (targetDateInput) {
    const sixMonthsFromNow = new Date()
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
    targetDateInput.value = sixMonthsFromNow.toISOString().split("T")[0]
  }

  // Load goals
  loadGoals()

  // Initialize goals chart
  initializeGoalsChart()

  // Setup form handlers
  const goalForm = document.getElementById("goalForm")
  if (goalForm) {
    goalForm.addEventListener("submit", handleGoalSubmit)
  }

  const addMoneyForm = document.getElementById("addMoneyForm")
  if (addMoneyForm) {
    addMoneyForm.addEventListener("submit", handleAddMoney)
  }

  // Setup delete confirmation
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn")
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", confirmDeleteGoal)
  }

  // Setup keyboard shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts)
})

/**
 * Initialize goals chart
 */
function initializeGoalsChart() {
  const chartCanvas = document.getElementById("goalsChart")
  if (!chartCanvas) return

  const ctx = chartCanvas.getContext("2d")
  goalsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Current Amount",
          data: [],
          backgroundColor: "var(--primary-blue)",
          borderRadius: 4,
        },
        {
          label: "Target Amount",
          data: [],
          backgroundColor: "var(--border-gray)",
          borderRadius: 4,
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
            callback: (value) => formatCurrency(value),
          },
        },
      },
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: (context) => context.dataset.label + ": " + formatCurrency(context.parsed.y),
          },
        },
      },
    },
  })
}

/**
 * Load all goals
 */
function loadGoals() {
  const loadingSpinner = document.getElementById("loadingSpinner")
  if (loadingSpinner) {
    loadingSpinner.style.display = "block"
  }

  fetch("../php/api/goals.php")
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        updateGoalsSummary(data.summary)
        updateGoalsGrid(data.goals)
        updateGoalsChart(data.goals)
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Error loading goals:", error)
      showAlert("Error loading goals", "danger")
    })
    .finally(() => {
      if (loadingSpinner) {
        loadingSpinner.style.display = "none"
      }
    })
}

/**
 * Update goals summary cards
 */
function updateGoalsSummary(summary) {
  const totalGoalsElement = document.getElementById("totalGoals")
  const totalTargetAmountElement = document.getElementById("totalTargetAmount")
  const totalSavedAmountElement = document.getElementById("totalSavedAmount")
  const averageProgressElement = document.getElementById("averageProgress")

  if (totalGoalsElement) {
    totalGoalsElement.textContent = summary.total_goals
  }

  if (totalTargetAmountElement) {
    totalTargetAmountElement.textContent = formatCurrency(summary.total_target_amount)
  }

  if (totalSavedAmountElement) {
    totalSavedAmountElement.textContent = formatCurrency(summary.total_saved_amount)
  }

  if (averageProgressElement) {
    averageProgressElement.textContent = summary.average_progress.toFixed(1) + "%"
  }
}

/**
 * Update goals grid
 */
function updateGoalsGrid(goals) {
  const goalsGrid = document.getElementById("goalsGrid")
  const noGoalsMessage = document.getElementById("noGoalsMessage")

  if (!goalsGrid) return

  goalsGrid.innerHTML = ""

  if (goals.length === 0) {
    if (noGoalsMessage) {
      noGoalsMessage.style.display = "block"
    }
    return
  }

  if (noGoalsMessage) {
    noGoalsMessage.style.display = "none"
  }

  goals.forEach((goal) => {
    const goalCard = createGoalCard(goal)
    goalsGrid.appendChild(goalCard)
  })
}

/**
 * Update goals chart
 */
function updateGoalsChart(goals) {
  if (!goalsChart) return

  const labels = goals.map((goal) => (goal.title.length > 15 ? goal.title.substring(0, 15) + "..." : goal.title))
  const currentAmounts = goals.map((goal) => Number.parseFloat(goal.current_amount))
  const targetAmounts = goals.map((goal) => Number.parseFloat(goal.target_amount))

  goalsChart.data.labels = labels
  goalsChart.data.datasets[0].data = currentAmounts
  goalsChart.data.datasets[1].data = targetAmounts
  goalsChart.update()
}

/**
 * Create goal card element
 */
function createGoalCard(goal) {
  const col = document.createElement("div")
  col.className = "col-md-6 col-lg-4"

  const percentage = Math.min(goal.percentage, 100)
  const statusBadge = getGoalStatusBadge(goal.status)
  const progressColor = getProgressColor(goal.status)
  const isCompleted = goal.status === "completed"

  col.innerHTML = `
        <div class="card goal-card ${isCompleted ? "completed" : ""}">
            <div class="card-header">
                <div class="goal-header">
                    <h4 class="goal-title">${goal.title}</h4>
                    ${statusBadge}
                </div>
            </div>
            <div class="card-body">
                <!-- Progress Circle -->
                <div class="goal-progress">
                    <div class="progress-circle">
                        <svg width="120" height="120">
                            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border-gray)" stroke-width="8"/>
                            <circle cx="60" cy="60" r="50" fill="none" stroke="${progressColor}" stroke-width="8" 
                                    stroke-linecap="round"
                                    stroke-dasharray="${2 * Math.PI * 50}" 
                                    stroke-dashoffset="${2 * Math.PI * 50 * (1 - percentage / 100)}"
                                    style="transition: stroke-dashoffset 0.5s ease;"/>
                        </svg>
                        <div class="progress-text">
                            <span class="percentage">${percentage.toFixed(1)}%</span>
                            ${isCompleted ? '<i class="fas fa-check-circle completed-icon"></i>' : ""}
                        </div>
                    </div>
                </div>
                
                <!-- Goal Details -->
                <div class="goal-details">
                    <div class="detail-row">
                        <span class="label">Saved:</span>
                        <span class="value saved">${formatCurrency(goal.current_amount)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Target:</span>
                        <span class="value target">${formatCurrency(goal.target_amount)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Remaining:</span>
                        <span class="value remaining ${goal.remaining > 0 ? "positive" : "zero"}">
                            ${formatCurrency(goal.remaining)}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Target Date:</span>
                        <span class="value date">${formatDate(goal.target_date)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Days ${goal.days_remaining >= 0 ? "Remaining" : "Overdue"}:</span>
                        <span class="value days ${goal.days_remaining >= 0 ? "positive" : "negative"}">
                            ${Math.abs(goal.days_remaining)}
                        </span>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="goal-actions">
                    ${
                      !isCompleted
                        ? `
                        <button class="btn btn-success btn-sm" onclick="showAddMoneyModal(${goal.id})">
                            <i class="fas fa-plus"></i> Add Money
                        </button>
                    `
                        : ""
                    }
                    <button class="btn btn-outline btn-sm" onclick="editGoal(${goal.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteGoal(${goal.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `

  return col
}

/**
 * Get goal status badge
 */
function getGoalStatusBadge(status) {
  switch (status) {
    case "completed":
      return '<span class="badge badge-success"><i class="fas fa-trophy"></i> Completed</span>'
    case "overdue":
      return '<span class="badge badge-danger"><i class="fas fa-clock"></i> Overdue</span>'
    case "on_track":
      return '<span class="badge badge-primary"><i class="fas fa-chart-line"></i> On Track</span>'
    default:
      return '<span class="badge badge-warning"><i class="fas fa-exclamation"></i> Behind</span>'
  }
}

/**
 * Get progress color based on status
 */
function getProgressColor(status) {
  switch (status) {
    case "completed":
      return "var(--primary-green)"
    case "overdue":
      return "var(--danger-red)"
    case "on_track":
      return "var(--primary-blue)"
    default:
      return "var(--primary-yellow)"
  }
}

/**
 * Handle goal form submission with validation
 */
function handleGoalSubmit(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const submitButton = event.target.querySelector('button[type="submit"]')

  // Validate required fields
  const title = formData.get("title")
  const targetAmount = formData.get("target_amount")
  const currentAmount = formData.get("current_amount") || 0
  const targetDate = formData.get("target_date")

  if (!title || !targetAmount || !targetDate) {
    showAlert("Please fill in all required fields", "danger")
    return
  }

  if (title.length < 3) {
    showAlert("Goal title must be at least 3 characters long", "danger")
    return
  }

  if (Number.parseFloat(targetAmount) <= 0) {
    showAlert("Target amount must be greater than 0", "danger")
    return
  }

  if (Number.parseFloat(currentAmount) < 0) {
    showAlert("Current amount cannot be negative", "danger")
    return
  }

  if (Number.parseFloat(currentAmount) > Number.parseFloat(targetAmount)) {
    showAlert("Current amount cannot exceed target amount", "danger")
    return
  }

  if (new Date(targetDate) <= new Date()) {
    showAlert("Target date must be in the future", "danger")
    return
  }

  // Check if target date is too far in the future (more than 10 years)
  const tenYearsFromNow = new Date()
  tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10)

  if (new Date(targetDate) > tenYearsFromNow) {
    showAlert("Target date cannot be more than 10 years in the future", "danger")
    return
  }

  submitButton.disabled = true
  submitButton.innerHTML = '<span class="spinner"></span> Saving...'

  const goalId = formData.get("id")
  const method = goalId ? "PUT" : "POST"
  const url = goalId ? `../php/api/goals.php?id=${goalId}` : "../php/api/goals.php"

  fetch(url, {
    method: method,
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert(data.message, "success")
        closeModal()
        loadGoals()
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Goal error:", error)
      showAlert("An error occurred while saving goal", "danger")
    })
    .finally(() => {
      submitButton.disabled = false
      submitButton.textContent = "Save Goal"
    })
}

/**
 * Show add money modal
 */
function showAddMoneyModal(goalId) {
  currentGoalForMoney = goalId
  const form = document.getElementById("addMoneyForm")
  if (form) {
    form.reset()
    form.querySelector('[name="goal_id"]').value = goalId
  }
  showModal("addMoneyModal")
}

/**
 * Handle add money form submission
 */
function handleAddMoney(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  formData.append("action", "add_money")

  const amount = formData.get("amount")

  if (!amount || Number.parseFloat(amount) <= 0) {
    showAlert("Please enter a valid amount", "danger")
    return
  }

  const submitButton = event.target.querySelector('button[type="submit"]')
  submitButton.disabled = true
  submitButton.innerHTML = '<span class="spinner"></span> Adding...'

  fetch("../php/api/goals.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert(data.message, "success")
        closeModal()
        loadGoals()
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Add money error:", error)
      showAlert("An error occurred while adding money", "danger")
    })
    .finally(() => {
      submitButton.disabled = false
      submitButton.textContent = "Add Money"
    })
}

/**
 * Edit goal
 */
function editGoal(id) {
  fetch(`../php/api/goals.php?id=${id}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        populateGoalForm(data.goal)
        document.querySelector(".modal-title").textContent = "Edit Savings Goal"
        showModal("goalModal")
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Error loading goal:", error)
      showAlert("Error loading goal", "danger")
    })
}

/**
 * Delete goal
 */
function deleteGoal(id) {
  goalToDelete = id
  showModal("deleteModal")
}

/**
 * Confirm delete goal
 */
function confirmDeleteGoal() {
  if (!goalToDelete) return

  const confirmBtn = document.getElementById("confirmDeleteBtn")
  confirmBtn.disabled = true
  confirmBtn.innerHTML = '<span class="spinner"></span> Deleting...'

  fetch(`../php/api/goals.php?id=${goalToDelete}`, {
    method: "DELETE",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert("Goal deleted successfully!", "success")
        closeModal()
        loadGoals()
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Error deleting goal:", error)
      showAlert("Error deleting goal", "danger")
    })
    .finally(() => {
      confirmBtn.disabled = false
      confirmBtn.textContent = "Delete"
      goalToDelete = null
    })
}

/**
 * Populate goal form with data
 */
function populateGoalForm(goal) {
  const form = document.getElementById("goalForm")
  if (!form) return

  form.querySelector('[name="id"]').value = goal.id || ""
  form.querySelector('[name="title"]').value = goal.title || ""
  form.querySelector('[name="target_amount"]').value = goal.target_amount || ""
  form.querySelector('[name="current_amount"]').value = goal.current_amount || ""
  form.querySelector('[name="target_date"]').value = goal.target_date || ""
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
  // Ctrl/Cmd + N: New goal
  if ((event.ctrlKey || event.metaKey) && event.key === "n") {
    event.preventDefault()
    showModal("goalModal")
  }

  // Escape: Close modal
  if (event.key === "Escape") {
    closeModal()
  }
}

/**
 * Reset goal form when modal is opened for new goal
 */
function showModal(modalId) {
  if (modalId === "goalModal") {
    const form = document.getElementById("goalForm")
    if (form) {
      form.reset()
      form.querySelector('[name="id"]').value = ""

      // Set default target date (6 months from now)
      const sixMonthsFromNow = new Date()
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
      form.querySelector('[name="target_date"]').value = sixMonthsFromNow.toISOString().split("T")[0]
    }
    document.querySelector(".modal-title").textContent = "Create Savings Goal"
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
 * Format date
 */
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
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

import { Chart } from "@/components/ui/chart"
/**
 * Transactions Page JavaScript
 * Handles transaction management functionality
 */

let currentPage = 1
let currentFilters = {}
let transactionToDelete = null
let transactionChart = null

// Initialize transactions page
document.addEventListener("DOMContentLoaded", () => {
  // Set today's date as default for new transactions
  const dateInput = document.querySelector('input[name="date"]')
  if (dateInput) {
    dateInput.value = new Date().toISOString().split("T")[0]
  }

  // Load initial transactions
  loadTransactions()

  // Initialize chart
  initializeTransactionChart()

  // Setup search functionality
  const searchInput = document.getElementById("searchInput")
  if (searchInput) {
    let searchTimeout
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        currentFilters.search = this.value
        currentPage = 1
        loadTransactions()
      }, 500)
    })
  }

  // Setup filter form
  const filterForm = document.getElementById("filterForm")
  if (filterForm) {
    filterForm.addEventListener("submit", handleFilter)
  }

  // Setup transaction form
  const transactionForm = document.getElementById("transactionForm")
  if (transactionForm) {
    transactionForm.addEventListener("submit", handleTransactionSubmit)

    // Setup dynamic category updates
    const typeSelect = transactionForm.querySelector('select[name="type"]')
    if (typeSelect) {
      typeSelect.addEventListener("change", updateCategoriesForType)
    }
  }

  // Setup delete confirmation
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn")
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", confirmDeleteTransaction)
  }

  // Setup keyboard shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts)
})

/**
 * Initialize transaction chart
 */
function initializeTransactionChart() {
  const chartCanvas = document.getElementById("transactionChart")
  if (!chartCanvas) return

  const ctx = chartCanvas.getContext("2d")
  transactionChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Income",
          data: [],
          borderColor: "var(--primary-green)",
          backgroundColor: "rgba(46, 213, 115, 0.1)",
          tension: 0.4,
        },
        {
          label: "Expenses",
          data: [],
          borderColor: "var(--danger-red)",
          backgroundColor: "rgba(255, 71, 87, 0.1)",
          tension: 0.4,
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
 * Load transactions with current filters and pagination
 */
function loadTransactions() {
  const loadingSpinner = document.getElementById("loadingSpinner")
  if (loadingSpinner) {
    loadingSpinner.style.display = "block"
  }

  // Build query parameters
  const params = new URLSearchParams({
    page: currentPage,
    limit: 20,
    ...currentFilters,
  })

  fetch(`../php/api/transactions.php?${params}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        updateTransactionsTable(data.transactions)
        updatePagination(data.pagination)
        updateFilteredSummary(data.transactions)
        updateTransactionChart(data.transactions)
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Error loading transactions:", error)
      showAlert("Error loading transactions", "danger")
    })
    .finally(() => {
      if (loadingSpinner) {
        loadingSpinner.style.display = "none"
      }
    })
}

/**
 * Update transactions table with data
 */
function updateTransactionsTable(transactions) {
  const tbody = document.querySelector("#transactionsTable tbody")
  if (!tbody) return

  tbody.innerHTML = ""

  if (transactions.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="padding: 2rem;">
                    <div class="empty-state">
                        <i class="fas fa-receipt fa-3x" style="color: var(--text-gray); margin-bottom: 1rem;"></i>
                        <h3>No transactions found</h3>
                        <p>Start by adding your first transaction</p>
                        <button class="btn btn-primary" onclick="showModal('transactionModal')">
                            <i class="fas fa-plus"></i> Add Transaction
                        </button>
                    </div>
                </td>
            </tr>
        `
    return
  }

  transactions.forEach((transaction) => {
    const row = document.createElement("tr")
    const typeClass = transaction.type === "income" ? "text-success" : "text-danger"
    const typeSymbol = transaction.type === "income" ? "+" : "-"
    const typeIcon = transaction.type === "income" ? "fa-arrow-up" : "fa-arrow-down"

    row.innerHTML = `
            <td>
                <div class="transaction-date">
                    <strong>${formatDate(transaction.date)}</strong>
                    <small>${formatTime(transaction.created_at)}</small>
                </div>
            </td>
            <td>
                <span class="badge ${transaction.type === "income" ? "badge-success" : "badge-danger"}">
                    <i class="fas ${typeIcon}"></i>
                    ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                </span>
            </td>
            <td>
                <div class="category-cell">
                    <i class="fas ${getCategoryIcon(transaction.category)}"></i>
                    ${transaction.category}
                </div>
            </td>
            <td class="${typeClass}">
                <strong>${typeSymbol}${formatCurrency(transaction.amount)}</strong>
            </td>
            <td>
                ${
                  transaction.tags
                    ? transaction.tags
                        .split(",")
                        .map((tag) => `<span class="tag">${tag.trim()}</span>`)
                        .join(" ")
                    : '<span class="text-muted">-</span>'
                }
            </td>
            <td>
                <div class="note-cell" title="${transaction.note || ""}">
                    ${
                      transaction.note
                        ? transaction.note.length > 50
                          ? transaction.note.substring(0, 50) + "..."
                          : transaction.note
                        : '<span class="text-muted">-</span>'
                    }
                </div>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline" onclick="editTransaction(${transaction.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTransaction(${transaction.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `

    tbody.appendChild(row)
  })
}

/**
 * Update transaction chart
 */
function updateTransactionChart(transactions) {
  if (!transactionChart) return

  // Group transactions by date
  const dailyData = {}
  transactions.forEach((transaction) => {
    const date = transaction.date
    if (!dailyData[date]) {
      dailyData[date] = { income: 0, expense: 0 }
    }
    dailyData[date][transaction.type] += Number.parseFloat(transaction.amount)
  })

  // Sort dates and prepare chart data
  const sortedDates = Object.keys(dailyData).sort()
  const incomeData = sortedDates.map((date) => dailyData[date].income)
  const expenseData = sortedDates.map((date) => dailyData[date].expense)

  transactionChart.data.labels = sortedDates.map((date) => formatDate(date))
  transactionChart.data.datasets[0].data = incomeData
  transactionChart.data.datasets[1].data = expenseData
  transactionChart.update()
}

/**
 * Update pagination controls
 */
function updatePagination(pagination) {
  const paginationContainer = document.getElementById("pagination")
  if (!paginationContainer) return

  paginationContainer.innerHTML = ""

  if (pagination.pages <= 1) return

  // Previous button
  if (pagination.page > 1) {
    const prevBtn = createPaginationButton("Previous", pagination.page - 1, "fas fa-chevron-left")
    paginationContainer.appendChild(prevBtn)
  }

  // Page numbers
  const startPage = Math.max(1, pagination.page - 2)
  const endPage = Math.min(pagination.pages, pagination.page + 2)

  if (startPage > 1) {
    const firstBtn = createPaginationButton("1", 1)
    paginationContainer.appendChild(firstBtn)
    if (startPage > 2) {
      const ellipsis = document.createElement("span")
      ellipsis.textContent = "..."
      ellipsis.className = "pagination-ellipsis"
      paginationContainer.appendChild(ellipsis)
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = createPaginationButton(i, i, null, i === pagination.page)
    paginationContainer.appendChild(pageBtn)
  }

  if (endPage < pagination.pages) {
    if (endPage < pagination.pages - 1) {
      const ellipsis = document.createElement("span")
      ellipsis.textContent = "..."
      ellipsis.className = "pagination-ellipsis"
      paginationContainer.appendChild(ellipsis)
    }
    const lastBtn = createPaginationButton(pagination.pages, pagination.pages)
    paginationContainer.appendChild(lastBtn)
  }

  // Next button
  if (pagination.page < pagination.pages) {
    const nextBtn = createPaginationButton("Next", pagination.page + 1, "fas fa-chevron-right")
    paginationContainer.appendChild(nextBtn)
  }
}

/**
 * Create pagination button
 */
function createPaginationButton(text, page, icon = null, isActive = false) {
  const button = document.createElement("button")
  button.className = `btn ${isActive ? "btn-primary" : "btn-outline"}`

  if (icon) {
    button.innerHTML = `<i class="${icon}"></i> ${text}`
  } else {
    button.textContent = text
  }

  if (!isActive) {
    button.addEventListener("click", () => {
      currentPage = page
      loadTransactions()
    })
  }

  return button
}

/**
 * Update filtered summary cards
 */
function updateFilteredSummary(transactions) {
  let totalIncome = 0
  let totalExpense = 0
  const transactionCount = transactions.length

  transactions.forEach((transaction) => {
    if (transaction.type === "income") {
      totalIncome += Number.parseFloat(transaction.amount)
    } else {
      totalExpense += Number.parseFloat(transaction.amount)
    }
  })

  const balance = totalIncome - totalExpense

  const incomeElement = document.getElementById("filteredIncome")
  const expenseElement = document.getElementById("filteredExpense")
  const balanceElement = document.getElementById("filteredBalance")
  const countElement = document.getElementById("transactionCount")

  if (incomeElement) incomeElement.textContent = formatCurrency(totalIncome)
  if (expenseElement) expenseElement.textContent = formatCurrency(totalExpense)
  if (countElement) countElement.textContent = transactionCount

  if (balanceElement) {
    balanceElement.textContent = formatCurrency(balance)
    balanceElement.className = balance >= 0 ? "text-success" : "text-danger"
  }
}

/**
 * Handle filter form submission
 */
function handleFilter(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  currentFilters = {}

  for (const [key, value] of formData.entries()) {
    if (value.trim()) {
      currentFilters[key] = value.trim()
    }
  }

  currentPage = 1
  loadTransactions()
}

/**
 * Clear all filters
 */
function clearFilters() {
  const filterForm = document.getElementById("filterForm")
  if (filterForm) {
    filterForm.reset()
  }

  const searchInput = document.getElementById("searchInput")
  if (searchInput) {
    searchInput.value = ""
  }

  currentFilters = {}
  currentPage = 1
  loadTransactions()
}

/**
 * Handle transaction form submission with proper validation
 */
function handleTransactionSubmit(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const submitButton = event.target.querySelector('button[type="submit"]')

  // Validate required fields
  const type = formData.get("type")
  const category = formData.get("category")
  const amount = formData.get("amount")
  const date = formData.get("date")

  if (!type || !category || !amount || !date) {
    showAlert("Please fill in all required fields", "danger")
    return
  }

  if (Number.parseFloat(amount) <= 0) {
    showAlert("Amount must be greater than 0", "danger")
    return
  }

  // Check if date is not in the future
  const selectedDate = new Date(date)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today

  if (selectedDate > today) {
    showAlert("Transaction date cannot be in the future", "danger")
    return
  }

  submitButton.disabled = true
  submitButton.innerHTML = '<span class="spinner"></span> Saving...'

  const transactionId = formData.get("id")
  const method = transactionId ? "PUT" : "POST"
  const url = transactionId ? `../php/api/transactions.php?id=${transactionId}` : "../php/api/transactions.php"

  fetch(url, {
    method: method,
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert(data.message, "success")
        closeModal()
        loadTransactions()

        // Update dashboard if function exists
        if (typeof loadDashboardData === "function") {
          loadDashboardData()
        }
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Transaction error:", error)
      showAlert("An error occurred while saving transaction", "danger")
    })
    .finally(() => {
      submitButton.disabled = false
      submitButton.textContent = "Save Transaction"
    })
}

/**
 * Update categories based on transaction type
 */
function updateCategoriesForType() {
  const typeSelect = document.querySelector('select[name="type"]')
  const categorySelect = document.querySelector('select[name="category"]')

  if (!typeSelect || !categorySelect) return

  const type = typeSelect.value
  const categories = {
    income: [
      "Salary",
      "Freelance",
      "Business",
      "Investment",
      "Rental",
      "Gift",
      "Bonus",
      "Commission",
      "Dividend",
      "Other Income",
    ],
    expense: [
      "Food & Dining",
      "Transportation",
      "Shopping",
      "Entertainment",
      "Bills & Utilities",
      "Healthcare",
      "Education",
      "Travel",
      "Insurance",
      "Savings",
      "Investment",
      "Other Expense",
    ],
  }

  // Clear current options
  categorySelect.innerHTML = '<option value="">Select Category</option>'

  // Add categories for selected type
  if (categories[type]) {
    categories[type].forEach((category) => {
      const option = document.createElement("option")
      option.value = category
      option.textContent = category
      categorySelect.appendChild(option)
    })
  }
}

/**
 * Edit transaction
 */
function editTransaction(id) {
  fetch(`../php/api/transactions.php?id=${id}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        populateTransactionForm(data.transaction)
        document.querySelector(".modal-title").textContent = "Edit Transaction"
        showModal("transactionModal")
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Error loading transaction:", error)
      showAlert("Error loading transaction", "danger")
    })
}

/**
 * Delete transaction
 */
function deleteTransaction(id) {
  transactionToDelete = id
  showModal("deleteModal")
}

/**
 * Confirm delete transaction
 */
function confirmDeleteTransaction() {
  if (!transactionToDelete) return

  const confirmBtn = document.getElementById("confirmDeleteBtn")
  confirmBtn.disabled = true
  confirmBtn.innerHTML = '<span class="spinner"></span> Deleting...'

  fetch(`../php/api/transactions.php?id=${transactionToDelete}`, {
    method: "DELETE",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showAlert("Transaction deleted successfully!", "success")
        closeModal()
        loadTransactions()
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Error deleting transaction:", error)
      showAlert("Error deleting transaction", "danger")
    })
    .finally(() => {
      confirmBtn.disabled = false
      confirmBtn.textContent = "Delete"
      transactionToDelete = null
    })
}

/**
 * Populate transaction form with data
 */
function populateTransactionForm(transaction) {
  const form = document.getElementById("transactionForm")
  if (!form) return

  form.querySelector('[name="id"]').value = transaction.id || ""
  form.querySelector('[name="type"]').value = transaction.type || ""

  // Update categories first, then set category
  updateCategoriesForType()
  setTimeout(() => {
    form.querySelector('[name="category"]').value = transaction.category || ""
  }, 100)

  form.querySelector('[name="amount"]').value = transaction.amount || ""
  form.querySelector('[name="tags"]').value = transaction.tags || ""
  form.querySelector('[name="note"]').value = transaction.note || ""
  form.querySelector('[name="date"]').value = transaction.date || ""
}

/**
 * Export transactions
 */
function exportTransactions(format) {
  const params = new URLSearchParams({
    type: "transactions",
    format: format,
    ...currentFilters,
  })

  const url = `../php/api/export.php?${params}`

  // Create temporary link to download file
  const link = document.createElement("a")
  link.href = url
  link.download = `transactions_${new Date().toISOString().split("T")[0]}.${format}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  showAlert(`Transactions exported as ${format.toUpperCase()}`, "success")
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
  // Ctrl/Cmd + N: New transaction
  if ((event.ctrlKey || event.metaKey) && event.key === "n") {
    event.preventDefault()
    showModal("transactionModal")
  }

  // Escape: Close modal
  if (event.key === "Escape") {
    closeModal()
  }
}

/**
 * Get category icon
 */
function getCategoryIcon(category) {
  const icons = {
    Salary: "fa-briefcase",
    Freelance: "fa-laptop",
    Business: "fa-building",
    Investment: "fa-chart-line",
    Rental: "fa-home",
    Gift: "fa-gift",
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
  }

  return icons[category] || "fa-circle"
}

/**
 * Reset transaction form when modal is opened for new transaction
 */
function showModal(modalId) {
  if (modalId === "transactionModal") {
    const form = document.getElementById("transactionForm")
    if (form) {
      form.reset()
      form.querySelector('[name="id"]').value = ""
      form.querySelector('[name="date"]').value = new Date().toISOString().split("T")[0]

      // Reset categories
      updateCategoriesForType()
    }
    document.querySelector(".modal-title").textContent = "Add Transaction"
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
 * Format time
 */
function formatTime(dateTimeString) {
  const date = new Date(dateTimeString)
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
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

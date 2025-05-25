import { Chart } from "@/components/ui/chart"
/**
 * Reports Page JavaScript
 * Handles report generation and visualization
 */

let currentReportData = null
let mainChart = null
let categoryChart = null

// Initialize reports page
document.addEventListener("DOMContentLoaded", () => {
  // Initialize charts
  initializeCharts()

  // Load default report
  generateReport()

  // Setup form handler
  const reportForm = document.getElementById("reportFiltersForm")
  if (reportForm) {
    reportForm.addEventListener("submit", handleReportGeneration)
  }

  // Setup date range change handler
  const dateRangeSelect = document.querySelector('select[name="date_range"]')
  if (dateRangeSelect) {
    dateRangeSelect.addEventListener("change", function () {
      toggleCustomDates(this.value)
    })
  }

  // Setup keyboard shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts)
})

/**
 * Initialize chart instances
 */
function initializeCharts() {
  // Main chart (line/bar chart)
  const mainCtx = document.getElementById("mainChart")
  if (mainCtx) {
    mainChart = new Chart(mainCtx, {
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
            fill: true,
          },
          {
            label: "Expenses",
            data: [],
            borderColor: "var(--danger-red)",
            backgroundColor: "rgba(255, 71, 87, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
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

  // Category chart (doughnut chart)
  const categoryCtx = document.getElementById("categoryChart")
  if (categoryCtx) {
    categoryChart = new Chart(categoryCtx, {
      type: "doughnut",
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: [
              "#007bff",
              "#28a745",
              "#ffc107",
              "#dc3545",
              "#6f42c1",
              "#fd7e14",
              "#20c997",
              "#e83e8c",
              "#17a2b8",
              "#6c757d",
              "#343a40",
              "#f8f9fa",
            ],
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
            labels: {
              padding: 20,
              usePointStyle: true,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || ""
                const value = formatCurrency(context.parsed)
                const total = context.dataset.data.reduce((a, b) => a + b, 0)
                const percentage = ((context.parsed / total) * 100).toFixed(1)
                return `${label}: ${value} (${percentage}%)`
              },
            },
          },
        },
      },
    })
  }
}

/**
 * Toggle custom date inputs
 */
function toggleCustomDates(value) {
  const startDateGroup = document.getElementById("startDateGroup")
  const endDateGroup = document.getElementById("endDateGroup")

  if (value === "custom") {
    startDateGroup.style.display = "block"
    endDateGroup.style.display = "block"

    // Set default dates if empty
    const startInput = startDateGroup.querySelector("input")
    const endInput = endDateGroup.querySelector("input")

    if (!startInput.value) {
      const firstDayOfMonth = new Date()
      firstDayOfMonth.setDate(1)
      startInput.value = firstDayOfMonth.toISOString().split("T")[0]
    }

    if (!endInput.value) {
      endInput.value = new Date().toISOString().split("T")[0]
    }
  } else {
    startDateGroup.style.display = "none"
    endDateGroup.style.display = "none"
  }
}

/**
 * Handle report generation form submission
 */
function handleReportGeneration(event) {
  event.preventDefault()
  generateReport()
}

/**
 * Generate report based on current filters
 */
function generateReport() {
  const form = document.getElementById("reportFiltersForm")
  const formData = new FormData(form)
  const params = new URLSearchParams(formData)

  const loadingSpinner = document.getElementById("loadingSpinner")
  if (loadingSpinner) {
    loadingSpinner.style.display = "block"
  }

  // Validate custom date range
  if (formData.get("date_range") === "custom") {
    const startDate = formData.get("start_date")
    const endDate = formData.get("end_date")

    if (!startDate || !endDate) {
      showAlert("Please select both start and end dates for custom range", "danger")
      if (loadingSpinner) loadingSpinner.style.display = "none"
      return
    }

    if (new Date(startDate) >= new Date(endDate)) {
      showAlert("End date must be after start date", "danger")
      if (loadingSpinner) loadingSpinner.style.display = "none"
      return
    }
  }

  fetch(`../php/api/reports.php?${params}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        currentReportData = data.report
        updateReportDisplay(data.report)
      } else {
        showAlert(data.message, "danger")
      }
    })
    .catch((error) => {
      console.error("Report generation error:", error)
      showAlert("Error generating report", "danger")
    })
    .finally(() => {
      if (loadingSpinner) {
        loadingSpinner.style.display = "none"
      }
    })
}

/**
 * Update report display with new data
 */
function updateReportDisplay(report) {
  // Update summary cards
  updateSummaryCards(report)

  // Update charts
  updateCharts(report)

  // Update report content
  updateReportContent(report)

  // Update report header
  updateReportHeader(report)
}

/**
 * Update report header
 */
function updateReportHeader(report) {
  const reportTitle = document.getElementById("reportTitle")
  const reportPeriod = document.getElementById("reportPeriod")

  if (reportTitle) {
    const titles = {
      summary: "Financial Summary Report",
      detailed: "Detailed Transaction Report",
      category: "Category Analysis Report",
      monthly: "Monthly Breakdown Report",
    }
    reportTitle.textContent = titles[report.type] || "Financial Report"
  }

  if (reportPeriod) {
    reportPeriod.textContent = `Period: ${report.period}`
  }
}

/**
 * Update summary cards
 */
function updateSummaryCards(report) {
  let income = 0
  let expense = 0
  let transactionCount = 0

  if (report.summary) {
    income = report.summary.income || 0
    expense = report.summary.expense || 0
    transactionCount = report.summary.transaction_count || 0
  }

  const balance = income - expense

  const incomeElement = document.getElementById("reportIncome")
  const expenseElement = document.getElementById("reportExpense")
  const balanceElement = document.getElementById("reportBalance")
  const transactionsElement = document.getElementById("reportTransactions")

  if (incomeElement) incomeElement.textContent = formatCurrency(income)
  if (expenseElement) expenseElement.textContent = formatCurrency(expense)
  if (transactionsElement) transactionsElement.textContent = transactionCount

  if (balanceElement) {
    balanceElement.textContent = formatCurrency(balance)
    balanceElement.className = balance >= 0 ? "text-success" : "text-danger"
  }
}

/**
 * Update charts with report data
 */
function updateCharts(report) {
  if (report.type === "summary" || report.type === "monthly") {
    updateMainChart(report)
    updateCategoryChart(report)
  }
}

/**
 * Update main chart
 */
function updateMainChart(report) {
  if (!mainChart) return

  let labels = []
  let incomeData = []
  let expenseData = []

  if (report.daily_trends) {
    // Process daily trends
    const dailyData = {}
    report.daily_trends.forEach((item) => {
      const date = item.transaction_date
      if (!dailyData[date]) {
        dailyData[date] = { income: 0, expense: 0 }
      }
      dailyData[date][item.type] = Number.parseFloat(item.daily_total)
    })

    labels = Object.keys(dailyData).sort()
    incomeData = labels.map((date) => dailyData[date].income)
    expenseData = labels.map((date) => dailyData[date].expense)

    // Format labels for better display
    labels = labels.map((date) => formatDate(date))
  } else if (report.monthly_data) {
    // Process monthly data
    const monthlyData = {}
    report.monthly_data.forEach((item) => {
      const month = item.month
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0 }
      }
      monthlyData[month][item.type] = Number.parseFloat(item.total_amount)
    })

    labels = Object.keys(monthlyData).sort()
    incomeData = labels.map((month) => monthlyData[month].income)
    expenseData = labels.map((month) => monthlyData[month].expense)

    // Format labels for better display
    labels = labels.map((month) => formatMonth(month))
  }

  mainChart.data.labels = labels
  mainChart.data.datasets[0].data = incomeData
  mainChart.data.datasets[1].data = expenseData
  mainChart.update()
}

/**
 * Update category chart
 */
function updateCategoryChart(report) {
  if (!categoryChart) return

  let labels = []
  let data = []

  if (report.categories) {
    // Filter expense categories for pie chart
    const expenseCategories = report.categories.filter((cat) => cat.type === "expense")
    labels = expenseCategories.map((cat) => cat.category)
    data = expenseCategories.map((cat) => Number.parseFloat(cat.total))
  }

  categoryChart.data.labels = labels
  categoryChart.data.datasets[0].data = data
  categoryChart.update()
}

/**
 * Update report content table
 */
function updateReportContent(report) {
  const reportContent = document.getElementById("reportContent")
  const reportTableTitle = document.getElementById("reportTableTitle")

  if (!reportContent) return

  let content = ""

  switch (report.type) {
    case "summary":
      content = generateSummaryTable(report)
      if (reportTableTitle) reportTableTitle.textContent = "Category Summary"
      break
    case "detailed":
      content = generateDetailedTable(report)
      if (reportTableTitle) reportTableTitle.textContent = "Detailed Transactions"
      break
    case "category":
      content = generateCategoryTable(report)
      if (reportTableTitle) reportTableTitle.textContent = "Category Analysis"
      break
    case "monthly":
      content = generateMonthlyTable(report)
      if (reportTableTitle) reportTableTitle.textContent = "Monthly Breakdown"
      break
  }

  reportContent.innerHTML = content
}

/**
 * Generate summary table
 */
function generateSummaryTable(report) {
  if (!report.categories || report.categories.length === 0) {
    return `
            <div class="empty-state">
                <i class="fas fa-chart-bar fa-3x" style="color: var(--text-gray); margin-bottom: 1rem;"></i>
                <h3>No data available</h3>
                <p>No transactions found for the selected period.</p>
            </div>
        `
  }

  const totalAmount = report.categories.reduce((sum, cat) => sum + Number.parseFloat(cat.total), 0)

  let html = `
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Type</th>
                        <th>Transactions</th>
                        <th>Total Amount</th>
                        <th>Percentage</th>
                        <th>Trend</th>
                    </tr>
                </thead>
                <tbody>
    `

  report.categories.forEach((category) => {
    const percentage = totalAmount > 0 ? ((category.total / totalAmount) * 100).toFixed(1) : 0
    const typeClass = category.type === "income" ? "text-success" : "text-danger"
    const typeIcon = category.type === "income" ? "fa-arrow-up" : "fa-arrow-down"

    html += `
            <tr>
                <td>
                    <div class="category-cell">
                        <i class="fas ${getCategoryIcon(category.category)}"></i>
                        ${category.category}
                    </div>
                </td>
                <td>
                    <span class="badge badge-${category.type === "income" ? "success" : "danger"}">
                        <i class="fas ${typeIcon}"></i>
                        ${category.type}
                    </span>
                </td>
                <td>${category.count}</td>
                <td class="${typeClass}">
                    <strong>${formatCurrency(category.total)}</strong>
                </td>
                <td>
                    <div class="percentage-bar">
                        <div class="percentage-fill" style="width: ${percentage}%"></div>
                        <span class="percentage-text">${percentage}%</span>
                    </div>
                </td>
                <td>
                    <i class="fas fa-chart-line text-muted" title="Trend analysis coming soon"></i>
                </td>
            </tr>
        `
  })

  html += `
                </tbody>
            </table>
        </div>
    `

  return html
}

/**
 * Generate detailed table
 */
function generateDetailedTable(report) {
  if (!report.transactions || report.transactions.length === 0) {
    return `
            <div class="empty-state">
                <i class="fas fa-receipt fa-3x" style="color: var(--text-gray); margin-bottom: 1rem;"></i>
                <h3>No transactions found</h3>
                <p>No transactions found for the selected period.</p>
            </div>
        `
  }

  let html = `
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Tags</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
    `

  report.transactions.forEach((transaction) => {
    const typeClass = transaction.type === "income" ? "text-success" : "text-danger"
    const typeSymbol = transaction.type === "income" ? "+" : "-"
    const typeIcon = transaction.type === "income" ? "fa-arrow-up" : "fa-arrow-down"

    html += `
            <tr>
                <td>${formatDate(transaction.date)}</td>
                <td>
                    <span class="badge badge-${transaction.type === "income" ? "success" : "danger"}">
                        <i class="fas ${typeIcon}"></i>
                        ${transaction.type}
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
                        ${transaction.note || '<span class="text-muted">-</span>'}
                    </div>
                </td>
            </tr>
        `
  })

  html += `
                </tbody>
            </table>
        </div>
    `

  return html
}

/**
 * Generate category table
 */
function generateCategoryTable(report) {
  if (!report.categories || report.categories.length === 0) {
    return `
            <div class="empty-state">
                <i class="fas fa-tags fa-3x" style="color: var(--text-gray); margin-bottom: 1rem;"></i>
                <h3>No category data</h3>
                <p>No category data available for the selected period.</p>
            </div>
        `
  }

  let html = `
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Type</th>
                        <th>Transactions</th>
                        <th>Total</th>
                        <th>Average</th>
                        <th>Min</th>
                        <th>Max</th>
                    </tr>
                </thead>
                <tbody>
    `

  report.categories.forEach((category) => {
    const typeClass = category.type === "income" ? "text-success" : "text-danger"
    const typeIcon = category.type === "income" ? "fa-arrow-up" : "fa-arrow-down"

    html += `
            <tr>
                <td>
                    <div class="category-cell">
                        <i class="fas ${getCategoryIcon(category.category)}"></i>
                        ${category.category}
                    </div>
                </td>
                <td>
                    <span class="badge badge-${category.type === "income" ? "success" : "danger"}">
                        <i class="fas ${typeIcon}"></i>
                        ${category.type}
                    </span>
                </td>
                <td>${category.transaction_count}</td>
                <td class="${typeClass}">
                    <strong>${formatCurrency(category.total_amount)}</strong>
                </td>
                <td>${formatCurrency(category.avg_amount)}</td>
                <td>${formatCurrency(category.min_amount)}</td>
                <td>${formatCurrency(category.max_amount)}</td>
            </tr>
        `
  })

  html += `
                </tbody>
            </table>
        </div>
    `

  return html
}

/**
 * Generate monthly table
 */
function generateMonthlyTable(report) {
  if (!report.monthly_data || report.monthly_data.length === 0) {
    return `
            <div class="empty-state">
                <i class="fas fa-calendar fa-3x" style="color: var(--text-gray); margin-bottom: 1rem;"></i>
                <h3>No monthly data</h3>
                <p>No monthly data available for the selected period.</p>
            </div>
        `
  }

  // Process monthly data
  const monthlyData = {}
  report.monthly_data.forEach((item) => {
    const month = item.month
    if (!monthlyData[month]) {
      monthlyData[month] = { income: 0, expense: 0, income_count: 0, expense_count: 0 }
    }
    monthlyData[month][item.type] = Number.parseFloat(item.total_amount)
    monthlyData[month][item.type + "_count"] = Number.parseInt(item.transaction_count)
  })

  let html = `
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Income</th>
                        <th>Expenses</th>
                        <th>Net</th>
                        <th>Transactions</th>
                        <th>Savings Rate</th>
                    </tr>
                </thead>
                <tbody>
    `

  Object.keys(monthlyData)
    .sort()
    .forEach((month) => {
      const data = monthlyData[month]
      const net = data.income - data.expense
      const totalTransactions = data.income_count + data.expense_count
      const savingsRate = data.income > 0 ? ((net / data.income) * 100).toFixed(1) : 0

      html += `
            <tr>
                <td><strong>${formatMonth(month)}</strong></td>
                <td class="text-success">${formatCurrency(data.income)}</td>
                <td class="text-danger">${formatCurrency(data.expense)}</td>
                <td class="${net >= 0 ? "text-success" : "text-danger"}">
                    <strong>${formatCurrency(net)}</strong>
                </td>
                <td>${totalTransactions}</td>
                <td>
                    <span class="badge badge-${savingsRate >= 20 ? "success" : savingsRate >= 10 ? "warning" : "danger"}">
                        ${savingsRate}%
                    </span>
                </td>
            </tr>
        `
    })

  html += `
                </tbody>
            </table>
        </div>
    `

  return html
}

/**
 * Export report data
 */
function exportReport(format) {
  if (!currentReportData) {
    showAlert("No report data to export", "warning")
    return
  }

  const form = document.getElementById("reportFiltersForm")
  const formData = new FormData(form)
  const params = new URLSearchParams(formData)
  params.append("type", "report")
  params.append("format", format)

  const url = `../php/api/export.php?${params}`

  // Create temporary link to download file
  const link = document.createElement("a")
  link.href = url
  link.download = `report_${new Date().toISOString().split("T")[0]}.${format}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  showAlert(`Report exported as ${format.toUpperCase()}`, "success")
}

/**
 * Export chart as image
 */
function exportChart() {
  if (!mainChart) {
    showAlert("No chart to export", "warning")
    return
  }

  const link = document.createElement("a")
  link.download = `chart_${new Date().toISOString().split("T")[0]}.png`
  link.href = mainChart.toBase64Image()
  link.click()

  showAlert("Chart exported as PNG", "success")
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
  // Ctrl/Cmd + R: Refresh report
  if ((event.ctrlKey || event.metaKey) && event.key === "r") {
    event.preventDefault()
    generateReport()
  }

  // Ctrl/Cmd + E: Export report
  if ((event.ctrlKey || event.metaKey) && event.key === "e") {
    event.preventDefault()
    exportReport("csv")
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
 * Format month
 */
function formatMonth(monthString) {
  const date = new Date(monthString + "-01")
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
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

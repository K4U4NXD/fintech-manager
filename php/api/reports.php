<?php
/**
 * Reports API Endpoint
 * Handles financial report generation
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../auth/auth.php';

// Check authentication
$auth = new Auth();
if (!$auth->isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $database = new Database();
    $conn = $database->getConnection();
    $user_id = $auth->getCurrentUserId();
    
    $report_type = $_GET['report_type'] ?? 'summary';
    $date_range = $_GET['date_range'] ?? 'this_month';
    $start_date = $_GET['start_date'] ?? '';
    $end_date = $_GET['end_date'] ?? '';
    
    // Calculate date range
    $dates = calculateDateRange($date_range, $start_date, $end_date);
    
    switch ($report_type) {
        case 'summary':
            $report = generateSummaryReport($conn, $user_id, $dates);
            break;
        case 'detailed':
            $report = generateDetailedReport($conn, $user_id, $dates);
            break;
        case 'category':
            $report = generateCategoryReport($conn, $user_id, $dates);
            break;
        case 'monthly':
            $report = generateMonthlyReport($conn, $user_id, $dates);
            break;
        default:
            $report = generateSummaryReport($conn, $user_id, $dates);
    }
    
    echo json_encode(['success' => true, 'report' => $report]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

/**
 * Calculate date range based on selection
 */
function calculateDateRange($range, $start_date = '', $end_date = '') {
    $today = new DateTime();
    
    switch ($range) {
        case 'this_month':
            $start = new DateTime('first day of this month');
            $end = new DateTime('last day of this month');
            break;
        case 'last_month':
            $start = new DateTime('first day of last month');
            $end = new DateTime('last day of last month');
            break;
        case 'this_year':
            $start = new DateTime('first day of January this year');
            $end = new DateTime('last day of December this year');
            break;
        case 'last_year':
            $start = new DateTime('first day of January last year');
            $end = new DateTime('last day of December last year');
            break;
        case 'last_6_months':
            $start = new DateTime('-6 months');
            $end = $today;
            break;
        case 'custom':
            $start = new DateTime($start_date);
            $end = new DateTime($end_date);
            break;
        default:
            $start = new DateTime('first day of this month');
            $end = new DateTime('last day of this month');
    }
    
    return [
        'start' => $start->format('Y-m-d'),
        'end' => $end->format('Y-m-d'),
        'label' => formatDateRangeLabel($start, $end)
    ];
}

/**
 * Format date range label
 */
function formatDateRangeLabel($start, $end) {
    if ($start->format('Y-m') === $end->format('Y-m')) {
        return $start->format('F Y');
    } elseif ($start->format('Y') === $end->format('Y')) {
        return $start->format('M') . ' - ' . $end->format('M Y');
    } else {
        return $start->format('M Y') . ' - ' . $end->format('M Y');
    }
}

/**
 * Generate summary report
 */
function generateSummaryReport($conn, $user_id, $dates) {
    // Get summary data
    $summary_query = "
        SELECT 
            type,
            COUNT(*) as transaction_count,
            SUM(amount) as total_amount
        FROM transactions 
        WHERE user_id = :user_id 
        AND date BETWEEN :start_date AND :end_date
        GROUP BY type
    ";
    
    $stmt = $conn->prepare($summary_query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':start_date', $dates['start']);
    $stmt->bindParam(':end_date', $dates['end']);
    $stmt->execute();
    
    $summary = ['income' => 0, 'expense' => 0, 'income_count' => 0, 'expense_count' => 0];
    while ($row = $stmt->fetch()) {
        $summary[$row['type']] = $row['total_amount'];
        $summary[$row['type'] . '_count'] = $row['transaction_count'];
    }
    
    // Get category breakdown
    $category_query = "
        SELECT 
            category,
            type,
            COUNT(*) as count,
            SUM(amount) as total
        FROM transactions 
        WHERE user_id = :user_id 
        AND date BETWEEN :start_date AND :end_date
        GROUP BY category, type
        ORDER BY total DESC
    ";
    
    $stmt = $conn->prepare($category_query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':start_date', $dates['start']);
    $stmt->bindParam(':end_date', $dates['end']);
    $stmt->execute();
    
    $categories = [];
    while ($row = $stmt->fetch()) {
        $categories[] = $row;
    }
    
    // Get daily trends
    $daily_query = "
        SELECT 
            DATE(date) as transaction_date,
            type,
            SUM(amount) as daily_total
        FROM transactions 
        WHERE user_id = :user_id 
        AND date BETWEEN :start_date AND :end_date
        GROUP BY DATE(date), type
        ORDER BY transaction_date
    ";
    
    $stmt = $conn->prepare($daily_query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':start_date', $dates['start']);
    $stmt->bindParam(':end_date', $dates['end']);
    $stmt->execute();
    
    $daily_trends = [];
    while ($row = $stmt->fetch()) {
        $daily_trends[] = $row;
    }
    
    return [
        'type' => 'summary',
        'period' => $dates['label'],
        'summary' => $summary,
        'categories' => $categories,
        'daily_trends' => $daily_trends,
        'date_range' => $dates
    ];
}

/**
 * Generate detailed report
 */
function generateDetailedReport($conn, $user_id, $dates) {
    $query = "
        SELECT *
        FROM transactions 
        WHERE user_id = :user_id 
        AND date BETWEEN :start_date AND :end_date
        ORDER BY date DESC, id DESC
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':start_date', $dates['start']);
    $stmt->bindParam(':end_date', $dates['end']);
    $stmt->execute();
    
    $transactions = $stmt->fetchAll();
    
    // Calculate totals
    $total_income = 0;
    $total_expense = 0;
    $transaction_count = count($transactions);
    
    foreach ($transactions as $transaction) {
        if ($transaction['type'] === 'income') {
            $total_income += $transaction['amount'];
        } else {
            $total_expense += $transaction['amount'];
        }
    }
    
    return [
        'type' => 'detailed',
        'period' => $dates['label'],
        'transactions' => $transactions,
        'summary' => [
            'income' => $total_income,
            'expense' => $total_expense,
            'balance' => $total_income - $total_expense,
            'transaction_count' => $transaction_count
        ],
        'date_range' => $dates
    ];
}

/**
 * Generate category report
 */
function generateCategoryReport($conn, $user_id, $dates) {
    $query = "
        SELECT 
            category,
            type,
            COUNT(*) as transaction_count,
            SUM(amount) as total_amount,
            AVG(amount) as avg_amount,
            MIN(amount) as min_amount,
            MAX(amount) as max_amount
        FROM transactions 
        WHERE user_id = :user_id 
        AND date BETWEEN :start_date AND :end_date
        GROUP BY category, type
        ORDER BY total_amount DESC
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':start_date', $dates['start']);
    $stmt->bindParam(':end_date', $dates['end']);
    $stmt->execute();
    
    $categories = $stmt->fetchAll();
    
    return [
        'type' => 'category',
        'period' => $dates['label'],
        'categories' => $categories,
        'date_range' => $dates
    ];
}

/**
 * Generate monthly report
 */
function generateMonthlyReport($conn, $user_id, $dates) {
    $query = "
        SELECT 
            DATE_FORMAT(date, '%Y-%m') as month,
            type,
            COUNT(*) as transaction_count,
            SUM(amount) as total_amount
        FROM transactions 
        WHERE user_id = :user_id 
        AND date BETWEEN :start_date AND :end_date
        GROUP BY DATE_FORMAT(date, '%Y-%m'), type
        ORDER BY month, type
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':start_date', $dates['start']);
    $stmt->bindParam(':end_date', $dates['end']);
    $stmt->execute();
    
    $monthly_data = $stmt->fetchAll();
    
    return [
        'type' => 'monthly',
        'period' => $dates['label'],
        'monthly_data' => $monthly_data,
        'date_range' => $dates
    ];
}
?>

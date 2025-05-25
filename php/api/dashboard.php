<?php
/**
 * Dashboard API Endpoint
 * Provides dashboard data including summary and charts
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

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
    
    // Get current month summary
    $current_month = date('Y-m');
    
    // Calculate total balance (all time income - all time expenses)
    $balance_query = "
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance
        FROM transactions 
        WHERE user_id = :user_id
    ";
    $balance_stmt = $conn->prepare($balance_query);
    $balance_stmt->bindParam(':user_id', $user_id);
    $balance_stmt->execute();
    $balance = $balance_stmt->fetch()['balance'];
    
    // Get current month income and expenses
    $monthly_query = "
        SELECT 
            type,
            COALESCE(SUM(amount), 0) as total
        FROM transactions 
        WHERE user_id = :user_id 
        AND DATE_FORMAT(date, '%Y-%m') = :current_month
        GROUP BY type
    ";
    $monthly_stmt = $conn->prepare($monthly_query);
    $monthly_stmt->bindParam(':user_id', $user_id);
    $monthly_stmt->bindParam(':current_month', $current_month);
    $monthly_stmt->execute();
    
    $monthly_data = ['income' => 0, 'expense' => 0];
    while ($row = $monthly_stmt->fetch()) {
        $monthly_data[$row['type']] = $row['total'];
    }
    
    // Get recent transactions (last 10)
    $recent_query = "
        SELECT id, type, category, amount, note, date
        FROM transactions 
        WHERE user_id = :user_id 
        ORDER BY date DESC, id DESC 
        LIMIT 10
    ";
    $recent_stmt = $conn->prepare($recent_query);
    $recent_stmt->bindParam(':user_id', $user_id);
    $recent_stmt->execute();
    $recent_transactions = $recent_stmt->fetchAll();
    
    // Get chart data - last 6 months
    $chart_query = "
        SELECT 
            DATE_FORMAT(date, '%Y-%m') as month,
            type,
            SUM(amount) as total
        FROM transactions 
        WHERE user_id = :user_id 
        AND date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(date, '%Y-%m'), type
        ORDER BY month
    ";
    $chart_stmt = $conn->prepare($chart_query);
    $chart_stmt->bindParam(':user_id', $user_id);
    $chart_stmt->execute();
    $chart_data_raw = $chart_stmt->fetchAll();
    
    // Process chart data
    $months = [];
    $income_data = [];
    $expense_data = [];
    
    // Get last 6 months
    for ($i = 5; $i >= 0; $i--) {
        $month = date('Y-m', strtotime("-$i months"));
        $months[] = date('M Y', strtotime($month . '-01'));
        $income_data[$month] = 0;
        $expense_data[$month] = 0;
    }
    
    // Fill with actual data
    foreach ($chart_data_raw as $row) {
        if ($row['type'] === 'income') {
            $income_data[$row['month']] = $row['total'];
        } else {
            $expense_data[$row['month']] = $row['total'];
        }
    }
    
    // Get category breakdown for pie chart
    $category_query = "
        SELECT 
            category,
            SUM(amount) as total
        FROM transactions 
        WHERE user_id = :user_id 
        AND type = 'expense'
        AND DATE_FORMAT(date, '%Y-%m') = :current_month
        GROUP BY category
        ORDER BY total DESC
    ";
    $category_stmt = $conn->prepare($category_query);
    $category_stmt->bindParam(':user_id', $user_id);
    $category_stmt->bindParam(':current_month', $current_month);
    $category_stmt->execute();
    $category_data = $category_stmt->fetchAll();
    
    $category_labels = [];
    $category_amounts = [];
    foreach ($category_data as $row) {
        $category_labels[] = $row['category'];
        $category_amounts[] = $row['total'];
    }
    
    // Prepare response
    $response = [
        'success' => true,
        'summary' => [
            'balance' => $balance,
            'income' => $monthly_data['income'],
            'expense' => $monthly_data['expense']
        ],
        'recent_transactions' => $recent_transactions,
        'chart_data' => [
            'monthly' => [
                'labels' => $months,
                'income' => array_values($income_data),
                'expense' => array_values($expense_data)
            ],
            'categories' => [
                'labels' => $category_labels,
                'data' => $category_amounts
            ]
        ]
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>

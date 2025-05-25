<?php
/**
 * Export API Endpoint
 * Handles data export in various formats
 */

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
    
    $type = $_GET['type'] ?? 'transactions';
    $format = $_GET['format'] ?? 'csv';
    
    // Get data based on type
    switch ($type) {
        case 'transactions':
            $data = exportTransactions($conn, $user_id, $_GET);
            $filename = 'transactions_' . date('Y-m-d');
            break;
        case 'budgets':
            $data = exportBudgets($conn, $user_id);
            $filename = 'budgets_' . date('Y-m-d');
            break;
        case 'goals':
            $data = exportGoals($conn, $user_id);
            $filename = 'goals_' . date('Y-m-d');
            break;
        case 'report':
            $data = exportReport($conn, $user_id, $_GET);
            $filename = 'report_' . date('Y-m-d');
            break;
        default:
            throw new Exception('Invalid export type');
    }
    
    // Export in requested format
    if ($format === 'csv') {
        exportCSV($data, $filename);
    } elseif ($format === 'xlsx') {
        exportExcel($data, $filename);
    } else {
        throw new Exception('Invalid export format');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Export error: ' . $e->getMessage()]);
}

/**
 * Export transactions data
 */
function exportTransactions($conn, $user_id, $filters) {
    $where_conditions = ['user_id = :user_id'];
    $params = [':user_id' => $user_id];
    
    // Apply filters
    if (!empty($filters['type'])) {
        $where_conditions[] = 'type = :type';
        $params[':type'] = $filters['type'];
    }
    
    if (!empty($filters['category'])) {
        $where_conditions[] = 'category = :category';
        $params[':category'] = $filters['category'];
    }
    
    if (!empty($filters['start_date'])) {
        $where_conditions[] = 'date >= :start_date';
        $params[':start_date'] = $filters['start_date'];
    }
    
    if (!empty($filters['end_date'])) {
        $where_conditions[] = 'date <= :end_date';
        $params[':end_date'] = $filters['end_date'];
    }
    
    $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);
    
    $query = "
        SELECT date, type, category, amount, tags, note
        FROM transactions 
        $where_clause 
        ORDER BY date DESC
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->execute($params);
    
    return [
        'headers' => ['Date', 'Type', 'Category', 'Amount', 'Tags', 'Description'],
        'data' => $stmt->fetchAll(PDO::FETCH_NUM)
    ];
}

/**
 * Export to CSV format
 */
function exportCSV($data, $filename) {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="' . $filename . '.csv"');
    
    $output = fopen('php://output', 'w');
    
    // Write headers
    fputcsv($output, $data['headers']);
    
    // Write data
    foreach ($data['data'] as $row) {
        fputcsv($output, $row);
    }
    
    fclose($output);
}

/**
 * Export to Excel format (simplified CSV with .xlsx extension)
 * For full Excel support, consider using PhpSpreadsheet library
 */
function exportExcel($data, $filename) {
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="' . $filename . '.xlsx"');
    
    // For now, export as CSV with Excel headers
    // In production, use PhpSpreadsheet for proper Excel format
    exportCSV($data, $filename);
}

/**
 * Export budgets data
 */
function exportBudgets($conn, $user_id) {
    $query = "
        SELECT category, budget_limit, start_date, end_date, created_at
        FROM budgets 
        WHERE user_id = :user_id 
        ORDER BY created_at DESC
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    
    return [
        'headers' => ['Category', 'Budget Limit', 'Start Date', 'End Date', 'Created'],
        'data' => $stmt->fetchAll(PDO::FETCH_NUM)
    ];
}

/**
 * Export goals data
 */
function exportGoals($conn, $user_id) {
    $query = "
        SELECT title, target_amount, current_amount, target_date, created_at
        FROM goals 
        WHERE user_id = :user_id 
        ORDER BY created_at DESC
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    
    return [
        'headers' => ['Goal Title', 'Target Amount', 'Current Amount', 'Target Date', 'Created'],
        'data' => $stmt->fetchAll(PDO::FETCH_NUM)
    ];
}
?>

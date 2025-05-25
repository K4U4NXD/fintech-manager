<?php
/**
 * Budgets API Endpoint
 * Handles CRUD operations for budgets
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
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
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            handleGetBudgets($conn, $user_id);
            break;
            
        case 'POST':
            handleCreateBudget($conn, $user_id);
            break;
            
        case 'PUT':
            handleUpdateBudget($conn, $user_id);
            break;
            
        case 'DELETE':
            handleDeleteBudget($conn, $user_id);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

/**
 * Handle GET request - Fetch budgets with spending data
 */
function handleGetBudgets($conn, $user_id) {
    // Get single budget if ID is provided
    if (!empty($_GET['id'])) {
        $query = "SELECT * FROM budgets WHERE id = :id AND user_id = :user_id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $_GET['id']);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        $budget = $stmt->fetch();
        
        if ($budget) {
            echo json_encode(['success' => true, 'budget' => $budget]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Budget not found']);
        }
        return;
    }
    
    // Get all budgets with spending data
    $query = "
        SELECT 
            b.*,
            COALESCE(SUM(t.amount), 0) as spent
        FROM budgets b
        LEFT JOIN transactions t ON (
            t.user_id = b.user_id 
            AND t.category = b.category 
            AND t.type = 'expense'
            AND t.date BETWEEN b.start_date AND b.end_date
        )
        WHERE b.user_id = :user_id
        GROUP BY b.id
        ORDER BY b.created_at DESC
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    $budgets = $stmt->fetchAll();
    
    // Calculate summary statistics
    $total_budgets = count($budgets);
    $total_budget_amount = 0;
    $total_spent = 0;
    
    foreach ($budgets as &$budget) {
        $total_budget_amount += $budget['budget_limit'];
        $total_spent += $budget['spent'];
        
        // Calculate percentage and status
        $budget['percentage'] = $budget['budget_limit'] > 0 ? 
            ($budget['spent'] / $budget['budget_limit']) * 100 : 0;
        $budget['remaining'] = $budget['budget_limit'] - $budget['spent'];
        
        // Determine status
        if ($budget['percentage'] >= 100) {
            $budget['status'] = 'exceeded';
        } elseif ($budget['percentage'] >= 80) {
            $budget['status'] = 'warning';
        } else {
            $budget['status'] = 'good';
        }
        
        // Check if budget is active
        $today = date('Y-m-d');
        $budget['is_active'] = ($today >= $budget['start_date'] && $today <= $budget['end_date']);
    }
    
    $summary = [
        'total_budgets' => $total_budgets,
        'total_budget_amount' => $total_budget_amount,
        'total_spent' => $total_spent,
        'total_remaining' => $total_budget_amount - $total_spent
    ];
    
    echo json_encode([
        'success' => true,
        'budgets' => $budgets,
        'summary' => $summary
    ]);
}

/**
 * Handle POST request - Create budget
 */
function handleCreateBudget($conn, $user_id) {
    $category = $_POST['category'] ?? '';
    $budget_limit = $_POST['budget_limit'] ?? '';
    $start_date = $_POST['start_date'] ?? '';
    $end_date = $_POST['end_date'] ?? '';
    
    // Validate required fields
    if (empty($category) || empty($budget_limit) || empty($start_date) || empty($end_date)) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        return;
    }
    
    // Validate budget limit
    if (!is_numeric($budget_limit) || $budget_limit <= 0) {
        echo json_encode(['success' => false, 'message' => 'Budget limit must be a positive number']);
        return;
    }
    
    // Validate dates
    if (!strtotime($start_date) || !strtotime($end_date)) {
        echo json_encode(['success' => false, 'message' => 'Invalid date format']);
        return;
    }
    
    if ($start_date >= $end_date) {
        echo json_encode(['success' => false, 'message' => 'End date must be after start date']);
        return;
    }
    
    // Check for overlapping budgets in the same category
    $overlap_query = "
        SELECT id FROM budgets 
        WHERE user_id = :user_id 
        AND category = :category 
        AND (
            (start_date <= :start_date AND end_date >= :start_date) OR
            (start_date <= :end_date AND end_date >= :end_date) OR
            (start_date >= :start_date AND end_date <= :end_date)
        )
    ";
    $overlap_stmt = $conn->prepare($overlap_query);
    $overlap_stmt->bindParam(':user_id', $user_id);
    $overlap_stmt->bindParam(':category', $category);
    $overlap_stmt->bindParam(':start_date', $start_date);
    $overlap_stmt->bindParam(':end_date', $end_date);
    $overlap_stmt->execute();
    
    if ($overlap_stmt->rowCount() > 0) {
        echo json_encode(['success' => false, 'message' => 'A budget for this category already exists in the selected date range']);
        return;
    }
    
    $query = "
        INSERT INTO budgets (user_id, category, budget_limit, start_date, end_date) 
        VALUES (:user_id, :category, :budget_limit, :start_date, :end_date)
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':category', $category);
    $stmt->bindParam(':budget_limit', $budget_limit);
    $stmt->bindParam(':start_date', $start_date);
    $stmt->bindParam(':end_date', $end_date);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Budget created successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to create budget']);
    }
}

/**
 * Handle DELETE request - Delete budget
 */
function handleDeleteBudget($conn, $user_id) {
    $id = $_GET['id'] ?? '';
    
    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'Budget ID is required']);
        return;
    }
    
    $query = "DELETE FROM budgets WHERE id = :id AND user_id = :user_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->bindParam(':user_id', $user_id);
    
    if ($stmt->execute() && $stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Budget deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Budget not found or could not be deleted']);
    }
}
?>

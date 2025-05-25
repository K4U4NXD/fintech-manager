<?php
/**
 * Goals API Endpoint
 * Handles CRUD operations for savings goals
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
            handleGetGoals($conn, $user_id);
            break;
            
        case 'POST':
            if (isset($_POST['action']) && $_POST['action'] === 'add_money') {
                handleAddMoney($conn, $user_id);
            } else {
                handleCreateGoal($conn, $user_id);
            }
            break;
            
        case 'PUT':
            handleUpdateGoal($conn, $user_id);
            break;
            
        case 'DELETE':
            handleDeleteGoal($conn, $user_id);
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
 * Handle GET request - Fetch goals
 */
function handleGetGoals($conn, $user_id) {
    // Get single goal if ID is provided
    if (!empty($_GET['id'])) {
        $query = "SELECT * FROM goals WHERE id = :id AND user_id = :user_id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $_GET['id']);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        $goal = $stmt->fetch();
        
        if ($goal) {
            echo json_encode(['success' => true, 'goal' => $goal]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Goal not found']);
        }
        return;
    }
    
    // Get all goals
    $query = "SELECT * FROM goals WHERE user_id = :user_id ORDER BY created_at DESC";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    $goals = $stmt->fetchAll();
    
    // Calculate additional data for each goal
    $total_goals = count($goals);
    $total_target_amount = 0;
    $total_saved_amount = 0;
    $total_progress = 0;
    
    foreach ($goals as &$goal) {
        $total_target_amount += $goal['target_amount'];
        $total_saved_amount += $goal['current_amount'];
        
        // Calculate percentage
        $goal['percentage'] = $goal['target_amount'] > 0 ? 
            ($goal['current_amount'] / $goal['target_amount']) * 100 : 0;
        $goal['percentage'] = min($goal['percentage'], 100); // Cap at 100%
        
        $total_progress += $goal['percentage'];
        
        // Calculate remaining amount
        $goal['remaining'] = max(0, $goal['target_amount'] - $goal['current_amount']);
        
        // Determine status
        $today = date('Y-m-d');
        if ($goal['current_amount'] >= $goal['target_amount']) {
            $goal['status'] = 'completed';
        } elseif ($goal['target_date'] < $today) {
            $goal['status'] = 'overdue';
        } elseif ($goal['percentage'] >= 75) {
            $goal['status'] = 'on_track';
        } else {
            $goal['status'] = 'behind';
        }
        
        // Calculate days remaining
        $target_date = new DateTime($goal['target_date']);
        $current_date = new DateTime();
        $interval = $current_date->diff($target_date);
        $goal['days_remaining'] = $target_date > $current_date ? $interval->days : -$interval->days;
    }
    
    $average_progress = $total_goals > 0 ? $total_progress / $total_goals : 0;
    
    $summary = [
        'total_goals' => $total_goals,
        'total_target_amount' => $total_target_amount,
        'total_saved_amount' => $total_saved_amount,
        'average_progress' => $average_progress
    ];
    
    echo json_encode([
        'success' => true,
        'goals' => $goals,
        'summary' => $summary
    ]);
}

/**
 * Handle POST request - Create goal
 */
function handleCreateGoal($conn, $user_id) {
    $title = $_POST['title'] ?? '';
    $target_amount = $_POST['target_amount'] ?? '';
    $current_amount = $_POST['current_amount'] ?? 0;
    $target_date = $_POST['target_date'] ?? '';
    
    // Validate required fields
    if (empty($title) || empty($target_amount) || empty($target_date)) {
        echo json_encode(['success' => false, 'message' => 'Title, target amount, and target date are required']);
        return;
    }
    
    // Validate amounts
    if (!is_numeric($target_amount) || $target_amount <= 0) {
        echo json_encode(['success' => false, 'message' => 'Target amount must be a positive number']);
        return;
    }
    
    if (!is_numeric($current_amount) || $current_amount < 0) {
        echo json_encode(['success' => false, 'message' => 'Current amount must be a non-negative number']);
        return;
    }
    
    if ($current_amount > $target_amount) {
        echo json_encode(['success' => false, 'message' => 'Current amount cannot exceed target amount']);
        return;
    }
    
    // Validate date
    if (!strtotime($target_date)) {
        echo json_encode(['success' => false, 'message' => 'Invalid date format']);
        return;
    }
    
    if ($target_date <= date('Y-m-d')) {
        echo json_encode(['success' => false, 'message' => 'Target date must be in the future']);
        return;
    }
    
    $query = "
        INSERT INTO goals (user_id, title, target_amount, current_amount, target_date) 
        VALUES (:user_id, :title, :target_amount, :current_amount, :target_date)
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':title', $title);
    $stmt->bindParam(':target_amount', $target_amount);
    $stmt->bindParam(':current_amount', $current_amount);
    $stmt->bindParam(':target_date', $target_date);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Goal created successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to create goal']);
    }
}

/**
 * Handle adding money to goal
 */
function handleAddMoney($conn, $user_id) {
    $goal_id = $_POST['goal_id'] ?? '';
    $amount = $_POST['amount'] ?? '';
    $note = $_POST['note'] ?? '';
    
    // Validate required fields
    if (empty($goal_id) || empty($amount)) {
        echo json_encode(['success' => false, 'message' => 'Goal ID and amount are required']);
        return;
    }
    
    // Validate amount
    if (!is_numeric($amount) || $amount <= 0) {
        echo json_encode(['success' => false, 'message' => 'Amount must be a positive number']);
        return;
    }
    
    // Get current goal data
    $query = "SELECT * FROM goals WHERE id = :goal_id AND user_id = :user_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':goal_id', $goal_id);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    $goal = $stmt->fetch();
    
    if (!$goal) {
        echo json_encode(['success' => false, 'message' => 'Goal not found']);
        return;
    }
    
    // Calculate new current amount
    $new_current_amount = $goal['current_amount'] + $amount;
    
    // Update goal
    $update_query = "UPDATE goals SET current_amount = :current_amount WHERE id = :goal_id AND user_id = :user_id";
    $update_stmt = $conn->prepare($update_query);
    $update_stmt->bindParam(':current_amount', $new_current_amount);
    $update_stmt->bindParam(':goal_id', $goal_id);
    $update_stmt->bindParam(':user_id', $user_id);
    
    if ($update_stmt->execute()) {
        // Optionally create a transaction record for this addition
        $transaction_note = "Added to savings goal: " . $goal['title'];
        if (!empty($note)) {
            $transaction_note .= " - " . $note;
        }
        
        $transaction_query = "
            INSERT INTO transactions (user_id, type, category, amount, note, date) 
            VALUES (:user_id, 'expense', 'Savings', :amount, :note, CURDATE())
        ";
        $transaction_stmt = $conn->prepare($transaction_query);
        $transaction_stmt->bindParam(':user_id', $user_id);
        $transaction_stmt->bindParam(':amount', $amount);
        $transaction_stmt->bindParam(':note', $transaction_note);
        $transaction_stmt->execute();
        
        echo json_encode(['success' => true, 'message' => 'Money added to goal successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to add money to goal']);
    }
}

/**
 * Handle DELETE request - Delete goal
 */
function handleDeleteGoal($conn, $user_id) {
    $id = $_GET['id'] ?? '';
    
    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'Goal ID is required']);
        return;
    }
    
    $query = "DELETE FROM goals WHERE id = :id AND user_id = :user_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->bindParam(':user_id', $user_id);
    
    if ($stmt->execute() && $stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Goal deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Goal not found or could not be deleted']);
    }
}
?>

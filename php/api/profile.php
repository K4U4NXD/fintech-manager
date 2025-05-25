<?php
/**
 * Profile API Endpoint
 * Handles user profile management
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
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
            handleGetProfile($conn, $user_id);
            break;
            
        case 'POST':
            if (isset($_POST['action'])) {
                switch ($_POST['action']) {
                    case 'update_profile':
                        handleUpdateProfile($conn, $user_id);
                        break;
                    case 'change_password':
                        handleChangePassword($conn, $user_id, $auth);
                        break;
                    default:
                        echo json_encode(['success' => false, 'message' => 'Invalid action']);
                }
            } else {
                echo json_encode(['success' => false, 'message' => 'Action required']);
            }
            break;
            
        case 'DELETE':
            handleDeleteAccount($conn, $user_id, $auth);
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
 * Handle GET request - Get profile data
 */
function handleGetProfile($conn, $user_id) {
    // Get user profile
    $user_query = "SELECT name, email, created_at FROM users WHERE id = :user_id";
    $user_stmt = $conn->prepare($user_query);
    $user_stmt->bindParam(':user_id', $user_id);
    $user_stmt->execute();
    $user = $user_stmt->fetch();
    
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        return;
    }
    
    // Get statistics
    $stats_query = "
        SELECT 
            COUNT(*) as total_transactions,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as current_balance
        FROM transactions 
        WHERE user_id = :user_id
    ";
    $stats_stmt = $conn->prepare($stats_query);
    $stats_stmt->bindParam(':user_id', $user_id);
    $stats_stmt->execute();
    $stats = $stats_stmt->fetch();
    
    // Get budget count
    $budget_query = "
        SELECT COUNT(*) as active_budgets 
        FROM budgets 
        WHERE user_id = :user_id 
        AND CURDATE() BETWEEN start_date AND end_date
    ";
    $budget_stmt = $conn->prepare($budget_query);
    $budget_stmt->bindParam(':user_id', $user_id);
    $budget_stmt->execute();
    $budget_count = $budget_stmt->fetch()['active_budgets'];
    
    // Get goals count
    $goals_query = "SELECT COUNT(*) as savings_goals FROM goals WHERE user_id = :user_id";
    $goals_stmt = $conn->prepare($goals_query);
    $goals_stmt->bindParam(':user_id', $user_id);
    $goals_stmt->execute();
    $goals_count = $goals_stmt->fetch()['savings_goals'];
    
    $profile = [
        'user' => $user,
        'statistics' => [
            'total_transactions' => $stats['total_transactions'],
            'current_balance' => $stats['current_balance'],
            'active_budgets' => $budget_count,
            'savings_goals' => $goals_count
        ]
    ];
    
    echo json_encode(['success' => true, 'profile' => $profile]);
}

/**
 * Handle profile update
 */
function handleUpdateProfile($conn, $user_id) {
    $name = $_POST['name'] ?? '';
    
    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Name is required']);
        return;
    }
    
    if (strlen($name) < 2) {
        echo json_encode(['success' => false, 'message' => 'Name must be at least 2 characters long']);
        return;
    }
    
    $query = "UPDATE users SET name = :name WHERE id = :user_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':user_id', $user_id);
    
    if ($stmt->execute()) {
        // Update session
        $_SESSION['user_name'] = $name;
        echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update profile']);
    }
}

/**
 * Handle password change
 */
function handleChangePassword($conn, $user_id, $auth) {
    $current_password = $_POST['current_password'] ?? '';
    $new_password = $_POST['new_password'] ?? '';
    
    if (empty($current_password) || empty($new_password)) {
        echo json_encode(['success' => false, 'message' => 'Current and new passwords are required']);
        return;
    }
    
    if (strlen($new_password) < 6) {
        echo json_encode(['success' => false, 'message' => 'New password must be at least 6 characters long']);
        return;
    }
    
    $result = $auth->changePassword($user_id, $current_password, $new_password);
    echo json_encode($result);
}

/**
 * Handle account deletion
 */
function handleDeleteAccount($conn, $user_id, $auth) {
    $input = json_decode(file_get_contents('php://input'), true);
    $password = $input['password'] ?? '';
    
    if (empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Password is required']);
        return;
    }
    
    // Verify password
    $query = "SELECT password FROM users WHERE id = :user_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    $user = $stmt->fetch();
    
    if (!password_verify($password, $user['password'])) {
        echo json_encode(['success' => false, 'message' => 'Incorrect password']);
        return;
    }
    
    // Delete user and all related data (CASCADE will handle related tables)
    $delete_query = "DELETE FROM users WHERE id = :user_id";
    $delete_stmt = $conn->prepare($delete_query);
    $delete_stmt->bindParam(':user_id', $user_id);
    
    if ($delete_stmt->execute()) {
        // Logout user
        $auth->logout();
        echo json_encode(['success' => true, 'message' => 'Account deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to delete account']);
    }
}
?>

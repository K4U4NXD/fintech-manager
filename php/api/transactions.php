<?php
/**
 * Transactions API Endpoint
 * Handles CRUD operations for transactions
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
            handleGetTransactions($conn, $user_id);
            break;
            
        case 'POST':
            handleCreateTransaction($conn, $user_id);
            break;
            
        case 'PUT':
            handleUpdateTransaction($conn, $user_id);
            break;
            
        case 'DELETE':
            handleDeleteTransaction($conn, $user_id);
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
 * Handle GET request - Fetch transactions
 */
function handleGetTransactions($conn, $user_id) {
    $page = $_GET['page'] ?? 1;
    $limit = $_GET['limit'] ?? 20;
    $offset = ($page - 1) * $limit;
    
    // Build WHERE clause for filters
    $where_conditions = ['user_id = :user_id'];
    $params = [':user_id' => $user_id];
    
    if (!empty($_GET['type'])) {
        $where_conditions[] = 'type = :type';
        $params[':type'] = $_GET['type'];
    }
    
    if (!empty($_GET['category'])) {
        $where_conditions[] = 'category = :category';
        $params[':category'] = $_GET['category'];
    }
    
    if (!empty($_GET['start_date'])) {
        $where_conditions[] = 'date >= :start_date';
        $params[':start_date'] = $_GET['start_date'];
    }
    
    if (!empty($_GET['end_date'])) {
        $where_conditions[] = 'date <= :end_date';
        $params[':end_date'] = $_GET['end_date'];
    }
    
    if (!empty($_GET['search'])) {
        $where_conditions[] = '(note LIKE :search OR tags LIKE :search)';
        $params[':search'] = '%' . $_GET['search'] . '%';
    }
    
    $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);
    
    // Get single transaction if ID is provided
    if (!empty($_GET['id'])) {
        $query = "SELECT * FROM transactions $where_clause AND id = :id";
        $params[':id'] = $_GET['id'];
        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        $transaction = $stmt->fetch();
        
        if ($transaction) {
            echo json_encode(['success' => true, 'transaction' => $transaction]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Transaction not found']);
        }
        return;
    }
    
    // Get total count
    $count_query = "SELECT COUNT(*) as total FROM transactions $where_clause";
    $count_stmt = $conn->prepare($count_query);
    $count_stmt->execute($params);
    $total = $count_stmt->fetch()['total'];
    
    // Get transactions with pagination
    $query = "
        SELECT * FROM transactions 
        $where_clause 
        ORDER BY date DESC, id DESC 
        LIMIT :limit OFFSET :offset
    ";
    
    $stmt = $conn->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $transactions = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'transactions' => $transactions,
        'pagination' => [
            'page' => (int)$page,
            'limit' => (int)$limit,
            'total' => (int)$total,
            'pages' => ceil($total / $limit)
        ]
    ]);
}

/**
 * Handle POST request - Create transaction with notification
 */
function handleCreateTransaction($conn, $user_id) {
    $type = $_POST['type'] ?? '';
    $category = $_POST['category'] ?? '';
    $amount = $_POST['amount'] ?? '';
    $tags = $_POST['tags'] ?? '';
    $note = $_POST['note'] ?? '';
    $date = $_POST['date'] ?? '';
    
    // Validate required fields
    if (empty($type) || empty($category) || empty($amount) || empty($date)) {
        echo json_encode(['success' => false, 'message' => 'Required fields are missing']);
        return;
    }
    
    // Validate type
    if (!in_array($type, ['income', 'expense'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid transaction type']);
        return;
    }
    
    // Validate amount
    if (!is_numeric($amount) || $amount <= 0) {
        echo json_encode(['success' => false, 'message' => 'Amount must be a positive number']);
        return;
    }
    
    // Validate date
    if (!strtotime($date)) {
        echo json_encode(['success' => false, 'message' => 'Invalid date format']);
        return;
    }
    
    $query = "
        INSERT INTO transactions (user_id, type, category, amount, tags, note, date) 
        VALUES (:user_id, :type, :category, :amount, :tags, :note, :date)
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':type', $type);
    $stmt->bindParam(':category', $category);
    $stmt->bindParam(':amount', $amount);
    $stmt->bindParam(':tags', $tags);
    $stmt->bindParam(':note', $note);
    $stmt->bindParam(':date', $date);
    
    if ($stmt->execute()) {
        // Create notification for the transaction
        require_once '../utils/NotificationManager.php';
        $notificationManager = new NotificationManager();
        $notificationManager->notifyTransaction($user_id, $type, $amount, $category);
        
        echo json_encode(['success' => true, 'message' => 'Transaction created successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to create transaction']);
    }
}

/**
 * Handle DELETE request - Delete transaction
 */
function handleDeleteTransaction($conn, $user_id) {
    $id = $_GET['id'] ?? '';
    
    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'Transaction ID is required']);
        return;
    }
    
    $query = "DELETE FROM transactions WHERE id = :id AND user_id = :user_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->bindParam(':user_id', $user_id);
    
    if ($stmt->execute() && $stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Transaction deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Transaction not found or could not be deleted']);
    }
}
?>

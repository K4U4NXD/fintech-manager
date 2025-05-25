<?php
/**
 * Notifications API Endpoint
 * Handles notification management
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
            handleGetNotifications($conn, $user_id);
            break;
            
        case 'POST':
            handleCreateNotification($conn, $user_id);
            break;
            
        case 'PUT':
            handleMarkAsRead($conn, $user_id);
            break;
            
        case 'DELETE':
            handleDeleteNotification($conn, $user_id);
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
 * Handle GET request - Fetch notifications
 */
function handleGetNotifications($conn, $user_id) {
    $limit = $_GET['limit'] ?? 20;
    $offset = $_GET['offset'] ?? 0;
    
    $query = "
        SELECT id, message, type, is_read, created_at 
        FROM notifications 
        WHERE user_id = :user_id 
        ORDER BY created_at DESC 
        LIMIT :limit OFFSET :offset
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $notifications = $stmt->fetchAll();
    
    // Get unread count
    $countQuery = "SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = :user_id AND is_read = 0";
    $countStmt = $conn->prepare($countQuery);
    $countStmt->bindParam(':user_id', $user_id);
    $countStmt->execute();
    $unreadCount = $countStmt->fetch()['unread_count'];
    
    echo json_encode([
        'success' => true,
        'notifications' => $notifications,
        'unread_count' => (int)$unreadCount
    ]);
}

/**
 * Handle POST request - Create notification
 */
function handleCreateNotification($conn, $user_id) {
    $message = $_POST['message'] ?? '';
    $type = $_POST['type'] ?? 'info';
    
    if (empty($message)) {
        echo json_encode(['success' => false, 'message' => 'Message is required']);
        return;
    }
    
    $validTypes = ['budget_alert', 'goal_achieved', 'reminder', 'info'];
    if (!in_array($type, $validTypes)) {
        $type = 'info';
    }
    
    $query = "INSERT INTO notifications (user_id, message, type, created_at) VALUES (:user_id, :message, :type, NOW())";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':message', $message);
    $stmt->bindParam(':type', $type);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Notification created successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to create notification']);
    }
}

/**
 * Handle PUT request - Mark notifications as read
 */
function handleMarkAsRead($conn, $user_id) {
    $notification_id = $_GET['id'] ?? null;
    
    if ($notification_id) {
        // Mark specific notification as read
        $query = "UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :user_id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $notification_id);
        $stmt->bindParam(':user_id', $user_id);
    } else {
        // Mark all notifications as read
        $query = "UPDATE notifications SET is_read = 1 WHERE user_id = :user_id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
    }
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Notifications marked as read']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update notifications']);
    }
}

/**
 * Handle DELETE request - Delete notification
 */
function handleDeleteNotification($conn, $user_id) {
    $notification_id = $_GET['id'] ?? '';
    
    if (empty($notification_id)) {
        echo json_encode(['success' => false, 'message' => 'Notification ID is required']);
        return;
    }
    
    $query = "DELETE FROM notifications WHERE id = :id AND user_id = :user_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':id', $notification_id);
    $stmt->bindParam(':user_id', $user_id);
    
    if ($stmt->execute() && $stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Notification deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Notification not found or could not be deleted']);
    }
}
?>

<?php
/**
 * Reset Password API Endpoint
 * Handles password reset with token
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Validate token
    $token = $_GET['token'] ?? '';
    
    if (empty($token)) {
        echo json_encode(['success' => false, 'message' => 'Token is required']);
        exit;
    }
    
    try {
        $database = new Database();
        $conn = $database->getConnection();
        
        $query = "SELECT email FROM password_resets WHERE token = :token AND expires_at > NOW()";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':token', $token);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Token is valid']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Reset password
    try {
        $token = $_POST['token'] ?? '';
        $password = $_POST['password'] ?? '';
        
        // Validate input
        if (empty($token) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Token and password are required']);
            exit;
        }
        
        // Validate password length
        if (strlen($password) < 6) {
            echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters long']);
            exit;
        }
        
        $database = new Database();
        $conn = $database->getConnection();
        
        // Verify token
        $query = "SELECT email FROM password_resets WHERE token = :token AND expires_at > NOW()";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':token', $token);
        $stmt->execute();
        
        if ($stmt->rowCount() == 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
            exit;
        }
        
        $reset_data = $stmt->fetch();
        $email = $reset_data['email'];
        
        // Update password
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        $update_query = "UPDATE users SET password = :password WHERE email = :email";
        $update_stmt = $conn->prepare($update_query);
        $update_stmt->bindParam(':password', $hashed_password);
        $update_stmt->bindParam(':email', $email);
        
        if ($update_stmt->execute()) {
            // Delete used token
            $delete_query = "DELETE FROM password_resets WHERE token = :token";
            $delete_stmt = $conn->prepare($delete_query);
            $delete_stmt->bindParam(':token', $token);
            $delete_stmt->execute();
            
            echo json_encode(['success' => true, 'message' => 'Password reset successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to reset password']);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>

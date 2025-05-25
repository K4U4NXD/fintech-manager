<?php
/**
 * Forgot Password API Endpoint
 * Handles password reset requests
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $email = $_POST['email'] ?? '';
    
    // Validate input
    if (empty($email)) {
        echo json_encode(['success' => false, 'message' => 'Email is required']);
        exit;
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        exit;
    }
    
    $database = new Database();
    $conn = $database->getConnection();
    
    // Check if email exists
    $query = "SELECT id FROM users WHERE email = :email";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':email', $email);
    $stmt->execute();
    
    if ($stmt->rowCount() == 0) {
        // Don't reveal if email exists or not for security
        echo json_encode(['success' => true, 'message' => 'If your email is registered, you will receive a password reset link']);
        exit;
    }
    
    // Generate reset token
    $token = bin2hex(random_bytes(32));
    $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
    
    // Delete any existing tokens for this email
    $delete_query = "DELETE FROM password_resets WHERE email = :email";
    $delete_stmt = $conn->prepare($delete_query);
    $delete_stmt->bindParam(':email', $email);
    $delete_stmt->execute();
    
    // Insert new token
    $insert_query = "INSERT INTO password_resets (email, token, expires_at) VALUES (:email, :token, :expires_at)";
    $insert_stmt = $conn->prepare($insert_query);
    $insert_stmt->bindParam(':email', $email);
    $insert_stmt->bindParam(':token', $token);
    $insert_stmt->bindParam(':expires_at', $expires_at);
    
    if ($insert_stmt->execute()) {
        // In a real application, you would send an email here
        // For demo purposes, we'll just return the token
        $reset_link = "http://localhost/fintech-manager/html/reset-password.html?token=" . $token;
        
        // Simulate email sending
        sendPasswordResetEmail($email, $reset_link);
        
        echo json_encode([
            'success' => true, 
            'message' => 'Password reset link sent to your email',
            'debug_link' => $reset_link // Remove this in production
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to generate reset token']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

/**
 * Simulate sending password reset email
 * In production, use a proper email service like PHPMailer, SendGrid, etc.
 */
function sendPasswordResetEmail($email, $reset_link) {
    // This is a placeholder function
    // In a real application, you would integrate with an email service
    
    $subject = "Password Reset - FINTECH MANAGER";
    $message = "
        <html>
        <head>
            <title>Password Reset</title>
        </head>
        <body>
            <h2>Password Reset Request</h2>
            <p>You have requested to reset your password for FINTECH MANAGER.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href='{$reset_link}'>Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this reset, please ignore this email.</p>
        </body>
        </html>
    ";
    
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= 'From: noreply@fintechmanager.com' . "\r\n";
    
    // Uncomment the line below to actually send emails (requires mail server configuration)
    // mail($email, $subject, $message, $headers);
    
    return true;
}
?>

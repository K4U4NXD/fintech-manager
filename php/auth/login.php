<?php
/**
 * Login API Endpoint
 * Handles user authentication with enhanced feedback
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once 'auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $email = trim(strtolower($_POST['email'] ?? ''));
    $password = $_POST['password'] ?? '';
    
    // Enhanced validation
    if (empty($email)) {
        echo json_encode(['success' => false, 'message' => 'Email is required']);
        exit;
    }
    
    if (empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Password is required']);
        exit;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Please enter a valid email address']);
        exit;
    }
    
    $auth = new Auth();
    $result = $auth->login($email, $password);
    
    // Enhanced error messages
    if (!$result['success']) {
        if (strpos($result['message'], 'User not found') !== false) {
            echo json_encode(['success' => false, 'message' => 'No account found with this email address']);
        } elseif (strpos($result['message'], 'Invalid password') !== false) {
            echo json_encode(['success' => false, 'message' => 'Incorrect password. Please try again']);
        } else {
            echo json_encode($result);
        }
    } else {
        echo json_encode($result);
    }
    
} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error occurred. Please try again later.']);
}
?>

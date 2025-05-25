<?php
/**
 * Check Authentication Status
 * Returns current user authentication status
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'auth.php';

try {
    $auth = new Auth();
    
    if ($auth->isLoggedIn()) {
        echo json_encode([
            'authenticated' => true,
            'user' => [
                'id' => $_SESSION['user_id'],
                'name' => $_SESSION['user_name'],
                'email' => $_SESSION['user_email']
            ]
        ]);
    } else {
        echo json_encode(['authenticated' => false]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['authenticated' => false, 'error' => $e->getMessage()]);
}
?>

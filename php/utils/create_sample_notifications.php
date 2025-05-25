<?php
/**
 * Create sample notifications for testing
 * Run this script once to populate notifications for existing users
 */

require_once '../config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    // Get all users
    $query = "SELECT id, name FROM users";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $users = $stmt->fetchAll();
    
    foreach ($users as $user) {
        $user_id = $user['id'];
        $name = $user['name'];
        
        // Create sample notifications
        $notifications = [
            [
                'message' => "👋 Welcome to FINTECH MANAGER, {$name}! Start by adding your first transaction.",
                'type' => 'info'
            ],
            [
                'message' => "💰 You received $2,500.00 in Salary",
                'type' => 'info'
            ],
            [
                'message' => "💸 You spent $45.99 in Food",
                'type' => 'info'
            ],
            [
                'message' => "⚠️ You've used 75% of your Food budget this month",
                'type' => 'budget_alert'
            ],
            [
                'message' => "🎉 Congratulations! You've achieved your goal: Emergency Fund",
                'type' => 'goal_achieved'
            ]
        ];
        
        foreach ($notifications as $notification) {
            $insertQuery = "INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES (:user_id, :message, :type, :is_read, NOW())";
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->bindParam(':user_id', $user_id);
            $insertStmt->bindParam(':message', $notification['message']);
            $insertStmt->bindParam(':type', $notification['type']);
            $insertStmt->bindValue(':is_read', rand(0, 1)); // Random read status for testing
            $insertStmt->execute();
        }
    }
    
    echo "Sample notifications created successfully!\n";
    
} catch (Exception $e) {
    echo "Error creating sample notifications: " . $e->getMessage() . "\n";
}
?>

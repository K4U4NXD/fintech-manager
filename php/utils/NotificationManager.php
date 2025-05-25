<?php
/**
 * Notification Manager
 * Handles automatic notification creation for user actions
 */

require_once '../config/database.php';

class NotificationManager {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    /**
     * Create a notification for a user
     */
    public function createNotification($user_id, $message, $type = 'info') {
        try {
            $query = "INSERT INTO notifications (user_id, message, type, created_at) VALUES (:user_id, :message, :type, NOW())";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->bindParam(':message', $message);
            $stmt->bindParam(':type', $type);
            
            return $stmt->execute();
        } catch (Exception $e) {
            error_log("Failed to create notification: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Create transaction notification
     */
    public function notifyTransaction($user_id, $type, $amount, $category) {
        $emoji = $type === 'income' ? '💰' : '💸';
        $action = $type === 'income' ? 'received' : 'spent';
        $message = "{$emoji} You {$action} $" . number_format($amount, 2) . " in {$category}";
        
        return $this->createNotification($user_id, $message, 'info');
    }
    
    /**
     * Create budget alert notification
     */
    public function notifyBudgetAlert($user_id, $category, $percentage) {
        $message = "⚠️ You've used {$percentage}% of your {$category} budget this month";
        return $this->createNotification($user_id, $message, 'budget_alert');
    }
    
    /**
     * Create goal achievement notification
     */
    public function notifyGoalAchieved($user_id, $goal_name) {
        $message = "🎉 Congratulations! You've achieved your goal: {$goal_name}";
        return $this->createNotification($user_id, $message, 'goal_achieved');
    }
    
    /**
     * Create welcome notification
     */
    public function notifyWelcome($user_id, $name) {
        $message = "👋 Welcome to FINTECH MANAGER, {$name}! Start by adding your first transaction.";
        return $this->createNotification($user_id, $message, 'info');
    }
}
?>

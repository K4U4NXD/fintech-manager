<?php
/**
 * Authentication Class for FINTECH MANAGER
 * Handles user registration, login, password reset
 */

require_once '../config/database.php';

class Auth {
    private $conn;
    private $table_name = "users";
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
        
        // Start session if not already started
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }
    }
    
    /**
     * Register new user with enhanced validation and error handling
     * @param string $name
     * @param string $email
     * @param string $password
     * @return array
     */
    public function register($name, $email, $password) {
        try {
            // Additional server-side validation
            $name = trim($name);
            $email = trim(strtolower($email));
            
            // Check if email already exists
            $query = "SELECT id FROM " . $this->table_name . " WHERE email = :email";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':email', $email);
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                return ['success' => false, 'message' => 'An account with this email already exists'];
            }
            
            // Hash password with strong algorithm
            $hashed_password = password_hash($password, PASSWORD_ARGON2ID, [
                'memory_cost' => 65536, // 64 MB
                'time_cost' => 4,       // 4 iterations
                'threads' => 3,         // 3 threads
            ]);
            
            // Insert new user
            $query = "INSERT INTO " . $this->table_name . " (name, email, password, created_at) VALUES (:name, :email, :password, NOW())";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':email', $email);
            $stmt->bindParam(':password', $hashed_password);
            
            if ($stmt->execute()) {
                $user_id = $this->conn->lastInsertId();
                
                // Create welcome notification
                $this->createWelcomeNotification($user_id);
                
                return ['success' => true, 'message' => 'Account created successfully! Please log in.'];
            }
            
            return ['success' => false, 'message' => 'Failed to create account. Please try again.'];
            
        } catch (PDOException $e) {
            error_log("Registration database error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Database error occurred. Please try again later.'];
        } catch (Exception $e) {
            error_log("Registration general error: " . $e->getMessage());
            return ['success' => false, 'message' => 'An unexpected error occurred. Please try again later.'];
        }
    }

    /**
     * Create welcome notification for new user
     * @param int $user_id
     */
    private function createWelcomeNotification($user_id) {
        try {
            $query = "INSERT INTO notifications (user_id, message, type, created_at) VALUES (:user_id, :message, :type, NOW())";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->bindValue(':message', 'Welcome to FINTECH MANAGER! Start by adding your first transaction.');
            $stmt->bindValue(':type', 'info');
            $stmt->execute();
        } catch (Exception $e) {
            // Log error but don't fail registration
            error_log("Failed to create welcome notification: " . $e->getMessage());
        }
    }
    
    /**
     * Login user
     * @param string $email
     * @param string $password
     * @return array
     */
    public function login($email, $password) {
        try {
            $query = "SELECT id, name, email, password FROM " . $this->table_name . " WHERE email = :email";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':email', $email);
            $stmt->execute();
            
            if ($stmt->rowCount() == 1) {
                $user = $stmt->fetch();
                
                if (password_verify($password, $user['password'])) {
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['user_name'] = $user['name'];
                    $_SESSION['user_email'] = $user['email'];
                    
                    return ['success' => true, 'message' => 'Login successful'];
                }
            }
            
            return ['success' => false, 'message' => 'Invalid email or password'];
            
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }
    
    /**
     * Check if user is logged in
     * @return bool
     */
    public function isLoggedIn() {
        return isset($_SESSION['user_id']);
    }
    
    /**
     * Logout user
     */
    public function logout() {
        session_destroy();
    }
    
    /**
     * Get current user ID
     * @return int|null
     */
    public function getCurrentUserId() {
        return $_SESSION['user_id'] ?? null;
    }
    
    /**
     * Change password
     * @param int $user_id
     * @param string $old_password
     * @param string $new_password
     * @return array
     */
    public function changePassword($user_id, $old_password, $new_password) {
        try {
            // Verify old password
            $query = "SELECT password FROM " . $this->table_name . " WHERE id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->execute();
            
            $user = $stmt->fetch();
            
            if (!password_verify($old_password, $user['password'])) {
                return ['success' => false, 'message' => 'Current password is incorrect'];
            }
            
            // Update password
            $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
            $query = "UPDATE " . $this->table_name . " SET password = :password WHERE id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':password', $hashed_password);
            $stmt->bindParam(':user_id', $user_id);
            
            if ($stmt->execute()) {
                return ['success' => true, 'message' => 'Password changed successfully'];
            }
            
            return ['success' => false, 'message' => 'Failed to change password'];
            
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }
}
?>

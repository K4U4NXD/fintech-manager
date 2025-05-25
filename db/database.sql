-- FINTECH MANAGER Database Schema
-- Complete database structure with all tables and relationships

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Database: fintech_manager
CREATE DATABASE IF NOT EXISTS `fintech_manager` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `fintech_manager`;

-- --------------------------------------------------------

-- Table structure for table `users`
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `email_verified` tinyint(1) DEFAULT 0,
  `last_login` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `transactions`
CREATE TABLE `transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` enum('income','expense') NOT NULL,
  `category` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `note` text DEFAULT NULL,
  `tags` varchar(500) DEFAULT NULL,
  `date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_type` (`type`),
  KEY `idx_category` (`category`),
  KEY `idx_date` (`date`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `budgets`
CREATE TABLE `budgets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `category` varchar(100) NOT NULL,
  `budget_limit` decimal(10,2) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_category` (`category`),
  KEY `idx_dates` (`start_date`, `end_date`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_budgets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `goals`
CREATE TABLE `goals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `target_amount` decimal(10,2) NOT NULL,
  `current_amount` decimal(10,2) DEFAULT 0.00,
  `target_date` date NOT NULL,
  `is_completed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_target_date` (`target_date`),
  KEY `idx_is_completed` (`is_completed`),
  CONSTRAINT `fk_goals_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `goal_transactions`
CREATE TABLE `goal_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `goal_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_goal_id` (`goal_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_goal_transactions_goal` FOREIGN KEY (`goal_id`) REFERENCES `goals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `notifications`
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` enum('budget_alert','goal_achieved','reminder','info') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_type` (`type`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `password_resets`
CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_token` (`token`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `user_sessions`
CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_session_token` (`session_token`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_user_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `categories`
CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `type` enum('income','expense','both') NOT NULL DEFAULT 'both',
  `icon` varchar(50) DEFAULT NULL,
  `color` varchar(7) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_name_type` (`name`, `type`),
  KEY `idx_type` (`type`),
  KEY `idx_is_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Insert default categories
INSERT INTO `categories` (`name`, `type`, `icon`, `color`, `is_default`) VALUES
-- Income categories
('Salary', 'income', '💼', '#28a745', 1),
('Freelance', 'income', '💻', '#17a2b8', 1),
('Investment', 'income', '📈', '#007bff', 1),
('Business', 'income', '🏢', '#6f42c1', 1),
('Rental', 'income', '🏠', '#fd7e14', 1),
('Bonus', 'income', '🎁', '#ffc107', 1),
('Gift', 'income', '🎉', '#e83e8c', 1),
('Other', 'income', '💰', '#6c757d', 1),

-- Expense categories
('Food', 'expense', '🍽️', '#dc3545', 1),
('Transportation', 'expense', '🚗', '#007bff', 1),
('Housing', 'expense', '🏠', '#6f42c1', 1),
('Entertainment', 'expense', '🎬', '#e83e8c', 1),
('Healthcare', 'expense', '🏥', '#fd7e14', 1),
('Shopping', 'expense', '🛍️', '#ffc107', 1),
('Utilities', 'expense', '⚡', '#17a2b8', 1),
('Education', 'expense', '📚', '#28a745', 1),
('Insurance', 'expense', '🛡️', '#6c757d', 1),
('Debt', 'expense', '💳', '#dc3545', 1),
('Other', 'expense', '💸', '#6c757d', 1);

-- --------------------------------------------------------

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX idx_transactions_user_category ON transactions(user_id, category);
CREATE INDEX idx_budgets_user_active ON budgets(user_id, is_active);
CREATE INDEX idx_goals_user_completed ON goals(user_id, is_completed);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);

-- --------------------------------------------------------

-- Create views for common queries
CREATE VIEW user_monthly_summary AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    DATE_FORMAT(t.date, '%Y-%m') as month,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as total_income,
    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as total_expense,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) as net_amount,
    COUNT(t.id) as transaction_count
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
GROUP BY u.id, DATE_FORMAT(t.date, '%Y-%m');

-- --------------------------------------------------------

-- Create view for budget status
CREATE VIEW budget_status AS
SELECT 
    b.*,
    COALESCE(SUM(t.amount), 0) as spent,
    (b.budget_limit - COALESCE(SUM(t.amount), 0)) as remaining,
    ROUND((COALESCE(SUM(t.amount), 0) / b.budget_limit) * 100, 2) as percentage,
    CASE 
        WHEN COALESCE(SUM(t.amount), 0) >= b.budget_limit THEN 'exceeded'
        WHEN COALESCE(SUM(t.amount), 0) >= (b.budget_limit * 0.8) THEN 'warning'
        ELSE 'on_track'
    END as status,
    CASE 
        WHEN CURDATE() BETWEEN b.start_date AND b.end_date THEN 1
        ELSE 0
    END as is_current
FROM budgets b
LEFT JOIN transactions t ON b.user_id = t.user_id 
    AND b.category = t.category 
    AND t.type = 'expense'
    AND t.date BETWEEN b.start_date AND b.end_date
WHERE b.is_active = 1
GROUP BY b.id;

-- --------------------------------------------------------

-- Create view for goal progress
CREATE VIEW goal_progress AS
SELECT 
    g.*,
    (g.target_amount - g.current_amount) as remaining,
    ROUND((g.current_amount / g.target_amount) * 100, 2) as percentage,
    DATEDIFF(g.target_date, CURDATE()) as days_remaining,
    CASE 
        WHEN g.current_amount >= g.target_amount THEN 'completed'
        WHEN CURDATE() > g.target_date THEN 'overdue'
        WHEN (g.current_amount / g.target_amount) >= 0.8 THEN 'on_track'
        ELSE 'behind'
    END as status
FROM goals g;

-- --------------------------------------------------------

-- Create triggers for automatic notifications

DELIMITER $$

-- Trigger for budget alerts
CREATE TRIGGER budget_alert_trigger
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    DECLARE budget_limit DECIMAL(10,2);
    DECLARE current_spent DECIMAL(10,2);
    DECLARE budget_id INT;
    
    IF NEW.type = 'expense' THEN
        -- Check if there's an active budget for this category
        SELECT b.id, b.budget_limit INTO budget_id, budget_limit
        FROM budgets b
        WHERE b.user_id = NEW.user_id 
        AND b.category = NEW.category 
        AND b.is_active = 1
        AND NEW.date BETWEEN b.start_date AND b.end_date
        LIMIT 1;
        
        IF budget_id IS NOT NULL THEN
            -- Calculate current spending
            SELECT COALESCE(SUM(amount), 0) INTO current_spent
            FROM transactions t
            JOIN budgets b ON b.user_id = t.user_id AND b.category = t.category
            WHERE t.user_id = NEW.user_id 
            AND t.category = NEW.category 
            AND t.type = 'expense'
            AND t.date BETWEEN (SELECT start_date FROM budgets WHERE id = budget_id) 
            AND (SELECT end_date FROM budgets WHERE id = budget_id);
            
            -- Create notification if over 80% of budget
            IF current_spent >= (budget_limit * 0.8) THEN
                INSERT INTO notifications (user_id, type, title, message)
                VALUES (
                    NEW.user_id,
                    'budget_alert',
                    'Budget Alert',
                    CONCAT('You have spent ', FORMAT(current_spent, 2), ' out of ', FORMAT(budget_limit, 2), ' in ', NEW.category, ' category.')
                );
            END IF;
        END IF;
    END IF;
END$$

-- Trigger for goal completion
CREATE TRIGGER goal_completion_trigger
AFTER UPDATE ON goals
FOR EACH ROW
BEGIN
    IF NEW.current_amount >= NEW.target_amount AND OLD.current_amount < OLD.target_amount THEN
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (
            NEW.user_id,
            'goal_achieved',
            'Goal Achieved!',
            CONCAT('Congratulations! You have achieved your goal: ', NEW.title)
        );
        
        UPDATE goals SET is_completed = 1 WHERE id = NEW.id;
    END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------

-- Create stored procedures for common operations

DELIMITER $$

-- Procedure to get user dashboard data
CREATE PROCEDURE GetUserDashboard(IN user_id INT)
BEGIN
    -- Get summary data
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance,
        COALESCE(SUM(CASE WHEN type = 'income' AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') THEN amount ELSE 0 END), 0) as current_month_income,
        COALESCE(SUM(CASE WHEN type = 'expense' AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') THEN amount ELSE 0 END), 0) as current_month_expense
    FROM transactions 
    WHERE user_id = user_id;
    
    -- Get recent transactions
    SELECT id, type, category, amount, note, date
    FROM transactions 
    WHERE user_id = user_id 
    ORDER BY date DESC, id DESC 
    LIMIT 10;
    
    -- Get monthly chart data (last 6 months)
    SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        type,
        SUM(amount) as total
    FROM transactions 
    WHERE user_id = user_id 
    AND date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(date, '%Y-%m'), type
    ORDER BY month;
    
    -- Get category breakdown for current month
    SELECT 
        category,
        SUM(amount) as total
    FROM transactions 
    WHERE user_id = user_id 
    AND type = 'expense'
    AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
    GROUP BY category
    ORDER BY total DESC;
END$$

-- Procedure to clean up old data
CREATE PROCEDURE CleanupOldData()
BEGIN
    -- Delete old password reset tokens (older than 24 hours)
    DELETE FROM password_resets 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);
    
    -- Delete expired user sessions
    DELETE FROM user_sessions 
    WHERE expires_at < NOW();
    
    -- Mark old notifications as read (older than 30 days)
    UPDATE notifications 
    SET is_read = 1 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) 
    AND is_read = 0;
END$$

DELIMITER ;

-- --------------------------------------------------------

-- Create events for automatic cleanup (requires event scheduler to be enabled)
-- SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS cleanup_old_data
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
  CALL CleanupOldData();

-- --------------------------------------------------------

-- Insert sample data for testing (optional)
-- Uncomment the following lines to insert sample data

/*
-- Sample user
INSERT INTO users (name, email, password) VALUES 
('John Doe', 'john@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Sample transactions
INSERT INTO transactions (user_id, type, category, amount, note, date) VALUES
(1, 'income', 'Salary', 5000.00, 'Monthly salary', '2024-01-01'),
(1, 'expense', 'Food', 300.00, 'Groceries', '2024-01-02'),
(1, 'expense', 'Transportation', 150.00, 'Gas', '2024-01-03'),
(1, 'income', 'Freelance', 800.00, 'Web design project', '2024-01-05');

-- Sample budget
INSERT INTO budgets (user_id, category, budget_limit, start_date, end_date) VALUES
(1, 'Food', 500.00, '2024-01-01', '2024-01-31');

-- Sample goal
INSERT INTO goals (user_id, title, target_amount, current_amount, target_date) VALUES
(1, 'Emergency Fund', 10000.00, 2500.00, '2024-12-31');
*/

COMMIT;

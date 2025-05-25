<?php
/**
 * Database Configuration
 * Complete database connection and configuration management
 */

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $charset;
    private $conn;
    private static $instance = null;
    
    public function __construct() {
        // Load configuration from environment or use defaults
        $this->host = $_ENV['DB_HOST'] ?? 'localhost';
        $this->db_name = $_ENV['DB_NAME'] ?? 'fintech_manager';
        $this->username = $_ENV['DB_USER'] ?? 'root';
        $this->password = $_ENV['DB_PASS'] ?? '';
        $this->charset = 'utf8mb4';
    }
    
    /**
     * Get singleton instance
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Get database connection
     */
    public function getConnection() {
        if ($this->conn === null) {
            try {
                $dsn = "mysql:host={$this->host};dbname={$this->db_name};charset={$this->charset}";
                
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$this->charset}",
                    PDO::ATTR_PERSISTENT => true
                ];
                
                $this->conn = new PDO($dsn, $this->username, $this->password, $options);
                
                // Set timezone
                $this->conn->exec("SET time_zone = '+00:00'");
                
            } catch (PDOException $e) {
                error_log("Database connection error: " . $e->getMessage());
                throw new Exception("Database connection failed");
            }
        }
        
        return $this->conn;
    }
    
    /**
     * Test database connection
     */
    public function testConnection() {
        try {
            $conn = $this->getConnection();
            $stmt = $conn->query("SELECT 1");
            return $stmt !== false;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Get database info
     */
    public function getDatabaseInfo() {
        try {
            $conn = $this->getConnection();
            $stmt = $conn->query("SELECT VERSION() as version");
            $result = $stmt->fetch();
            return [
                'version' => $result['version'],
                'host' => $this->host,
                'database' => $this->db_name,
                'charset' => $this->charset
            ];
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * Execute transaction
     */
    public function executeTransaction(callable $callback) {
        $conn = $this->getConnection();
        
        try {
            $conn->beginTransaction();
            $result = $callback($conn);
            $conn->commit();
            return $result;
        } catch (Exception $e) {
            $conn->rollBack();
            throw $e;
        }
    }
    
    /**
     * Close connection
     */
    public function closeConnection() {
        $this->conn = null;
    }
    
    /**
     * Destructor
     */
    public function __destruct() {
        $this->closeConnection();
    }
}

// Global configuration
define('DB_CONFIG', [
    'host' => $_ENV['DB_HOST'] ?? 'localhost',
    'name' => $_ENV['DB_NAME'] ?? 'fintech_manager',
    'user' => $_ENV['DB_USER'] ?? 'root',
    'pass' => $_ENV['DB_PASS'] ?? '',
    'charset' => 'utf8mb4'
]);

// Error reporting configuration
if ($_ENV['APP_ENV'] ?? 'production' === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('log_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
}

// Set error log file
ini_set('error_log', __DIR__ . '/../../logs/php_errors.log');

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

// CORS configuration for API endpoints
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $allowed_origins = [
        'http://localhost',
        'http://localhost:3000',
        'http://localhost:8000',
        'https://yourdomain.com'
    ];
    
    if (in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
        header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    }
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Session configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', isset($_SERVER['HTTPS']));
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.gc_maxlifetime', 3600); // 1 hour
ini_set('session.gc_probability', 1);
ini_set('session.gc_divisor', 100);

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Timezone configuration
date_default_timezone_set('UTC');

// Application constants
define('APP_NAME', 'FINTECH MANAGER');
define('APP_VERSION', '1.0.0');
define('APP_URL', $_ENV['APP_URL'] ?? 'http://localhost');
define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_FILE_TYPES', ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'csv', 'xlsx']);

// Pagination defaults
define('DEFAULT_PAGE_SIZE', 20);
define('MAX_PAGE_SIZE', 100);

// Cache configuration
define('CACHE_ENABLED', true);
define('CACHE_DURATION', 3600); // 1 hour

// Email configuration (if needed)
define('SMTP_HOST', $_ENV['SMTP_HOST'] ?? 'localhost');
define('SMTP_PORT', $_ENV['SMTP_PORT'] ?? 587);
define('SMTP_USERNAME', $_ENV['SMTP_USERNAME'] ?? '');
define('SMTP_PASSWORD', $_ENV['SMTP_PASSWORD'] ?? '');
define('SMTP_ENCRYPTION', $_ENV['SMTP_ENCRYPTION'] ?? 'tls');
define('FROM_EMAIL', $_ENV['FROM_EMAIL'] ?? 'noreply@fintechmanager.com');
define('FROM_NAME', $_ENV['FROM_NAME'] ?? 'FINTECH MANAGER');

// Logging configuration
define('LOG_LEVEL', $_ENV['LOG_LEVEL'] ?? 'ERROR');
define('LOG_FILE', __DIR__ . '/../../logs/app.log');

/**
 * Simple logging function
 */
function logMessage($level, $message, $context = []) {
    $levels = ['DEBUG' => 0, 'INFO' => 1, 'WARNING' => 2, 'ERROR' => 3];
    $currentLevel = $levels[LOG_LEVEL] ?? 3;
    
    if ($levels[$level] >= $currentLevel) {
        $timestamp = date('Y-m-d H:i:s');
        $contextStr = !empty($context) ? ' ' . json_encode($context) : '';
        $logEntry = "[{$timestamp}] {$level}: {$message}{$contextStr}" . PHP_EOL;
        
        // Ensure log directory exists
        $logDir = dirname(LOG_FILE);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        file_put_contents(LOG_FILE, $logEntry, FILE_APPEND | LOCK_EX);
    }
}

/**
 * Exception handler
 */
function handleException($exception) {
    logMessage('ERROR', 'Uncaught exception: ' . $exception->getMessage(), [
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'trace' => $exception->getTraceAsString()
    ]);
    
    if ($_ENV['APP_ENV'] ?? 'production' === 'development') {
        echo "Exception: " . $exception->getMessage();
    } else {
        echo "An error occurred. Please try again later.";
    }
}

set_exception_handler('handleException');

/**
 * Error handler
 */
function handleError($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    
    logMessage('ERROR', "PHP Error: {$message}", [
        'file' => $file,
        'line' => $line,
        'severity' => $severity
    ]);
    
    if ($_ENV['APP_ENV'] ?? 'production' === 'development') {
        echo "Error: {$message} in {$file} on line {$line}";
    }
    
    return true;
}

set_error_handler('handleError');

/**
 * Utility function to sanitize input
 */
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * Utility function to validate email
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Utility function to generate secure token
 */
function generateSecureToken($length = 32) {
    return bin2hex(random_bytes($length));
}

/**
 * Utility function to hash password
 */
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

/**
 * Utility function to verify password
 */
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Rate limiting function
 */
function checkRateLimit($identifier, $maxAttempts = 5, $timeWindow = 300) {
    $key = "rate_limit_{$identifier}";
    $attempts = $_SESSION[$key] ?? [];
    $now = time();
    
    // Remove old attempts
    $attempts = array_filter($attempts, function($timestamp) use ($now, $timeWindow) {
        return ($now - $timestamp) < $timeWindow;
    });
    
    if (count($attempts) >= $maxAttempts) {
        return false;
    }
    
    $attempts[] = $now;
    $_SESSION[$key] = $attempts;
    
    return true;
}

/**
 * JSON response helper
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Validate CSRF token
 */
function validateCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Generate CSRF token
 */
function generateCSRFToken() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = generateSecureToken();
    }
    return $_SESSION['csrf_token'];
}

// Initialize CSRF token
generateCSRFToken();
?>

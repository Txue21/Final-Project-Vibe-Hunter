<?php
/**
 * CPSC 3750 Final Project - Database Connection
 * PDO connection with transaction support
 */

// Database credentials
// Hostinger credentials configured
$host = 'localhost';           // Usually 'localhost' on Hostinger
$db   = 'u579280620_vibehunter';        // Hostinger database name
$user = 'u579280620_txue21';    // Hostinger database user
$pass = 'Liyuxuan520!';    // Database password
$charset = 'utf8mb4';

// DSN and PDO options
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
    PDO::ATTR_PERSISTENT         => false,  // No persistent connections
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    // Connection successful
} catch (\PDOException $e) {
    // Log error and return 500
    error_log("Database connection failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// ============================================
// TRANSACTION HELPER FUNCTIONS
// ============================================

/**
 * Begin a database transaction
 * @param PDO $connection Database connection
 * @return bool Success status
 */
function beginTransaction($connection) {
    return $connection->beginTransaction();
}

/**
 * Commit a database transaction
 * @param PDO $connection Database connection
 * @return bool Success status
 */
function commitTransaction($connection) {
    return $connection->commit();
}

/**
 * Rollback a database transaction
 * @param PDO $connection Database connection
 * @return bool Success status
 */
function rollbackTransaction($connection) {
    return $connection->rollBack();
}

/**
 * Execute a prepared statement safely
 * @param PDO $connection Database connection
 * @param string $sql SQL query
 * @param array $params Parameters for prepared statement
 * @return PDOStatement Executed statement
 */
function executeQuery($connection, $sql, $params = []) {
    try {
        $stmt = $connection->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    } catch (\PDOException $e) {
        error_log("Query failed: " . $e->getMessage());
        throw $e;
    }
}
?>
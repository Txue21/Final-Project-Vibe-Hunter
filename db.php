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
} catch (\PDOException $e) {
    error_log("Database connection failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}
?>
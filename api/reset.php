<?php
/**
 * POST /api/reset
 * Reset entire system - truncate all tables
 */

require_once __DIR__ . '/common.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    badRequest('Method not allowed');
}

try {
    // Disable foreign key checks temporarily
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
    
    // Truncate all tables in correct order
    $pdo->exec('TRUNCATE TABLE Moves');
    $pdo->exec('TRUNCATE TABLE Ships');
    $pdo->exec('TRUNCATE TABLE GamePlayers');
    $pdo->exec('TRUNCATE TABLE Games');
    $pdo->exec('TRUNCATE TABLE Players');
    
    // Re-enable foreign key checks
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    
    jsonResponse(['status' => 'reset'], 200);
    
} catch (Exception $e) {
    error_log("Reset failed: " . $e->getMessage());
    serverError('Failed to reset system');
}

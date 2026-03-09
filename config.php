<?php
/**
 * CPSC 3750 Final Project - Configuration
 * Handles TEST_MODE toggle and authentication
 */

// ============================================
// TEST MODE CONFIGURATION
// ============================================
// Set to TRUE to enable test endpoints for autograder
// Set to FALSE in production to secure test endpoints
define('TEST_MODE', true);

// Test authentication password (required for all test endpoints)
define('TEST_PASSWORD', 'clemson-test-2026');

// ============================================
// API CONFIGURATION
// ============================================
// Enable CORS for API access
define('ENABLE_CORS', true);

// JSON response settings
define('JSON_OPTIONS', JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

// ============================================
// ERROR REPORTING (Development)
// ============================================
// Disable display_errors to prevent HTML output in API responses
error_reporting(E_ALL);
ini_set('display_errors', 0);  // Changed to 0 for production
ini_set('log_errors', 1);      // Log errors instead
ini_set('error_log', __DIR__ . '/error_log.txt');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if TEST_MODE is enabled and validate password
 * @return bool True if test mode is enabled and password is valid
 */
function isTestModeValid() {
    if (!TEST_MODE) {
        return false;
    }
    
    // Check for X-Test-Password header
    $headers = getallheaders();
    $password = $headers['X-Test-Password'] ?? '';
    
    return $password === TEST_PASSWORD;
}

/**
 * Generate UUID using MySQL UUID() function
 * Falls back to PHP uniqid if MySQL not available
 * @param PDO $pdo Database connection
 * @return string UUID
 */
function generateUUID($pdo) {
    try {
        $stmt = $pdo->query("SELECT UUID() as uuid");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['uuid'];
    } catch (Exception $e) {
        // Fallback to PHP uniqid (not RFC 4122 compliant but unique enough)
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}

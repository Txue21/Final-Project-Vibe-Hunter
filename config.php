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

/**
 * Check if TEST_MODE is enabled and validate password
 * @return bool True if test mode is enabled and password is valid
 */
function isTestModeValid() {
    if (!TEST_MODE) {
        return false;
    }

    // Try getallheaders() first
    $headers = getallheaders();
    $password = $headers['X-Test-Password'] ?? '';

    // Fallback: LiteSpeed/Hostinger may not pass headers via getallheaders()
    if (empty($password)) {
        $password = $_SERVER['HTTP_X_TEST_PASSWORD'] ?? '';
    }

    return $password === TEST_PASSWORD;
}

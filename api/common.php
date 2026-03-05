<?php
/**
 * CPSC 3750 Final Project - Common API Utilities
 * Shared functions for all API endpoints
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

// ============================================
// HTTP HEADER CONFIGURATION
// ============================================

/**
 * Set CORS headers if enabled
 */
function setCorsHeaders() {
    if (ENABLE_CORS) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Test-Password');
    }
    header('Content-Type: application/json');
}

/**
 * Handle preflight OPTIONS request
 */
function handlePreflight() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        setCorsHeaders();
        http_response_code(200);
        exit;
    }
}

// ============================================
// JSON RESPONSE HELPERS
// ============================================

/**
 * Send JSON response and exit
 * @param mixed $data Response data
 * @param int $statusCode HTTP status code
 */
function jsonResponse($data, $statusCode = 200) {
    setCorsHeaders();
    http_response_code($statusCode);
    echo json_encode($data, JSON_OPTIONS);
    exit;
}

/**
 * Send error response
 * @param string $message Error message
 * @param int $statusCode HTTP status code
 */
function errorResponse($message, $statusCode = 400) {
    jsonResponse(['error' => $message], $statusCode);
}

/**
 * Send 400 Bad Request
 */
function badRequest($message = 'Bad Request') {
    errorResponse($message, 400);
}

/**
 * Send 403 Forbidden
 */
function forbidden($message = 'Forbidden') {
    errorResponse($message, 403);
}

/**
 * Send 404 Not Found
 */
function notFound($message = 'Not Found') {
    errorResponse($message, 404);
}

/**
 * Send 500 Internal Server Error
 */
function serverError($message = 'Internal Server Error') {
    errorResponse($message, 500);
}

// ============================================
// REQUEST PARSING
// ============================================

/**
 * Get JSON body from request
 * @return array|null Parsed JSON data or null
 */
function getJsonBody() {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (json_last_error() !== JSON_ERROR_NONE && !empty($json)) {
        badRequest('Invalid JSON');
    }
    
    return $data ?? [];
}

/**
 * Require specific fields in request data
 * @param array $data Request data
 * @param array $required Required field names
 * @return void Exits with 400 if validation fails
 */
function requireFields($data, $required) {
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            badRequest("Missing required field: $field");
        }
    }
}

// ============================================
// DATABASE TRANSACTION HELPERS
// ============================================

/**
 * Execute database operation with automatic transaction handling
 * @param PDO $pdo Database connection
 * @param callable $callback Function to execute within transaction
 * @return mixed Result from callback
 */
function withTransaction($pdo, $callback) {
    try {
        $pdo->beginTransaction();
        $result = $callback($pdo);
        $pdo->commit();
        return $result;
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// ============================================
// TEST MODE AUTHENTICATION
// ============================================

/**
 * Require valid test mode authentication
 * Returns 403 if test mode is disabled or password is invalid
 */
function requireTestMode() {
    if (!isTestModeValid()) {
        forbidden('Test mode is disabled or invalid authentication');
    }
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate grid size
 * @param int $gridSize Grid size to validate
 * @return bool True if valid
 */
function isValidGridSize($gridSize) {
    return is_numeric($gridSize) && $gridSize >= 5 && $gridSize <= 15;
}

/**
 * Validate max players
 * @param int $maxPlayers Max players to validate
 * @return bool True if valid
 */
function isValidMaxPlayers($maxPlayers) {
    return is_numeric($maxPlayers) && $maxPlayers >= 1;
}

/**
 * Validate coordinates within grid
 * @param int $row Row coordinate
 * @param int $col Column coordinate
 * @param int $gridSize Grid size
 * @return bool True if valid
 */
function isValidCoordinate($row, $col, $gridSize) {
    return is_numeric($row) && is_numeric($col) 
        && $row >= 0 && $row < $gridSize 
        && $col >= 0 && $col < $gridSize;
}

/**
 * Validate ship placement data
 * @param array $ships Array of ship coordinates
 * @param int $gridSize Grid size
 * @return array [isValid, errorMessage]
 */
function validateShips($ships, $gridSize) {
    // Must have exactly 3 ships
    if (count($ships) !== 3) {
        return [false, 'Must place exactly 3 ships'];
    }
    
    $positions = [];
    foreach ($ships as $ship) {
        if (!isset($ship['row']) || !isset($ship['col'])) {
            return [false, 'Each ship must have row and col'];
        }
        
        if (!isValidCoordinate($ship['row'], $ship['col'], $gridSize)) {
            return [false, 'Invalid ship coordinates'];
        }
        
        // Check for duplicate positions
        $pos = $ship['row'] . ',' . $ship['col'];
        if (in_array($pos, $positions)) {
            return [false, 'Ships cannot overlap'];
        }
        $positions[] = $pos;
    }
    
    return [true, null];
}

// ============================================
// DATABASE QUERY HELPERS
// ============================================

/**
 * Get player by ID
 * @param PDO $pdo Database connection
 * @param string $playerId Player ID
 * @return array|null Player data or null if not found
 */
function getPlayer($pdo, $playerId) {
    $stmt = $pdo->prepare("SELECT * FROM Players WHERE player_id = ?");
    $stmt->execute([$playerId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * Get game by ID
 * @param PDO $pdo Database connection
 * @param int $gameId Game ID
 * @return array|null Game data or null if not found
 */
function getGame($pdo, $gameId) {
    $stmt = $pdo->prepare("SELECT * FROM Games WHERE game_id = ?");
    $stmt->execute([$gameId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * Check if player is in game
 * @param PDO $pdo Database connection
 * @param int $gameId Game ID
 * @param string $playerId Player ID
 * @return array|null GamePlayers record or null
 */
function getGamePlayer($pdo, $gameId, $playerId) {
    $stmt = $pdo->prepare("SELECT * FROM GamePlayers WHERE game_id = ? AND player_id = ?");
    $stmt->execute([$gameId, $playerId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * Get active players in game (not eliminated)
 * @param PDO $pdo Database connection
 * @param int $gameId Game ID
 * @return array Array of player records
 */
function getActivePlayers($pdo, $gameId) {
    $stmt = $pdo->prepare("
        SELECT * FROM GamePlayers 
        WHERE game_id = ? AND is_eliminated = FALSE
        ORDER BY turn_order ASC
    ");
    $stmt->execute([$gameId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Initialize CORS and handle preflight
handlePreflight();

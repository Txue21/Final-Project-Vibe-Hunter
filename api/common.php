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
function setCorsHeaders() {
    if (ENABLE_CORS) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Test-Password');
    }
    header('Content-Type: application/json');
}

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

function jsonResponse($data, $statusCode = 200) {
    setCorsHeaders();
    http_response_code($statusCode);
    echo json_encode($data, JSON_OPTIONS);
    exit;
}

function errorResponse($message, $statusCode = 400) {
    jsonResponse(['error' => $message], $statusCode);
}

function badRequest($message = 'Bad Request') {
    errorResponse($message, 400);
}

function forbidden($message = 'Forbidden') {
    errorResponse($message, 403);
}

function notFound($message = 'Not Found') {
    errorResponse($message, 404);
}

function serverError($message = 'Internal Server Error') {
    errorResponse($message, 500);
}

// ============================================
// REQUEST PARSING
// ============================================

function getJsonBody() {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (json_last_error() !== JSON_ERROR_NONE && !empty($json)) {
        badRequest('Invalid JSON');
    }
    
    return $data ?? [];
}

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

function requireTestMode() {
    if (!isTestModeValid()) {
        forbidden('Test mode is disabled or invalid authentication');
    }
}

// ============================================
// VALIDATION HELPERS
// ============================================

function isValidGridSize($gridSize) {
    return is_numeric($gridSize) && $gridSize >= 5 && $gridSize <= 15;
}

function isValidMaxPlayers($maxPlayers) {
    return is_numeric($maxPlayers) && $maxPlayers >= 1;
}

function isValidCoordinate($row, $col, $gridSize) {
    return is_numeric($row) && is_numeric($col) 
        && $row >= 0 && $row < $gridSize 
        && $col >= 0 && $col < $gridSize;
}

/**
 * Validate multi-size ship placement.
 * Expects ships as [{start_row, start_col, size, orientation}, ...].
 * Requires exactly 3 ships with sizes 3, 4, 5 (one of each).
 * Returns [true, null, $expandedCells] on success where each cell is {row, col, group_id}.
 * Returns [false, $errorMessage, null] on failure.
 */
function validateShips($ships, $gridSize) {
    if (!is_array($ships) || count($ships) === 0) {
        return [false, 'Ships array is required', null];
    }

    if (count($ships) !== 3) {
        return [false, 'Must place exactly 3 ships', null];
    }

    // Sizes must be exactly {3, 4, 5} — one of each
    $providedSizes = array_map(function($s) {
        return isset($s['size']) ? (int)$s['size'] : 0;
    }, $ships);
    sort($providedSizes);
    if ($providedSizes !== [3, 4, 5]) {
        return [false, 'Ships must have sizes 3, 4, and 5 (one of each)', null];
    }

    $expandedCells = [];
    $allPositions  = [];

    foreach ($ships as $groupIndex => $ship) {
        if (!isset($ship['start_row']) || !isset($ship['start_col'])
            || !isset($ship['size'])    || !isset($ship['orientation'])) {
            return [false, 'Each ship must have start_row, start_col, size, and orientation', null];
        }

        $startRow    = (int)$ship['start_row'];
        $startCol    = (int)$ship['start_col'];
        $size        = (int)$ship['size'];
        $orientation = $ship['orientation'];
        $groupId     = $groupIndex + 1; // 1, 2, or 3

        if ($orientation !== 'horizontal' && $orientation !== 'vertical') {
            return [false, 'Orientation must be horizontal or vertical', null];
        }

        for ($i = 0; $i < $size; $i++) {
            $row = ($orientation === 'vertical')   ? $startRow + $i : $startRow;
            $col = ($orientation === 'horizontal') ? $startCol + $i : $startCol;

            if (!isValidCoordinate($row, $col, $gridSize)) {
                return [false, "Ship extends out of grid bounds at [$row, $col]", null];
            }

            $pos = "$row,$col";
            if (in_array($pos, $allPositions)) {
                return [false, "Ships overlap at position [$row, $col]", null];
            }
            $allPositions[]  = $pos;
            $expandedCells[] = ['row' => $row, 'col' => $col, 'group_id' => $groupId];
        }
    }

    return [true, null, $expandedCells];
}

// ============================================
// DATABASE QUERY HELPERS
// ============================================

/**
 * Get player by ID
 * FIX: Returns player_id as int in result
 */
function getPlayer($pdo, $playerId) {
    $stmt = $pdo->prepare("SELECT * FROM Players WHERE player_id = ?");
    $stmt->execute([(int)$playerId]);
    $player = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($player) {
        $player['player_id'] = (int)$player['player_id'];
    }
    return $player ?: null;
}

/**
 * Get game by ID
 */
function getGame($pdo, $gameId) {
    $stmt = $pdo->prepare("SELECT * FROM Games WHERE game_id = ?");
    $stmt->execute([$gameId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * Check if player is in game
 * FIX: Casts player_id to int before query
 */
function getGamePlayer($pdo, $gameId, $playerId) {
    $stmt = $pdo->prepare("SELECT * FROM GamePlayers WHERE game_id = ? AND player_id = ?");
    $stmt->execute([$gameId, (int)$playerId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * Get active players in game (not eliminated)
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
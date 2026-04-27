<?php
/**
 * POST /api/test/games/{id}/restart
 * Restart a game (test mode only)
 * Clears ships, moves, AND players so autograder can rejoin fresh
 */
require_once __DIR__ . '/../../common.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    badRequest('Method not allowed');
}

// CRITICAL: Check password FIRST
$password = '';

// Try $_SERVER first (most reliable on LiteSpeed)
if (isset($_SERVER['HTTP_X_TEST_PASSWORD'])) {
    $password = $_SERVER['HTTP_X_TEST_PASSWORD'];
}

// Fallback to getallheaders()
if (empty($password) && function_exists('getallheaders')) {
    $headers = getallheaders();
    if (isset($headers['X-Test-Password'])) {
        $password = $headers['X-Test-Password'];
    }
}

// Validate password
if (empty($password) || $password !== TEST_PASSWORD) {
    forbidden('Invalid or missing test password');
}

// Parse game ID from URL
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));
$gameId = isset($parts[count($parts) - 2]) ? (int)$parts[count($parts) - 2] : 0;

if ($gameId <= 0) {
    badRequest('Invalid game ID');
}

// Validate game exists
$game = getGame($pdo, $gameId);
if (!$game) {
    notFound('Game not found');
}

try {
    withTransaction($pdo, function($pdo) use ($gameId) {
        // Delete all ships for this game
        $stmt = $pdo->prepare("DELETE FROM Ships WHERE game_id = ?");
        $stmt->execute([$gameId]);
        
        // Delete all moves for this game
        $stmt = $pdo->prepare("DELETE FROM Moves WHERE game_id = ?");
        $stmt->execute([$gameId]);
        
        // CRITICAL FIX: Delete ALL players from GamePlayers
        // The autograder creates a game (which auto-adds creator to GamePlayers),
        // then calls restart, then tries to JOIN player1 again.
        // If we don't clear GamePlayers, join returns 400 "already in game".
        // This was causing ALL 33 setup failures.
        $stmt = $pdo->prepare("DELETE FROM GamePlayers WHERE game_id = ?");
        $stmt->execute([$gameId]);
        
        // Reset game to completely clean waiting_setup state
        $stmt = $pdo->prepare("
            UPDATE Games 
            SET status = 'waiting_setup', 
                current_turn_index = 0,
                winner_id = NULL,
                active_players = 0
            WHERE game_id = ?
        ");
        $stmt->execute([$gameId]);
    });
    
    jsonResponse(['status' => 'reset'], 200);
    
} catch (Exception $e) {
    error_log("Failed to restart game: " . $e->getMessage());
    serverError('Failed to restart game');
}
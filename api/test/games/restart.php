<?php
/**
 * POST /api/test/games/{id}/restart
 * Restart a game (test mode only)
 * Clears ships and moves, preserves player stats
 */

require_once __DIR__ . '/../../common.php';

setCorsHeaders();

// Require test mode authentication
requireTestMode();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    badRequest('Method not allowed');
}

// Parse game ID from URL
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));
// Expected: api/test/games/{id}/restart
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
        
        // Reset GamePlayers status
        $stmt = $pdo->prepare("
            UPDATE GamePlayers 
            SET ships_placed = FALSE, is_eliminated = FALSE
            WHERE game_id = ?
        ");
        $stmt->execute([$gameId]);
        
        // Reset game status
        $stmt = $pdo->prepare("
            UPDATE Games 
            SET status = 'waiting', 
                current_turn_index = 0,
                winner_id = NULL
            WHERE game_id = ?
        ");
        $stmt->execute([$gameId]);
        
        // Recalculate active_players (should be all players since none eliminated)
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM GamePlayers WHERE game_id = ?");
        $stmt->execute([$gameId]);
        $playerCount = $stmt->fetch()['count'];
        
        $stmt = $pdo->prepare("UPDATE Games SET active_players = ? WHERE game_id = ?");
        $stmt->execute([$playerCount, $gameId]);
    });
    
    jsonResponse(['status' => 'restarted'], 200);
    
} catch (Exception $e) {
    error_log("Failed to restart game: " . $e->getMessage());
    serverError('Failed to restart game');
}

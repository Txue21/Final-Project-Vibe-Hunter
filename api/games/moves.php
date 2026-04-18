<?php
/**
 * GET /api/games/{id}/moves
 * Get chronological move history for a game
 */

require_once __DIR__ . '/../common.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    badRequest('Method not allowed');
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
    $stmt = $pdo->prepare("
        SELECT 
            m.move_id,
            m.game_id,
            m.player_id,
            m.target_player_id,
            m.row,
            m.col,
            m.result,
            m.timestamp,
            p1.username as player_username,
            p2.username as target_username
        FROM Moves m
        JOIN Players p1 ON m.player_id = p1.player_id
        JOIN Players p2 ON m.target_player_id = p2.player_id
        WHERE m.game_id = ?
        ORDER BY m.timestamp ASC, m.move_id ASC
    ");
    $stmt->execute([$gameId]);
    $moves = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format moves with usernames
    $formattedMoves = array_map(function($move) {
        return [
            'move_id'          => (int)$move['move_id'],
            'player_id'        => (int)$move['player_id'],
            'target_player_id' => (int)$move['target_player_id'],
            'row'              => (int)$move['row'],
            'col'              => (int)$move['col'],
            'result'           => $move['result'],
            'timestamp'        => $move['timestamp'],
            'player_username'  => $move['player_username'],
            'target_username'  => $move['target_username']
        ];
    }, $moves);
    
    jsonResponse($formattedMoves, 200);
    
} catch (Exception $e) {
    error_log("Failed to get moves: " . $e->getMessage());
    serverError('Failed to retrieve move history');
}
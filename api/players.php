<?php
/**
 * Player Endpoints
 * POST /api/players - Create new player
 * GET /api/players/{id}/stats - Get player statistics
 */
require_once __DIR__ . '/common.php';
setCorsHeaders();

// ============================================
// POST /api/players - Create Player
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = getJsonBody();
    requireFields($data, ['username']);

    // PHASE 1 ADDENDUM: Client may NOT supply player_id
    if (isset($data['player_id'])) {
        badRequest('player_id cannot be supplied by client - server generates it');
    }

    $username = trim($data['username']);
    if (empty($username)) {
        badRequest('Username cannot be empty');
    }

    try {
        // Check if username already exists — if so, return existing player_id
        $stmt = $pdo->prepare("SELECT player_id FROM Players WHERE username = ?");
        $stmt->execute([$username]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            // IDENTITY REUSE: same username across games → same player_id
            jsonResponse(['player_id' => (int)$existing['player_id']], 200);
        }

        // New player — DB AUTO_INCREMENT handles player_id
        $stmt = $pdo->prepare("
            INSERT INTO Players (username, games_played, wins, losses, total_shots, total_hits)
            VALUES (?, 0, 0, 0, 0, 0)
        ");
        $stmt->execute([$username]);

        $playerId = (int)$pdo->lastInsertId();
        jsonResponse(['player_id' => $playerId], 201);

    } catch (PDOException $e) {
        error_log("Failed to create player: " . $e->getMessage());
        serverError('Failed to create player');
    }
}

// ============================================
// GET /api/players/{id}/stats - Get Player Stats
// ============================================
else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts = explode('/', trim($path, '/'));

    if (count($parts) >= 3 && $parts[count($parts) - 1] === 'stats') {
        $playerId = $parts[count($parts) - 2];

        $player = getPlayer($pdo, $playerId);

        if (!$player) {
            notFound('Player not found');
        }

        $accuracy = $player['total_shots'] > 0
            ? round($player['total_hits'] / $player['total_shots'], 3)
            : 0.0;

        jsonResponse([
            'games_played' => (int)$player['games_played'],
            'wins'         => (int)$player['wins'],
            'losses'       => (int)$player['losses'],
            'total_shots'  => (int)$player['total_shots'],
            'total_hits'   => (int)$player['total_hits'],
            'accuracy'     => $accuracy
        ], 200);
    } else {
        badRequest('Invalid endpoint');
    }
}
else {
    badRequest('Method not allowed');
}
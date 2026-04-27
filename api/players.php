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

    if (strlen($username) < 3 || strlen($username) > 12) {
        badRequest('Username must be between 3 and 12 characters');
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
// GET /api/players - Get All Players (Leaderboard)
// ============================================
else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts = explode('/', trim($path, '/'));

    // GET /api/players - List all players with stats
    if (count($parts) === 2 && $parts[1] === 'players') {
        try {
            $stmt = $pdo->query("
                SELECT
                    player_id,
                    username,
                    hide_username,
                    games_played,
                    wins,
                    losses,
                    total_shots,
                    total_hits,
                    CASE
                        WHEN total_shots > 0 THEN ROUND(total_hits / total_shots, 3)
                        ELSE 0.0
                    END as accuracy
                FROM Players
                ORDER BY wins DESC, accuracy DESC
            ");
            $players = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Convert numeric fields to integers
            foreach ($players as &$player) {
                $player['player_id'] = (int)$player['player_id'];
                $player['username'] = $player['hide_username'] ? '🕵️ Anonymous' : $player['username'];
                $player['games_played'] = (int)$player['games_played'];
                $player['wins'] = (int)$player['wins'];
                $player['losses'] = (int)$player['losses'];
                $player['total_shots'] = (int)$player['total_shots'];
                $player['total_hits'] = (int)$player['total_hits'];
                $player['accuracy'] = (float)$player['accuracy'];
            }

            jsonResponse($players, 200);
        } catch (PDOException $e) {
            error_log("Failed to fetch players: " . $e->getMessage());
            serverError('Failed to fetch players');
        }
    }
    // GET /api/players/{id}/stats - Get specific player stats
    else if (count($parts) >= 3 && $parts[count($parts) - 1] === 'stats') {
        $playerId = $parts[count($parts) - 2];

        $player = getPlayer($pdo, $playerId);

        if (!$player) {
            notFound('Player not found');
        }

        $accuracy = $player['total_shots'] > 0
            ? round($player['total_hits'] / $player['total_shots'], 3)
            : 0.0;

        jsonResponse([
            'games_played'  => (int)$player['games_played'],
            'wins'          => (int)$player['wins'],
            'losses'        => (int)$player['losses'],
            'total_shots'   => (int)$player['total_shots'],
            'total_hits'    => (int)$player['total_hits'],
            'accuracy'      => $accuracy,
            'hide_username' => (bool)$player['hide_username']
        ], 200);
    } else {
        badRequest('Invalid endpoint');
    }
}
else if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    // PATCH /api/players/{id} - Update player preferences
    preg_match('#/api/players/(\d+)/?$#', $_SERVER['REQUEST_URI'], $m);
    $playerId = isset($m[1]) ? (int)$m[1] : null;
    if (!$playerId) {
        badRequest('Player ID required');
    }
    if (!getPlayer($pdo, $playerId)) {
        notFound('Player not found');
    }
    $data = getJsonBody();
    requireFields($data, ['hide_username']);
    $hide = $data['hide_username'] ? 1 : 0;
    try {
        $pdo->prepare('UPDATE Players SET hide_username = ? WHERE player_id = ?')
            ->execute([$hide, $playerId]);
        jsonResponse(['success' => true, 'hide_username' => (bool)$hide]);
    } catch (PDOException $e) {
        error_log("Failed to update player: " . $e->getMessage());
        serverError('Failed to update player');
    }
}
else {
    badRequest('Method not allowed');
}
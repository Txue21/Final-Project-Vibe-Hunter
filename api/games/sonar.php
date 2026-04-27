<?php
/**
 * POST /api/games/{id}/sonar
 * Body: { player_id, center_row, center_col }
 *
 * Uses a "+" shape (5 cells) on grids 5–9 and a 3×3 square (9 cells) on grids 10+.
 * Each player may only use sonar once per game.
 * Advances the turn after a successful scan.
 */
require_once __DIR__ . '/../common.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    badRequest('Method not allowed');
}

// Extract game ID from URI: /api/games/{id}/sonar
$path  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));
$gameId = isset($parts[count($parts) - 2]) ? (int)$parts[count($parts) - 2] : 0;
if ($gameId <= 0) {
    badRequest('Invalid game ID');
}

$data = getJsonBody();
requireFields($data, ['player_id', 'center_row', 'center_col']);
$playerId  = (int)$data['player_id'];
$centerRow = (int)$data['center_row'];
$centerCol = (int)$data['center_col'];

try {
    $result = withTransaction($pdo, function ($pdo) use ($gameId, $playerId, $centerRow, $centerCol) {
        // Lock the game row
        $stmt = $pdo->prepare("SELECT * FROM Games WHERE game_id = ? FOR UPDATE");
        $stmt->execute([$gameId]);
        $game = $stmt->fetch();

        if (!$game) notFound('Game not found');
        if ($game['status'] !== 'active') badRequest('Game is not active');
        if ($game['game_mode'] !== 'sonar') badRequest('Sonar is not available in standard mode');
        if (!isValidCoordinate($centerRow, $centerCol, $game['grid_size'])) badRequest('Invalid coordinates');

        $gamePlayer = getGamePlayer($pdo, $gameId, $playerId);
        if (!$gamePlayer) forbidden('Player is not in this game');
        if ($gamePlayer['is_eliminated']) forbidden('Player is eliminated');
        if ((int)$gamePlayer['turn_order'] !== (int)$game['current_turn_index']) forbidden('Not your turn');
        if ($gamePlayer['sonar_used']) badRequest('Sonar already used this game');

        $gridSize = (int)$game['grid_size'];

        // Build scan offsets
        if ($gridSize <= 9) {
            // "+" shape: center + 4 cardinal neighbours
            $offsets   = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
            $scanShape = 'plus';
        } else {
            // 3×3 square
            $offsets = [];
            for ($dr = -1; $dr <= 1; $dr++) {
                for ($dc = -1; $dc <= 1; $dc++) {
                    $offsets[] = [$dr, $dc];
                }
            }
            $scanShape = '3x3';
        }

        // Clip scan cells to grid bounds
        $scanCells = [];
        foreach ($offsets as [$dr, $dc]) {
            $r = $centerRow + $dr;
            $c = $centerCol + $dc;
            if ($r >= 0 && $r < $gridSize && $c >= 0 && $c < $gridSize) {
                $scanCells[] = ['row' => $r, 'col' => $c];
            }
        }

        // Collect all opponent ship cells within the scan area
        $hasSignal = false;
        $shipCells = [];
        foreach ($scanCells as $cell) {
            $stmt = $pdo->prepare("
                SELECT COUNT(*) FROM Ships s
                JOIN GamePlayers gp
                  ON s.game_id = gp.game_id AND s.player_id = gp.player_id
                WHERE s.game_id = ?
                  AND s.row      = ?
                  AND s.col      = ?
                  AND s.player_id != ?
                  AND gp.is_eliminated = FALSE
            ");
            $stmt->execute([$gameId, $cell['row'], $cell['col'], $playerId]);
            if ((int)$stmt->fetchColumn() > 0) {
                $hasSignal = true;
                $shipCells[] = $cell;
            }
        }

        // Mark sonar as used for this player
        $stmt = $pdo->prepare("UPDATE GamePlayers SET sonar_used = TRUE WHERE game_id = ? AND player_id = ?");
        $stmt->execute([$gameId, $playerId]);

        // Advance turn (same logic as fire.php)
        $activePlayers = getActivePlayers($pdo, $gameId);
        $currentIndex  = -1;
        foreach ($activePlayers as $i => $ap) {
            if ((int)$ap['turn_order'] === (int)$game['current_turn_index']) {
                $currentIndex = $i;
                break;
            }
        }
        $nextPlayer = $activePlayers[($currentIndex + 1) % count($activePlayers)];

        $stmt = $pdo->prepare("UPDATE Games SET current_turn_index = ? WHERE game_id = ?");
        $stmt->execute([$nextPlayer['turn_order'], $gameId]);

        return [
            'has_signal'     => $hasSignal,
            'scan_cells'     => $scanCells,
            'ship_cells'     => $shipCells,
            'scan_shape'     => $scanShape,
            'center'         => ['row' => $centerRow, 'col' => $centerCol],
            'next_player_id' => (int)$nextPlayer['player_id'],
            'game_status'    => 'active',
        ];
    });

    jsonResponse($result, 200);
} catch (Exception $e) {
    error_log("Sonar failed: " . $e->getMessage());
    serverError('Failed to process sonar scan');
}

<?php
/**
 * POST /api/games/{id}/surrender
 * Body: { player_id }
 *
 * Eliminates the player immediately (not turn-gated).
 * If only 1 active player remains, the game is finished and stats are updated.
 * If it was the surrendering player's turn, advances to the next player.
 */
require_once __DIR__ . '/../common.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    badRequest('Method not allowed');
}

// Extract game ID from URI: /api/games/{id}/surrender
$path  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));
$gameId = isset($parts[count($parts) - 2]) ? (int)$parts[count($parts) - 2] : 0;
if ($gameId <= 0) {
    badRequest('Invalid game ID');
}

$data = getJsonBody();
requireFields($data, ['player_id']);
$playerId = (int)$data['player_id'];

try {
    $result = withTransaction($pdo, function ($pdo) use ($gameId, $playerId) {
        // Lock the game row
        $stmt = $pdo->prepare("SELECT * FROM Games WHERE game_id = ? FOR UPDATE");
        $stmt->execute([$gameId]);
        $game = $stmt->fetch();

        if (!$game) notFound('Game not found');
        if ($game['status'] !== 'active') badRequest('Game is not active');

        $gamePlayer = getGamePlayer($pdo, $gameId, $playerId);
        if (!$gamePlayer) forbidden('Player is not in this game');
        if ($gamePlayer['is_eliminated']) badRequest('Player is already eliminated');

        $wasTurn = ((int)$gamePlayer['turn_order'] === (int)$game['current_turn_index']);

        // Eliminate the surrendering player
        $stmt = $pdo->prepare("UPDATE GamePlayers SET is_eliminated = TRUE WHERE game_id = ? AND player_id = ?");
        $stmt->execute([$gameId, $playerId]);

        $stmt = $pdo->prepare("UPDATE Games SET active_players = active_players - 1 WHERE game_id = ?");
        $stmt->execute([$gameId]);

        // Re-read active_players count
        $stmt = $pdo->prepare("SELECT active_players FROM Games WHERE game_id = ?");
        $stmt->execute([$gameId]);
        $updatedGame = $stmt->fetch();
        $remaining   = (int)$updatedGame['active_players'];

        $winnerId   = null;
        $gameStatus = 'active';

        if ($remaining === 1) {
            // One player left — declare winner
            $stmt = $pdo->prepare("
                SELECT player_id FROM GamePlayers
                WHERE game_id = ? AND is_eliminated = FALSE
                LIMIT 1
            ");
            $stmt->execute([$gameId]);
            $winner   = $stmt->fetch();
            $winnerId = $winner ? (int)$winner['player_id'] : null;
            $gameStatus = 'finished';

            $stmt = $pdo->prepare("UPDATE Games SET status = 'finished', winner_id = ? WHERE game_id = ?");
            $stmt->execute([$winnerId, $gameId]);

            // Update winner stats
            if ($winnerId) {
                $stmt = $pdo->prepare("
                    UPDATE Players SET games_played = games_played + 1, wins = wins + 1
                    WHERE player_id = ?
                ");
                $stmt->execute([$winnerId]);
            }

            // Update loser stats for all other participants
            $stmt = $pdo->prepare("
                UPDATE Players p
                INNER JOIN GamePlayers gp ON p.player_id = gp.player_id
                SET p.games_played = p.games_played + 1, p.losses = p.losses + 1
                WHERE gp.game_id = ? AND p.player_id != ?
            ");
            $stmt->execute([$gameId, $winnerId]);

        } elseif ($wasTurn) {
            // It was this player's turn — advance to the next active player
            $activePlayers = getActivePlayers($pdo, $gameId);
            if (!empty($activePlayers)) {
                $nextPlayer = null;
                foreach ($activePlayers as $ap) {
                    if ((int)$ap['turn_order'] > (int)$game['current_turn_index']) {
                        $nextPlayer = $ap;
                        break;
                    }
                }
                if (!$nextPlayer) $nextPlayer = $activePlayers[0];

                $stmt = $pdo->prepare("UPDATE Games SET current_turn_index = ? WHERE game_id = ?");
                $stmt->execute([$nextPlayer['turn_order'], $gameId]);
            }
        }

        return ['game_status' => $gameStatus, 'winner_id' => $winnerId];
    });

    jsonResponse($result, 200);
} catch (Exception $e) {
    error_log("Surrender failed: " . $e->getMessage());
    serverError('Failed to process surrender');
}

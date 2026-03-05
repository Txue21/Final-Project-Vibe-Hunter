<?php
/**
 * POST /api/games/{id}/fire
 * Fire at a coordinate (Most complex endpoint)
 */

require_once __DIR__ . '/../common.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    badRequest('Method not allowed');
}

// Parse game ID from URL
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));
// Expected: api/games/{id}/fire
$gameId = isset($parts[count($parts) - 2]) ? (int)$parts[count($parts) - 2] : 0;

if ($gameId <= 0) {
    badRequest('Invalid game ID');
}

$data = getJsonBody();
requireFields($data, ['player_id', 'row', 'col']);

$playerId = $data['player_id'];
$row = (int)$data['row'];
$col = (int)$data['col'];

try {
    $result = withTransaction($pdo, function($pdo) use ($gameId, $playerId, $row, $col) {
        
        // Lock game row for update (prevent race conditions)
        $game = $pdo->query("SELECT * FROM Games WHERE game_id = $gameId FOR UPDATE")->fetch();
        
        if (!$game) {
            notFound('Game not found');
        }
        
        // Validate game status
        if ($game['status'] !== 'active') {
            badRequest('Game is not active');
        }
        
        // Validate coordinates
        if (!isValidCoordinate($row, $col, $game['grid_size'])) {
            badRequest('Invalid coordinates');
        }
        
        // Get current player's game info
        $gamePlayer = getGamePlayer($pdo, $gameId, $playerId);
        if (!$gamePlayer) {
            badRequest('Player is not in this game');
        }
        
        if ($gamePlayer['is_eliminated']) {
            badRequest('Player is eliminated');
        }
        
        // Validate it's player's turn
        if ($gamePlayer['turn_order'] != $game['current_turn_index']) {
            badRequest('Not your turn');
        }
        
        // Get all active (non-eliminated) players except current player
        $stmt = $pdo->prepare("
            SELECT player_id, turn_order 
            FROM GamePlayers 
            WHERE game_id = ? AND is_eliminated = FALSE AND player_id != ?
        ");
        $stmt->execute([$gameId, $playerId]);
        $targets = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($targets)) {
            badRequest('No valid targets');
        }
        
        // Select random target (or you could use round-robin)
        $targetPlayer = $targets[array_rand($targets)];
        $targetPlayerId = $targetPlayer['player_id'];
        
        // Check if hit or miss
        $stmt = $pdo->prepare("
            SELECT ship_id FROM Ships 
            WHERE game_id = ? AND player_id = ? AND row = ? AND col = ? AND is_sunk = FALSE
        ");
        $stmt->execute([$gameId, $targetPlayerId, $row, $col]);
        $ship = $stmt->fetch();
        
        $isHit = $ship !== false;
        $result = $isHit ? 'hit' : 'miss';
        
        // Log the move
        $stmt = $pdo->prepare("
            INSERT INTO Moves (game_id, player_id, target_player_id, row, col, result)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$gameId, $playerId, $targetPlayerId, $row, $col, $result]);
        
        // Update player stats
        $stmt = $pdo->prepare("
            UPDATE Players 
            SET total_shots = total_shots + 1" . ($isHit ? ", total_hits = total_hits + 1" : "") . "
            WHERE player_id = ?
        ");
        $stmt->execute([$playerId]);
        
        $winnerId = null;
        $gameStatus = 'active';
        
        // If hit, mark ship as sunk and check elimination
        if ($isHit) {
            $stmt = $pdo->prepare("UPDATE Ships SET is_sunk = TRUE WHERE ship_id = ?");
            $stmt->execute([$ship['ship_id']]);
            
            // Check if target is eliminated (all ships sunk)
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN is_sunk = TRUE THEN 1 ELSE 0 END) as sunk
                FROM Ships
                WHERE game_id = ? AND player_id = ?
            ");
            $stmt->execute([$gameId, $targetPlayerId]);
            $shipCounts = $stmt->fetch();
            
            if ($shipCounts['total'] == $shipCounts['sunk']) {
                // Eliminate target player
                $stmt = $pdo->prepare("
                    UPDATE GamePlayers 
                    SET is_eliminated = TRUE 
                    WHERE game_id = ? AND player_id = ?
                ");
                $stmt->execute([$gameId, $targetPlayerId]);
                
                // Decrement active players
                $stmt = $pdo->prepare("
                    UPDATE Games 
                    SET active_players = active_players - 1 
                    WHERE game_id = ?
                ");
                $stmt->execute([$gameId]);
                
                $game['active_players']--;
                
                // Check win condition
                if ($game['active_players'] == 1) {
                    $gameStatus = 'finished';
                    $winnerId = $playerId;
                    
                    // Update game
                    $stmt = $pdo->prepare("
                        UPDATE Games 
                        SET status = 'finished', winner_id = ? 
                        WHERE game_id = ?
                    ");
                    $stmt->execute([$winnerId, $gameId]);
                    
                    // Update player stats
                    $stmt = $pdo->prepare("
                        UPDATE Players 
                        SET games_played = games_played + 1, wins = wins + 1 
                        WHERE player_id = ?
                    ");
                    $stmt->execute([$winnerId]);
                    
                    // Update all other players (losses)
                    $stmt = $pdo->prepare("
                        UPDATE Players p
                        INNER JOIN GamePlayers gp ON p.player_id = gp.player_id
                        SET p.games_played = p.games_played + 1,
                            p.losses = p.losses + 1
                        WHERE gp.game_id = ? AND p.player_id != ?
                    ");
                    $stmt->execute([$gameId, $winnerId]);
                }
            }
        }
        
        // Advance turn to next active player
        $nextPlayerId = null;
        if ($gameStatus === 'active') {
            $activePlayers = getActivePlayers($pdo, $gameId);
            
            // Find next player in turn order
            $currentIndex = -1;
            foreach ($activePlayers as $i => $ap) {
                if ($ap['turn_order'] == $game['current_turn_index']) {
                    $currentIndex = $i;
                    break;
                }
            }
            
            // Get next active player (circular)
            $nextIndex = ($currentIndex + 1) % count($activePlayers);
            $nextPlayer = $activePlayers[$nextIndex];
            $nextPlayerId = $nextPlayer['player_id'];
            $nextTurnOrder = $nextPlayer['turn_order'];
            
            // Update current turn index
            $stmt = $pdo->prepare("UPDATE Games SET current_turn_index = ? WHERE game_id = ?");
            $stmt->execute([$nextTurnOrder, $gameId]);
        }
        
        return [
            'result' => $result,
            'next_player_id' => $nextPlayerId,
            'game_status' => $gameStatus,
            'winner_id' => $winnerId
        ];
    });
    
    jsonResponse($result, 200);
    
} catch (Exception $e) {
    error_log("Fire failed: " . $e->getMessage());
    serverError('Failed to process fire command');
}

<?php
/**
 * One-shot migration: adds game_mode to Games and sonar_used to GamePlayers.
 * Safe to run multiple times — duplicate-column errors are silently ignored.
 */
require_once __DIR__ . '/common.php';

$migrations = [
    "ALTER TABLE Games ADD COLUMN game_mode ENUM('standard','sonar') NOT NULL DEFAULT 'standard'",
    "ALTER TABLE GamePlayers ADD COLUMN sonar_used BOOLEAN NOT NULL DEFAULT FALSE",
];

$results = [];
foreach ($migrations as $sql) {
    try {
        $pdo->exec($sql);
        $results[] = ['sql' => $sql, 'status' => 'ok'];
    } catch (PDOException $e) {
        // MySQL error 1060 = "Duplicate column name" — column already exists
        if (strpos($e->getMessage(), '1060') !== false) {
            $results[] = ['sql' => $sql, 'status' => 'already_exists'];
        } else {
            $results[] = ['sql' => $sql, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }
}

jsonResponse(['migration' => 'complete', 'results' => $results], 200);

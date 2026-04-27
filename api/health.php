<?php
require_once __DIR__ . '/common.php';

setCorsHeaders();

jsonResponse(['status' => 'ok'], 200);
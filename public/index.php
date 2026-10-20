<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Normalize SCRIPT_NAME when routed via root .htaccess on shared hosting (e.g. Hostinger)
if (
    isset($_SERVER['SCRIPT_NAME'], $_SERVER['REQUEST_URI']) &&
    str_starts_with($_SERVER['SCRIPT_NAME'], '/public/index.php') &&
    ! str_starts_with($_SERVER['REQUEST_URI'], '/public')
) {
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['PHP_SELF'] = '/index.php';
}

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
(require_once __DIR__.'/../bootstrap/app.php')
    ->handleRequest(Request::capture());

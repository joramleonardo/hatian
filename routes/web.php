<?php

use App\Http\Controllers\HatianController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HatianController::class, 'index'])->name('home');

// Diagnostic route for Hostinger database & health check
Route::get('/diagnose', function (\Illuminate\Http\Request $request) {
    $dbStatus = 'UNKNOWN';
    $dbError = null;
    $tables = [];
    $hasReceiptImagesCol = false;
    $migrationsRun = [];

    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        $dbStatus = 'CONNECTED';

        $tablesList = \Illuminate\Support\Facades\DB::select('SHOW TABLES');
        $dbName = \Illuminate\Support\Facades\DB::getDatabaseName();
        $key = 'Tables_in_' . $dbName;
        foreach ($tablesList as $t) {
            $tables[] = $t->$key ?? (array_values((array) $t)[0] ?? '');
        }

        if (in_array('hatians', $tables)) {
            $hasReceiptImagesCol = \Illuminate\Support\Facades\Schema::hasColumn('hatians', 'receipt_images');
        }

        if (in_array('migrations', $tables)) {
            $migrationsRun = \Illuminate\Support\Facades\DB::table('migrations')->pluck('migration')->toArray();
        }
    } catch (\Throwable $e) {
        $dbStatus = 'FAILED';
        $dbError = $e->getMessage();
    }

    $migrateOutput = null;
    if ($request->has('migrate') && $dbStatus === 'CONNECTED') {
        try {
            \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
            $migrateOutput = \Illuminate\Support\Facades\Artisan::output();

            if (\Illuminate\Support\Facades\Schema::hasTable('hatians')) {
                $hasReceiptImagesCol = \Illuminate\Support\Facades\Schema::hasColumn('hatians', 'receipt_images');
            }
        } catch (\Throwable $e) {
            $migrateOutput = 'Migration error: ' . $e->getMessage();
        }
    }

    $storageLogsWritable = is_writable(storage_path('logs'));
    $storageFrameworkWritable = is_writable(storage_path('framework'));
    $storageSessionsWritable = is_writable(storage_path('framework/sessions'));

    $logFile = storage_path('logs/laravel.log');
    $recentLogs = 'No logs found.';
    if (file_exists($logFile)) {
        $lines = file($logFile);
        $recentLogs = implode('', array_slice($lines, -35));
    }

    $dbPasswordPlaceholder = env('DB_PASSWORD') === 'PASTE_YOUR_MYSQL_PASSWORD_HERE';

    return response(view('diagnose', compact(
        'dbStatus',
        'dbError',
        'tables',
        'hasReceiptImagesCol',
        'migrationsRun',
        'migrateOutput',
        'storageLogsWritable',
        'storageFrameworkWritable',
        'storageSessionsWritable',
        'recentLogs',
        'dbPasswordPlaceholder'
    )))->header('Content-Type', 'text/html');
})->name('diagnose');

// Public & Guest-friendly Hatian routes
Route::post('/hatians', [HatianController::class, 'store'])->name('hatians.store');
Route::get('/s/{share_code}', [HatianController::class, 'show'])->name('hatians.show');
Route::put('/hatians/{share_code}', [HatianController::class, 'update'])->name('hatians.update');
Route::patch('/hatians/{share_code}/participants/{participant_id}/toggle-paid', [HatianController::class, 'togglePaid'])->name('hatians.toggle-paid');
Route::post('/hatians/{share_code}/duplicate', [HatianController::class, 'duplicate'])->name('hatians.duplicate');
Route::delete('/hatians/{share_code}', [HatianController::class, 'destroy'])->name('hatians.destroy');

// Authenticated Dashboard & Account routes
Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [HatianController::class, 'dashboard'])->name('dashboard');
    Route::post('/hatians/claim', [HatianController::class, 'claim'])->name('hatians.claim');
    Route::put('/settings/payment-methods', [HatianController::class, 'updatePaymentMethods'])->name('settings.payment-methods');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

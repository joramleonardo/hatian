<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hatian Server & Database Diagnostic</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #FBF8F3;
            color: #1F2421;
            margin: 0;
            padding: 24px 16px;
        }
        .container {
            max-width: 820px;
            margin: 0 auto;
        }
        .card {
            background: #ffffff;
            border: 1px solid #E7DED3;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        h1 {
            color: #0C2D37;
            font-size: 24px;
            margin: 0 0 8px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .subtitle {
            color: #64748B;
            font-size: 14px;
            margin: 0 0 20px 0;
        }
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        .badge-success {
            background: #DCFCE7;
            color: #166534;
        }
        .badge-danger {
            background: #FEE2E2;
            color: #991B1B;
        }
        .badge-warning {
            background: #FEF3C7;
            color: #92400E;
        }
        .alert {
            padding: 14px 18px;
            border-radius: 12px;
            font-size: 13px;
            line-height: 1.5;
            margin: 14px 0;
        }
        .alert-danger {
            background: #FEF2F2;
            border: 1px solid #FCA5A5;
            color: #991B1B;
        }
        .alert-warning {
            background: #FFFBEB;
            border: 1px solid #FCD34D;
            color: #92400E;
        }
        .alert-success {
            background: #F0FDF4;
            border: 1px solid #86EFAC;
            color: #166534;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #D95D28;
            color: #ffffff;
            padding: 10px 18px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 13px;
            border: none;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn:hover {
            background: #C2410C;
        }
        .btn-outline {
            background: transparent;
            color: #0C2D37;
            border: 1px solid #E7DED3;
        }
        .btn-outline:hover {
            background: #F8FAFC;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-top: 10px;
        }
        th, td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #F1F5F9;
        }
        th {
            color: #64748B;
            font-weight: 600;
            width: 35%;
        }
        td {
            color: #1E293B;
            word-break: break-all;
        }
        pre {
            background: #0F172A;
            color: #E2E8F0;
            padding: 16px;
            border-radius: 12px;
            font-size: 11px;
            overflow-x: auto;
            max-height: 280px;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>
                <span>🧾 Hatian System Diagnostics</span>
                @if($dbStatus === 'CONNECTED' && !$dbPasswordPlaceholder && in_array('hatians', $tables) && $hasReceiptImagesCol)
                    <span class="badge badge-success">ALL SYSTEMS READY</span>
                @else
                    <span class="badge badge-danger">ACTION REQUIRED</span>
                @endif
            </h1>
            <p class="subtitle">Use this page to verify Hostinger MySQL database connectivity, schema tables, and recent logs.</p>

            @if($migrateOutput)
                <div class="alert alert-success">
                    <strong>Migration Output:</strong>
                    <pre style="margin-top:8px;max-height:160px;">{{ $migrateOutput }}</pre>
                </div>
            @endif

            @if($dbPasswordPlaceholder)
                <div class="alert alert-danger">
                    <strong>⚠️ Database Password Not Configured:</strong>
                    <br>Your <code>.env</code> file currently contains the placeholder password <code>PASTE_YOUR_MYSQL_PASSWORD_HERE</code>.
                    <br>Open Hostinger <strong>File Manager</strong>, double click <code>.env</code>, and update <code>DB_PASSWORD="your-mysql-password"</code>.
                </div>
            @endif

            @if($dbStatus === 'FAILED')
                <div class="alert alert-danger">
                    <strong>❌ Database Connection Error:</strong>
                    <br>{{ $dbError }}
                    <br><br>
                    <strong>How to fix:</strong>
                    <ol style="margin:6px 0 0 16px;padding:0;">
                        <li>Verify <code>DB_DATABASE</code> and <code>DB_USERNAME</code> match your Hostinger MySQL database name exactly (usually <code>u962919458_hatian</code>).</li>
                        <li>Verify <code>DB_PASSWORD</code> in <code>.env</code> matches the password you created for the database user.</li>
                        <li>Try changing <code>DB_HOST=127.0.0.1</code> to <code>DB_HOST=localhost</code> (or vice versa).</li>
                    </ol>
                </div>
            @endif

            @if($dbStatus === 'CONNECTED' && !in_array('hatians', $tables))
                <div class="alert alert-warning">
                    <strong>⚠️ Database is connected, but the <code>hatians</code> table is missing!</strong>
                    <br>Click the <strong>Run Migrations</strong> button below to automatically create all tables, or import <code>database/hatian_mysql_schema.sql</code> via phpMyAdmin.
                    <div style="margin-top: 10px;">
                        <a href="{{ url('/diagnose?migrate=1') }}" class="btn">▶ Run Migrations Now</a>
                    </div>
                </div>
            @elseif($dbStatus === 'CONNECTED' && !$hasReceiptImagesCol)
                <div class="alert alert-warning">
                    <strong>⚠️ Column <code>receipt_images</code> is missing from table <code>hatians</code>!</strong>
                    <br>This happens if you imported an earlier schema. Click the button below to update the schema automatically:
                    <div style="margin-top: 10px;">
                        <a href="{{ url('/diagnose?migrate=1') }}" class="btn">▶ Run Pending Migrations</a>
                    </div>
                </div>
            @endif

            <table>
                <tr>
                    <th>Database Status</th>
                    <td>
                        @if($dbStatus === 'CONNECTED')
                            <span class="badge badge-success">CONNECTED</span>
                        @else
                            <span class="badge badge-danger">FAILED</span>
                        @endif
                    </td>
                </tr>
                <tr>
                    <th>Database Connection</th>
                    <td><code>{{ config('database.default') }}</code> (Host: <code>{{ config('database.connections.mysql.host') }}</code>:{{ config('database.connections.mysql.port') }})</td>
                </tr>
                <tr>
                    <th>Database Name</th>
                    <td><code>{{ config('database.connections.mysql.database') }}</code></td>
                </tr>
                <tr>
                    <th>Database User</th>
                    <td><code>{{ config('database.connections.mysql.username') }}</code></td>
                </tr>
                <tr>
                    <th>Tables Found</th>
                    <td>
                        @if(!empty($tables))
                            <code>{{ implode(', ', $tables) }}</code>
                        @else
                            <span style="color:#DC2626;">None (Database is empty)</span>
                        @endif
                    </td>
                </tr>
                <tr>
                    <th>Receipt Images Column</th>
                    <td>
                        @if($hasReceiptImagesCol)
                            <span class="badge badge-success">EXISTS</span>
                        @else
                            <span class="badge badge-danger">MISSING</span>
                        @endif
                    </td>
                </tr>
                <tr>
                    <th>Storage Writable</th>
                    <td>
                        Logs: @if($storageLogsWritable) <span class="badge badge-success">YES</span> @else <span class="badge badge-danger">NO</span> @endif
                        &nbsp;|&nbsp; Sessions: @if($storageSessionsWritable) <span class="badge badge-success">YES</span> @else <span class="badge badge-danger">NO</span> @endif
                    </td>
                </tr>
                <tr>
                    <th>PHP Version</th>
                    <td>PHP {{ PHP_VERSION }}</td>
                </tr>
            </table>

            <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                <a href="{{ url('/') }}" class="btn btn-outline">← Back to Hatian Splitter</a>
                @if($dbStatus === 'CONNECTED')
                    <a href="{{ url('/diagnose?migrate=1') }}" class="btn">Run / Re-run Migrations</a>
                @endif
                <a href="{{ url('/diagnose') }}" class="btn btn-outline">Refresh Status</a>
            </div>
        </div>

        <div class="card">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #0C2D37;">Recent Laravel Logs (Last 35 lines)</h3>
            <p class="subtitle" style="margin-bottom: 10px;">If an error occurs when clicking 'Create Shareable Link', the exact error details appear below:</p>
            <pre>{{ $recentLogs }}</pre>
        </div>
    </div>
</body>
</html>

<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class CheckSSLCertificates extends Command
{
    protected $signature = 'monitor:ssl';

    protected $description = 'التحقق من انتهاء صلاحية شهادات SSL';

    public function handle(): int
    {
        $this->info('بدء تنفيذ CheckSSLCertificates...');
        $startTime = microtime(true);

        try {
            $domains = config('monitoring.ssl_domains', []);

            foreach ($domains as $domain) {
                $stream = @stream_context_create(['ssl' => ['capture_peer_cert' => true]]);
                $socket = @stream_socket_client(
                    "ssl://{$domain}:443",
                    $errno,
                    $errstr,
                    30,
                    STREAM_CLIENT_CONNECT,
                    $stream
                );

                if ($socket) {
                    $params = stream_context_get_params($socket);
                    $cert = openssl_x509_parse($params['options']['ssl']['peer_certificate']);
                    $expiry = \Carbon\Carbon::createFromTimestamp($cert['validTo_time_t']);
                    $daysLeft = now()->diffInDays($expiry, false);

                    $this->info("{$domain}: expires in {$daysLeft} days ({$expiry->format('Y-m-d')})");

                    if ($daysLeft < 30) {
                        Notification::route('mail', config('monitoring.alert_email'))
                            ->notify(new \App\Notifications\SslCertificateExpiringSoon($domain, $daysLeft));
                        $this->warn("  ⚠️  SSL expiring soon for {$domain}!");
                    }

                    fclose($socket);
                } else {
                    $this->error("  ✗ Could not check SSL for {$domain}: {$errstr}");
                }
            }

            $elapsed = round(microtime(true) - $startTime, 2);
            $this->info("تم التنفيذ بنجاح في {$elapsed} ثانية");
            Log::info('CheckSSLCertificates completed', ['elapsed' => $elapsed]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("خطأ: {$e->getMessage()}");
            Log::error('CheckSSLCertificates failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }
    }
}

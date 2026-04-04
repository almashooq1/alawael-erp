<?php

// إعدادات نظام النسخ الاحتياطي
return [
    // مفتاح التشفير AES-256 (يجب تخزينه في .env)
    'encryption_key' => env('BACKUP_ENCRYPTION_KEY'),

    // البريد الإلكتروني لتنبيهات الفشل
    'alert_email' => env('BACKUP_ALERT_EMAIL', 'admin@rehab.sa'),

    // مسار التخزين المؤقت
    'tmp_path' => storage_path('backups/tmp'),

    // إعدادات S3
    's3' => [
        'bucket' => env('AWS_BACKUP_BUCKET'),
        'region' => env('AWS_DEFAULT_REGION', 'me-south-1'),
        'prefix' => 'rehab-erp-backups',
    ],

    // إعدادات الاحتفاظ الافتراضية
    'retention' => [
        'daily' => 7,    // احتفاظ بالنسخ اليومية 7 أيام
        'weekly' => 4,   // احتفاظ بالنسخ الأسبوعية 4 أسابيع
        'monthly' => 12, // احتفاظ بالنسخ الشهرية 12 شهراً
    ],

    // إعدادات RTO/RPO
    'rto_hours' => env('BACKUP_RTO_HOURS', 4),  // Recovery Time Objective
    'rpo_hours' => env('BACKUP_RPO_HOURS', 1),  // Recovery Point Objective

    // مسارات الملفات للنسخ الاحتياطي
    'paths_to_backup' => [
        storage_path('app/uploads'),
        storage_path('app/exports'),
        base_path('config'),
    ],
];

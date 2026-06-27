# Route Mount Audit Report

## Executive Summary

| Metric | Count |
|--------|-------|
| Total Route Mount Points | 784 |
| Files Involved | 64 |
| Unique Paths | 720 |
| Authenticated Mounts | 140 |
| Unauthenticated Mounts | 644 |

## Route Mounts by File


### api\versionRouter.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/versions` | get | No | 133 |

### app.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/admin/hr/cpe` | use | No | 959 |
| `/api/admin/outcomes` | use | No | 970 |
| `/api/auth/nafath` | use | Yes | 232 |
| `/api/docs` | use | No | 246 |
| `/api/documents-pro/forms` | use | No | 298 |
| `/api/iq-assessments` | use | No | 2641 |
| `/api/ops` | use | Yes | 2235 |
| `/api/sso` | use | No | 220 |
| `/api/sso/nafath` | use | No | 234 |
| `/api/v1` | use | No | 113 |
| `/api/v1/admin/audit` | use | No | 368 |
| `/api/v1/admin/notifications-log` | use | No | 341 |
| `/api/v1/admin/ops` | use | No | 2432 |
| `/api/v1/admin/outcomes` | use | No | 971 |
| `/api/v1/admin/red-flags` | use | Yes | 479 |
| `/api/v1/admin/zatca-credentials` | use | No | 2454 |
| `/api/v1/ai/recommendations` | use | No | 2424 |
| `/api/v1/alerts/dashboard` | use | Yes | 1626 |
| `/api/v1/auth/nafath` | use | Yes | 233 |
| `/api/v1/beneficiaries` | use | Yes | 478 |
| `/api/v1/bi` | use | No | 2416 |
| `/api/v1/codes` | use | No | 360 |
| `/api/v1/compensation-benefits` | use | No | 2605 |
| `/api/v1/complaints` | use | No | 2632 |
| `/api/v1/contract-management` | use | No | 2623 |
| `/api/v1/dashboards/alerts` | use | Yes | 1362 |
| `/api/v1/dashboards/saved-views` | use | Yes | 1375 |
| `/api/v1/employee-affairs` | use | No | 2509 |
| `/api/v1/employee-affairs-expanded` | use | No | 2533 |
| `/api/v1/employee-affairs-phase2` | use | No | 2517 |
| `/api/v1/employee-affairs-phase3` | use | No | 2525 |
| `/api/v1/employee-portal` | use | No | 2500 |
| `/api/v1/forms/catalog` | use | No | 288 |
| `/api/v1/goal-suggestions` | use | Yes | 1235 |
| `/api/v1/hr` | use | Yes | 702 |
| `/api/v1/hr-attendance` | use | No | 2560 |
| `/api/v1/hr-system` | use | No | 2614 |
| `/api/v1/hr/insurance` | use | No | 2551 |
| `/api/v1/hr/performance` | use | Yes | 2464 |
| `/api/v1/insurance` | use | No | 2491 |
| `/api/v1/iq-assessments` | use | No | 2642 |
| `/api/v1/kpi-dashboard` | use | No | 2587 |
| `/api/v1/landing` | use | No | 306 |
| `/api/v1/leave-requests` | use | No | 2578 |
| `/api/v1/nafath/signing` | use | No | 199 |
| `/api/v1/payroll` | use | No | 2473 |
| `/api/v1/portal` | use | No | 2408 |
| `/api/v1/public/forms` | use | No | 325 |
| `/api/v1/public/uploads` | use | No | 333 |
| `/api/v1/public/visitor` | use | Yes | 376 |
| `/api/v1/push` | use | No | 350 |
| `/api/v1/recruitment` | use | No | 2482 |
| `/api/v1/rehab/disciplines` | use | Yes | 649 |
| `/api/v1/rehab/goal-suggestions` | use | Yes | 1234 |
| `/api/v1/reports/ops` | use | Yes | 1247 |
| `/api/v1/sso` | use | No | 221 |
| `/api/v1/student` | use | No | 209 |
| `/api/v1/therapist` | use | No | 2400 |
| `/api/v1/training` | use | No | 2542 |
| `/api/v1/uploads` | use | No | 315 |
| `/api/v1/wasel/address` | use | No | 262 |
| `/api/v1/webhooks/nphies` | use | No | 268 |
| `/api/v1/work-shifts` | use | No | 2596 |
| `/api/v1/yakeen/verify` | use | No | 256 |
| `/api/v1/zkteco` | use | No | 2569 |
| `/api/v2/domains/health` | get | No | 146 |

### authorization\access-console\access-console.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/access-control` | use | Yes | 17 |

### authorization\approvals\approvals.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/approvals` | use | No | 6 |

### authorization\break-glass\break-glass.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/break-glass` | use | No | 4 |

### authorization\sod\sod.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/sod` | use | Yes | 4 |

### config\swagger.config.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api-docs` | use | No | 315 |
| `/api/docs` | use | No | 318 |
| `/api/docs/openapi.json` | get | No | 322 |

### database\circuit-breaker.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api` | use | No | 306 |

### domains\core\routes\core.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/core` | use | No | 7 |

### domains\sessions\index.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/admin/therapy-sessions` | use | Yes | 249 |

### infrastructure\eventStore.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v2/event-store` | use | No | 449 |

### infrastructure\messageQueue.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v2/message-queue` | use | No | 460 |

### infrastructure\migrationRunner.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v2/migrations` | use | No | 447 |

### integration\moduleConnector.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v2/module-connector` | use | No | 430 |

### integration\systemIntegrationBus.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v2/integration-bus` | use | No | 517 |

### intelligence\care-plan-bootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/care-plans` | use | Yes | 39 |

### intelligence\realtime-event-broker.service.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/attendance/stream` | get | No | 199 |

### middleware\integrationContext.middleware.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v2/integration-context` | use | No | 252 |

### routes\_registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/account` | use | No | 361 |
| `/api/admin` | use | No | 356 |
| `/api/admin/adapter-audit` | use | No | 576 |
| `/api/admin/assessments` | use | No | 515 |
| `/api/admin/attendance` | use | No | 543 |
| `/api/admin/beneficiaries` | use | No | 511 |
| `/api/admin/bi` | use | No | 535 |
| `/api/admin/branch-compliance` | use | No | 575 |
| `/api/admin/capa` | use | No | 417 |
| `/api/admin/care-plans` | use | No | 520 |
| `/api/admin/claims-analytics` | use | No | 553 |
| `/api/admin/clinical-docs` | use | No | 538 |
| `/api/admin/goal-progress` | use | No | 548 |
| `/api/admin/gov-integrations` | use | No | 569 |
| `/api/admin/hr/compliance` | use | No | 541 |
| `/api/admin/hr/cpe` | use | No | 542 |
| `/api/admin/insurance-tariffs` | use | No | 571 |
| `/api/admin/invoices` | use | No | 536 |
| `/api/admin/nphies-claims` | use | No | 570 |
| `/api/admin/nps` | use | No | 546 |
| `/api/admin/onboarding` | use | No | 568 |
| `/api/admin/outcomes` | use | No | 545 |
| `/api/admin/pii-access-audit` | use | No | 573 |
| `/api/admin/referrals` | use | No | 551 |
| `/api/admin/retention` | use | No | 555 |
| `/api/admin/revenue` | use | No | 552 |
| `/api/admin/revenue-forecast` | use | No | 554 |
| `/api/admin/saudization` | use | No | 567 |
| `/api/admin/therapy-sessions` | use | No | 514 |
| `/api/admin/utilization` | use | No | 549 |
| `/api/admin/waitlist` | use | No | 550 |
| `/api/admin/zatca-credentials` | use | No | 572 |
| `/api/ai-analytics` | use | No | 364 |
| `/api/ai-diagnostic` | use | No | 780 |
| `/api/ai-predictions` | use | No | 363 |
| `/api/analytics` | use | No | 353 |
| `/api/appointments` | use | No | 507 |
| `/api/ar-vr` | use | Yes | 612 |
| `/api/assessment-engine` | use | Yes | 519 |
| `/api/assessments` | use | Yes | 663 |
| `/api/assets` | use | No | 494 |
| `/api/attendance-mgmt` | use | No | 544 |
| `/api/audit-scheduler` | use | No | 408 |
| `/api/auth` | use | Yes | 303 |
| `/api/auth/nafath` | use | No | 540 |
| `/api/behavior` | use | Yes | 614 |
| `/api/benchmarks` | use | No | 414 |
| `/api/beneficiary-portal` | use | No | 458 |
| `/api/bookings` | use | No | 508 |
| `/api/branches` | use | No | 457 |
| `/api/bus-tracking` | use | No | 782 |
| `/api/calibration` | use | No | 406 |
| `/api/care-plans` | use | Yes | 726 |
| `/api/care/360` | use | No | 452 |
| `/api/care/community` | use | No | 446 |
| `/api/care/crm` | use | No | 438 |
| `/api/care/home-visits` | use | No | 442 |
| `/api/care/independence` | use | No | 450 |
| `/api/care/psych` | use | No | 448 |
| `/api/care/retention` | use | No | 454 |
| `/api/care/social` | use | No | 440 |
| `/api/care/welfare` | use | No | 444 |
| `/api/careers` | use | No | 510 |
| `/api/cases` | use | No | 390 |
| `/api/ceo-dashboard` | use | No | 708 |
| `/api/change-control` | use | No | 407 |
| `/api/chat-v2` | use | No | 537 |
| `/api/civil-defense` | use | No | 468 |
| `/api/cms` | use | No | 385 |
| `/api/community` | use | No | 386 |
| `/api/community-integration` | use | No | 462 |
| `/api/compensation-benefits` | use | No | 710 |
| `/api/compliance-calendar` | use | No | 395 |
| `/api/controlled-documents` | use | No | 404 |
| `/api/coq` | use | No | 409 |
| `/api/core` | use | Yes | 589 |
| `/api/crm` | use | No | 712 |
| `/api/dashboard` | use | No | 329 |
| `/api/dashboards` | use | Yes | 618 |
| `/api/disability` | use | No | 517 |
| `/api/disability-rehab` | use | Yes | 815 |
| `/api/documents-pro` | use | No | 807 |
| `/api/documents-pro-ext` | use | No | 808 |
| `/api/documents-smart` | use | No | 805 |
| `/api/ecommerce` | use | No | 380 |
| `/api/employee-portal` | use | No | 797 |
| `/api/equipment` | use | No | 455 |
| `/api/evidence` | use | No | 394 |
| `/api/export-import` | use | No | 371 |
| `/api/exports` | use | No | 372 |
| `/api/family` | use | Yes | 601 |
| `/api/finance-operations` | use | No | 793 |
| `/api/fmea` | use | No | 399 |
| `/api/form-templates` | use | Yes | 720 |
| `/api/goals` | use | Yes | 616 |
| `/api/gosi` | use | No | 378 |
| `/api/government` | use | No | 379 |
| `/api/groups` | use | No | 582 |
| `/api/hr` | use | Yes | 639 |
| `/api/icf-assessments` | use | Yes | 685 |
| `/api/incidents` | use | No | 706 |
| `/api/inspection-submissions` | use | No | 413 |
| `/api/insurance` | use | No | 488 |
| `/api/integrated-care` | use | No | 368 |
| `/api/integrations` | use | No | 319 |
| `/api/internal-audit` | use | No | 391 |
| `/api/inventory` | use | No | 469 |
| `/api/knowledge` | use | No | 387 |
| `/api/knowledge-center` | use | No | 714 |
| `/api/licenses` | use | No | 389 |
| `/api/lms` | use | No | 351 |
| `/api/maintenance` | use | No | 495 |
| `/api/management-review` | use | No | 393 |
| `/api/measurements` | use | No | 478 |
| `/api/medical-files` | use | No | 497 |
| `/api/messages` | use | No | 313 |
| `/api/mfa` | use | No | 472 |
| `/api/mobile` | use | Yes | 482 |
| `/api/modules` | use | No | 310 |
| `/api/monitoring` | use | No | 362 |
| `/api/montessori` | use | No | 476 |
| `/api/montessori/auth` | use | No | 477 |
| `/api/newsletter` | use | No | 509 |
| `/api/notifications` | use | No | 312 |
| `/api/notify` | use | No | 577 |
| `/api/ocr-documents` | use | No | 795 |
| `/api/ops/dashboard` | use | No | 430 |
| `/api/ops/facilities` | use | No | 426 |
| `/api/ops/meeting-governance` | use | No | 432 |
| `/api/ops/notification-dispatch` | use | No | 436 |
| `/api/ops/purchase-requests` | use | No | 428 |
| `/api/ops/route-optimization` | use | No | 434 |
| `/api/ops/sla` | use | No | 422 |
| `/api/ops/work-orders` | use | No | 424 |
| `/api/org-branding` | use | No | 352 |
| `/api/organization` | use | No | 370 |
| `/api/parent-v2` | use | No | 525 |
| `/api/pareto-a3` | use | No | 402 |
| `/api/payroll` | use | No | 311 |
| `/api/pm` | use | No | 374 |
| `/api/predictions` | use | No | 456 |
| `/api/predictive-risk` | use | No | 410 |
| `/api/programs` | use | Yes | 593 |
| `/api/public/nps` | use | No | 547 |
| `/api/purchasing` | use | Yes | 718 |
| `/api/qiwa` | use | No | 377 |
| `/api/quality` | use | Yes | 392 |
| `/api/quality-controls` | use | No | 396 |
| `/api/quality-management` | use | No | 716 |
| `/api/quality-narrative` | use | No | 412 |
| `/api/quality/command-center` | use | No | 415 |
| `/api/quality/health-score` | use | No | 397 |
| `/api/quality/notifications` | use | No | 398 |
| `/api/quality/policies` | use | No | 420 |
| `/api/rbac` | use | No | 474 |
| `/api/rbac-admin` | use | No | 475 |
| `/api/rbac-advanced` | use | No | 388 |
| `/api/rca` | use | No | 400 |
| `/api/referrals` | use | Yes | 700 |
| `/api/rehab` | use | Yes | 702 |
| `/api/rehab-equipment` | use | No | 817 |
| `/api/rehab-measures` | use | Yes | 653 |
| `/api/rehab-templates` | use | Yes | 655 |
| `/api/reports` | use | No | 585 |
| `/api/research` | use | Yes | 626 |
| `/api/saudi-tax` | use | No | 801 |
| `/api/schedules` | use | No | 496 |
| `/api/search` | get | No | 333 |
| `/api/security` | use | No | 369 |
| `/api/security/domain` | use | Yes | 641 |
| `/api/smart-scheduler` | use | No | 506 |
| `/api/spc` | use | No | 401 |
| `/api/sso` | use | No | 473 |
| `/api/standards` | use | No | 403 |
| `/api/strategic-planning` | use | No | 790 |
| `/api/succession-planning` | use | Yes | 791 |
| `/api/supplier-quality` | use | No | 405 |
| `/api/supply-chain` | use | No | 470 |
| `/api/tasks` | use | Yes | 687 |
| `/api/tele-rehab` | use | Yes | 610 |
| `/api/telehealth-v2` | use | No | 539 |
| `/api/therapist-elite` | use | No | 788 |
| `/api/therapist-extended` | use | Yes | 683 |
| `/api/therapist-pro` | use | No | 786 |
| `/api/therapist-ultra` | use | No | 787 |
| `/api/therapist-workbench` | use | No | 527 |
| `/api/threads` | use | No | 314 |
| `/api/timeline` | use | Yes | 728 |
| `/api/traffic-accidents` | use | No | 471 |
| `/api/transport-routes` | use | No | 783 |
| `/api/trend-forecast` | use | No | 411 |
| `/api/user-management` | use | No | 357 |
| `/api/users` | use | No | 309 |
| `/api/v1/auth` | use | Yes | 304 |
| `/api/v1/hq-reports` | use | No | 534 |
| `/api/v1/portal` | use | No | 532 |
| `/api/v1/student` | use | No | 533 |
| `/api/validate` | use | No | 350 |
| `/api/waf-ratelimit` | use | No | 799 |
| `/api/workflow` | use | Yes | 591 |

### routes\audit-reviews.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/admin/audit` | use | No | 12 |

### routes\beneficiary-consents.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/beneficiaries` | use | Yes | 12 |

### routes\beneficiary-red-flags.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/beneficiaries` | use | Yes | 13 |

### routes\forms-submission.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/documents-pro/forms` | use | No | 10 |

### routes\hikvision.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/hikvision` | use | Yes | 1936 |
| `/api/v1/hikvision/webhooks` | use | No | 1935 |

### routes\hr\official-letters.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/hr` | use | Yes | 47 |

### routes\notifications-log.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/admin/notifications-log` | use | No | 7 |

### routes\parent-portal-v1.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/portal` | use | No | 13 |

### routes\parentPortal.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `io` | get | No | 776 |

### routes\public-forms.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/public/forms` | use | No | 13 |

### routes\red-flag-admin.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/admin/red-flags` | use | No | 10 |

### routes\registries\clinical-assessment.registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/early-intervention` | use | No | 30 |
| `/api/early-warning` | use | No | 120 |
| `/api/icf-assessments` | use | Yes | 37 |
| `/api/independent-living` | use | Yes | 54 |
| `/api/mdt-coordination` | use | No | 70 |
| `/api/measures-outcomes` | use | No | 86 |
| `/api/measures-workflow` | use | No | 77 |
| `/api/mhpss` | use | No | 61 |
| `/api/post-rehab-followup` | use | No | 44 |
| `/api/v1/early-warning` | use | No | 120 |

### routes\registries\clinical-therapy.registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/aac` | use | No | 100 |
| `/api/bip-tracking` | use | No | 116 |
| `/api/feedback` | use | No | 81 |
| `/api/gas` | use | No | 108 |
| `/api/goal-bank` | use | No | 74 |
| `/api/goal-progress` | use | No | 75 |
| `/api/therapist` | use | No | 41 |
| `/api/therapist-elite` | use | No | 51 |
| `/api/therapist-extended` | use | No | 48 |
| `/api/therapist-pro` | use | No | 49 |
| `/api/therapist-ultra` | use | No | 50 |
| `/api/therapy-rooms` | use | No | 82 |
| `/api/v1/aac` | use | No | 100 |
| `/api/v1/bip-tracking` | use | No | 116 |
| `/api/v1/feedback` | use | No | 81 |
| `/api/v1/gas` | use | No | 108 |
| `/api/v1/goal-bank` | use | No | 74 |
| `/api/v1/goal-progress` | use | No | 75 |
| `/api/v1/therapy-rooms` | use | No | 82 |

### routes\registries\communication.registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/admin-comm-enhanced` | use | No | 101 |
| `/api/admin-communications` | use | No | 100 |
| `/api/ai-communications` | use | No | 46 |
| `/api/communication-module` | use | No | 113 |
| `/api/communications` | use | No | 45 |
| `/api/electronic-directives` | use | No | 102 |
| `/api/email` | use | No | 53 |
| `/api/notifications-module` | use | No | 121 |
| `/api/v2/email` | use | No | 52 |
| `/api/whatsapp` | use | No | 65 |
| `/api/whatsapp-automation` | use | No | 91 |
| `/api/whatsapp-enhanced` | use | No | 71 |
| `/api/whatsapp-insights` | use | No | 81 |
| `/api/whatsapp-reminders` | use | No | 86 |

### routes\registries\documents.registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/archive` | use | No | 73 |
| `/api/document-center` | use | No | 137 |
| `/api/documents` | use | No | 50 |
| `/api/documents-advanced` | use | No | 57 |
| `/api/documents-enhanced` | use | No | 103 |
| `/api/documents-pro` | use | No | 104 |
| `/api/documents-pro-ext` | use | No | 105 |
| `/api/documents-pro-v3` | use | No | 106 |
| `/api/documents-pro-v4` | use | No | 107 |
| `/api/documents-pro-v5` | use | No | 108 |
| `/api/documents-pro-v6` | use | No | 109 |
| `/api/documents-pro-v7` | use | No | 110 |
| `/api/documents-pro-v8` | use | No | 111 |
| `/api/documents-pro-v9` | use | No | 112 |
| `/api/documents-smart` | use | No | 51 |
| `/api/files-module` | use | No | 97 |
| `/api/form-templates` | use | No | 85 |
| `/api/media` | use | No | 91 |
| `/api/ocr-documents` | use | No | 130 |
| `/api/v1/ocr-documents` | use | No | 130 |

### routes\registries\education.registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/academic-years` | use | No | 30 |
| `/api/classrooms` | use | No | 33 |
| `/api/curriculum` | use | No | 34 |
| `/api/exams` | use | No | 36 |
| `/api/gradebook` | use | No | 37 |
| `/api/subjects` | use | No | 31 |
| `/api/teachers` | use | No | 32 |
| `/api/timetable` | use | No | 35 |

### routes\registries\features.registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/access-control` | use | Yes | 632 |
| `/api/adaptive-sports` | use | Yes | 207 |
| `/api/adjunct-therapy` | use | Yes | 287 |
| `/api/approvals` | use | Yes | 593 |
| `/api/arts-therapy` | use | Yes | 275 |
| `/api/assistive-device` | use | Yes | 198 |
| `/api/audit-trail` | use | No | 406 |
| `/api/audit-trail-enhanced` | use | No | 405 |
| `/api/beneficiary-day-attendance` | use | Yes | 168 |
| `/api/beneficiary-journey` | use | Yes | 203 |
| `/api/beneficiary-meals` | use | Yes | 178 |
| `/api/beneficiary-sections` | use | Yes | 170 |
| `/api/beneficiary-transfers` | use | No | 166 |
| `/api/biomedical-waste` | use | Yes | 249 |
| `/api/branches-enhanced` | use | No | 380 |
| `/api/caregiver-support` | use | Yes | 255 |
| `/api/cbahi` | use | Yes | 200 |
| `/api/cdss` | use | No | 449 |
| `/api/center-ops` | use | Yes | 205 |
| `/api/central-settings` | use | No | 412 |
| `/api/clinical` | use | No | 134 |
| `/api/clinical-crisis` | use | Yes | 194 |
| `/api/clinical-pathway` | use | Yes | 144 |
| `/api/clinical-safety-summary` | use | Yes | 241 |
| `/api/communication-aid` | use | Yes | 196 |
| `/api/communication/notifications` | use | No | 379 |
| `/api/complaints-enhanced` | use | No | 439 |
| `/api/crm-enhanced` | use | No | 433 |
| `/api/daily-communication` | use | Yes | 172 |
| `/api/day-rehab-bus-routes` | use | Yes | 180 |
| `/api/decision-rights` | use | Yes | 324 |
| `/api/diet-prescription` | use | Yes | 211 |
| `/api/digital-assessment` | use | Yes | 300 |
| `/api/disability-cards` | use | Yes | 348 |
| `/api/driving-rehab` | use | Yes | 238 |
| `/api/dtt-session` | use | Yes | 279 |
| `/api/dysphagia-assessment` | use | Yes | 213 |
| `/api/elearning-enhanced` | use | No | 455 |
| `/api/email-templates` | use | Yes | 165 |
| `/api/equity` | use | No | 372 |
| `/api/facility-asset` | use | Yes | 253 |
| `/api/falls-risk-assessment` | use | Yes | 226 |
| `/api/family-home-program` | use | Yes | 142 |
| `/api/family-visits` | use | Yes | 344 |
| `/api/field-trips` | use | Yes | 346 |
| `/api/files` | use | Yes | 352 |
| `/api/guardians` | use | No | 140 |
| `/api/hearing-screening` | use | Yes | 223 |
| `/api/iep-plan` | use | Yes | 342 |
| `/api/infection-surveillance` | use | Yes | 247 |
| `/api/instrumental-swallow` | use | Yes | 271 |
| `/api/inventory` | use | No | 383 |
| `/api/inventory-enhanced` | use | No | 381 |
| `/api/inventory-module` | use | No | 370 |
| `/api/kpi-dashboard` | use | No | 495 |
| `/api/kpi-reports` | use | No | 501 |
| `/api/launch-readiness` | use | Yes | 161 |
| `/api/mar` | use | Yes | 184 |
| `/api/measure-recommendations` | use | Yes | 305 |
| `/api/measures` | use | Yes | 310 |
| `/api/measures-library` | use | No | 550 |
| `/api/medication-reconciliation` | use | Yes | 244 |
| `/api/ministry-report` | use | Yes | 182 |
| `/api/morning-health-check` | use | Yes | 174 |
| `/api/next-best-action` | use | Yes | 154 |
| `/api/orientation-mobility` | use | Yes | 235 |
| `/api/outcomes-rollup` | use | Yes | 158 |
| `/api/pain-assessment` | use | Yes | 215 |
| `/api/pathway-bundles` | use | Yes | 149 |
| `/api/physiotherapy-assessment` | use | Yes | 217 |
| `/api/pickup-authorization` | use | Yes | 336 |
| `/api/portfolio` | use | Yes | 338 |
| `/api/pressure-injury` | use | Yes | 229 |
| `/api/prosthetic-orthotic` | use | Yes | 259 |
| `/api/purchasing` | use | Yes | 575 |
| `/api/quality-enhanced` | use | No | 384 |
| `/api/quality-module` | use | No | 371 |
| `/api/referrals` | use | No | 424 |
| `/api/rehab-licenses` | use | Yes | 581 |
| `/api/report-center` | use | No | 565 |
| `/api/reports-analytics` | use | No | 390 |
| `/api/respite` | use | Yes | 209 |
| `/api/restraint-seclusion` | use | Yes | 186 |
| `/api/review-cadence` | use | Yes | 204 |
| `/api/safeguarding` | use | Yes | 190 |
| `/api/scheduling-module` | use | No | 359 |
| `/api/seat-allocation` | use | Yes | 263 |
| `/api/seating-postural-assessment` | use | Yes | 219 |
| `/api/seizure-log` | use | Yes | 188 |
| `/api/self-advocacy` | use | Yes | 334 |
| `/api/sensory-diet` | use | Yes | 283 |
| `/api/setup` | use | No | 571 |
| `/api/sleep-assessment` | use | Yes | 232 |
| `/api/smart-kpi` | use | No | 489 |
| `/api/spasticity-injection` | use | Yes | 294 |
| `/api/sponsorship` | use | Yes | 267 |
| `/api/staff-health` | use | Yes | 251 |
| `/api/stories` | use | No | 373 |
| `/api/subsidies` | use | Yes | 350 |
| `/api/telehealth` | use | No | 418 |
| `/api/therapy-activity` | use | Yes | 290 |
| `/api/ticketing-system` | use | No | 396 |
| `/api/toileting` | use | Yes | 176 |
| `/api/track` | use | No | 363 |
| `/api/transition-plan` | use | Yes | 202 |
| `/api/transport-module` | use | No | 358 |
| `/api/v1/kpi-dashboard` | use | No | 495 |
| `/api/v1/kpi-reports` | use | No | 501 |
| `/api/v1/smart-kpi` | use | No | 489 |
| `/api/v1/track` | use | No | 362 |
| `/api/vision-screening` | use | Yes | 221 |
| `/api/voice-log` | use | Yes | 316 |

### routes\registries\finance.registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/digital-wallet` | use | No | 84 |
| `/api/e-invoicing` | use | No | 46 |
| `/api/finance` | use | No | 35 |
| `/api/finance-module` | use | No | 61 |
| `/api/finance-operations` | use | No | 57 |
| `/api/payment-gateway` | use | No | 83 |
| `/api/payments` | use | No | 40 |
| `/api/saudi-tax` | use | No | 56 |
| `/api/smart-insurance` | use | No | 85 |
| `/api/v1/digital-wallet` | use | No | 84 |
| `/api/v1/e-invoicing` | use | No | 46 |
| `/api/v1/payment-gateway` | use | No | 83 |
| `/api/v1/smart-insurance` | use | No | 85 |

### routes\registries\fleet.registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/cargo` | use | No | 78 |
| `/api/dispatch` | use | No | 64 |
| `/api/driver-leaves` | use | No | 83 |
| `/api/driver-shifts` | use | No | 73 |
| `/api/driver-training` | use | No | 70 |
| `/api/drivers` | use | No | 58 |
| `/api/fleet-accidents` | use | No | 86 |
| `/api/fleet-alerts` | use | No | 82 |
| `/api/fleet-communications` | use | No | 89 |
| `/api/fleet-compliance` | use | No | 74 |
| `/api/fleet-costs` | use | No | 65 |
| `/api/fleet-disposals` | use | No | 91 |
| `/api/fleet-documents` | use | No | 76 |
| `/api/fleet-fuel` | use | No | 84 |
| `/api/fleet-fuel-cards` | use | No | 68 |
| `/api/fleet-inspections` | use | No | 69 |
| `/api/fleet-kpi` | use | No | 72 |
| `/api/fleet-parking` | use | No | 81 |
| `/api/fleet-parts` | use | No | 77 |
| `/api/fleet-penalties` | use | No | 90 |
| `/api/fleet-reservations` | use | No | 79 |
| `/api/fleet-route-plans` | use | No | 88 |
| `/api/fleet-safety` | use | No | 67 |
| `/api/fleet-tires` | use | No | 66 |
| `/api/fleet-tolls` | use | No | 85 |
| `/api/fleet-warranties` | use | No | 87 |
| `/api/geofences` | use | No | 63 |
| `/api/gps` | use | No | 61 |
| `/api/traffic-fines` | use | No | 75 |
| `/api/transport-routes` | use | No | 62 |
| `/api/trips` | use | No | 60 |
| `/api/vehicle-assignments` | use | No | 80 |
| `/api/vehicle-insurance` | use | No | 71 |
| `/api/vehicles` | use | No | 59 |

### routes\registries\government.registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/audit-logs` | use | Yes | 101 |
| `/api/disability-authority` | use | No | 59 |
| `/api/family-satisfaction` | use | No | 69 |
| `/api/gosi-full` | use | No | 86 |
| `/api/mudad` | use | No | 55 |
| `/api/muqeem` | use | No | 76 |
| `/api/muqeem-full` | use | No | 81 |
| `/api/nitaqat` | use | No | 108 |
| `/api/noor` | use | No | 72 |
| `/api/nphies` | use | No | 96 |
| `/api/pdpl` | use | No | 113 |
| `/api/taqat` | use | No | 56 |
| `/api/treatment-authorization` | use | No | 64 |
| `/api/zatca-phase2` | use | No | 91 |

### routes\registries\hr.registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/attendance` | use | No | 64 |
| `/api/compensation` | use | No | 52 |
| `/api/compensation-benefits` | use | No | 53 |
| `/api/employee-affairs` | use | No | 89 |
| `/api/employee-affairs-expanded` | use | No | 90 |
| `/api/employee-affairs-phase2` | use | No | 91 |
| `/api/employee-affairs-phase3` | use | No | 92 |
| `/api/gratuity` | use | No | 54 |
| `/api/hr` | use | No | 162 |
| `/api/hr-advanced` | use | No | 50 |
| `/api/hr-attendance` | use | No | 63 |
| `/api/hr-insurance` | use | No | 77 |
| `/api/hr-module` | use | No | 100 |
| `/api/hr-smart` | use | No | 83 |
| `/api/hr-system` | use | No | 49 |
| `/api/hr-unified` | use | No | 51 |
| `/api/hr/diversity` | use | No | 201 |
| `/api/hr/headcount-planning` | use | No | 254 |
| `/api/hr/official-letters` | use | No | 235 |
| `/api/hr/pay-equity` | use | No | 179 |
| `/api/hr/skills-gap` | use | No | 223 |
| `/api/hr/succession-readiness` | use | No | 265 |
| `/api/hr/talent-grid` | use | No | 190 |
| `/api/hr/workforce-intelligence` | use | No | 212 |
| `/api/leave-management` | use | No | 138 |
| `/api/leave-requests` | use | No | 139 |
| `/api/public/letter-verify/:token` | get | No | 240 |
| `/api/smart-attendance` | use | No | 65 |
| `/api/succession-planning` | use | No | 55 |
| `/api/v1/hr` | use | No | 163 |
| `/api/v1/hr/diversity` | use | No | 202 |
| `/api/v1/hr/headcount-planning` | use | No | 255 |
| `/api/v1/hr/official-letters` | use | No | 236 |
| `/api/v1/hr/pay-equity` | use | No | 180 |
| `/api/v1/hr/skills-gap` | use | No | 224 |
| `/api/v1/hr/succession-readiness` | use | No | 266 |
| `/api/v1/hr/talent-grid` | use | No | 191 |
| `/api/v1/hr/workforce-intelligence` | use | No | 213 |
| `/api/v1/leave-management` | use | No | 138 |
| `/api/v1/leave-requests` | use | No | 139 |
| `/api/v1/public/letter-verify/:token` | get | No | 241 |
| `/api/v1/work-shifts` | use | No | 145 |
| `/api/work-shifts` | use | No | 145 |
| `/api/zkteco` | use | No | 66 |

### routes\registries\phases.registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/activities` | use | No | 481 |
| `/api/admin-ops-dlq` | use | No | 642 |
| `/api/advanced-settings` | use | No | 671 |
| `/api/ai-diagnostic` | use | No | 379 |
| `/api/api-keys` | use | No | 349 |
| `/api/audit-reviews` | use | No | 542 |
| `/api/basic-analytics` | use | No | 54 |
| `/api/basic-reports` | use | No | 55 |
| `/api/bi` | use | No | 198 |
| `/api/bi-dashboard` | use | No | 220 |
| `/api/blockchain` | use | No | 214 |
| `/api/branch-management` | use | No | 677 |
| `/api/build-info` | use | No | 636 |
| `/api/bus-tracking` | use | No | 359 |
| `/api/campaigns` | use | No | 252 |
| `/api/ceo-dashboard` | use | No | 383 |
| `/api/chat` | use | No | 375 |
| `/api/complaints` | use | No | 179 |
| `/api/compliance` | use | No | 197 |
| `/api/contracts` | use | No | 61 |
| `/api/crisis` | use | No | 204 |
| `/api/dashboard` | use | No | 305 |
| `/api/database` | use | No | 322 |
| `/api/donations` | use | No | 254 |
| `/api/donors` | use | No | 253 |
| `/api/e-signature` | use | No | 72 |
| `/api/e-stamp` | use | No | 78 |
| `/api/emr` | use | No | 440 |
| `/api/facilities` | use | No | 180 |
| `/api/fcm` | use | No | 273 |
| `/api/forms-catalog` | use | No | 545 |
| `/api/gamification` | use | No | 347 |
| `/api/health` | use | No | 58 |
| `/api/helpdesk` | use | No | 247 |
| `/api/hse` | use | No | 248 |
| `/api/import-export-pro` | use | No | 118 |
| `/api/incidents` | use | No | 271 |
| `/api/kitchen` | use | No | 193 |
| `/api/laundry` | use | No | 194 |
| `/api/legal-affairs` | use | No | 225 |
| `/api/library` | use | No | 371 |
| `/api/meetings` | use | No | 181 |
| `/api/ml` | use | No | 289 |
| `/api/moi-passport` | use | No | 328 |
| `/api/otp-auth` | use | No | 268 |
| `/api/performance` | use | No | 329 |
| `/api/pharmacy` | use | No | 419 |
| `/api/phase37` | use | No | 687 |
| `/api/policies` | use | No | 272 |
| `/api/public-forms` | use | No | 551 |
| `/api/push` | use | No | 625 |
| `/api/recruitment` | use | No | 205 |
| `/api/reports-inbox` | use | No | 578 |
| `/api/reports-ops` | use | No | 579 |
| `/api/smart-inbox` | use | No | 556 |
| `/api/strategic-planning` | use | No | 178 |
| `/api/subscriptions` | use | No | 348 |
| `/api/system-settings` | use | Yes | 669 |
| `/api/telehealth` | use | No | 355 |
| `/api/tenants` | use | No | 274 |
| `/api/training` | use | No | 226 |
| `/api/uploads` | use | No | 628 |
| `/api/v1/activities` | use | No | 481 |
| `/api/v1/admin-ops-dlq` | use | No | 642 |
| `/api/v1/ai-diagnostic` | use | No | 379 |
| `/api/v1/api-keys` | use | No | 349 |
| `/api/v1/audit-reviews` | use | No | 542 |
| `/api/v1/bi` | use | No | 198 |
| `/api/v1/bi-dashboard` | use | No | 220 |
| `/api/v1/blockchain` | use | No | 214 |
| `/api/v1/build-info` | use | No | 636 |
| `/api/v1/bus-tracking` | use | No | 359 |
| `/api/v1/campaigns` | use | No | 252 |
| `/api/v1/ceo-dashboard` | use | No | 383 |
| `/api/v1/chat` | use | No | 375 |
| `/api/v1/compliance` | use | No | 197 |
| `/api/v1/contracts` | use | No | 61 |
| `/api/v1/crisis` | use | No | 204 |
| `/api/v1/dashboard` | use | No | 305 |
| `/api/v1/database` | use | No | 322 |
| `/api/v1/donations` | use | No | 254 |
| `/api/v1/donors` | use | No | 253 |
| `/api/v1/e-signature` | use | No | 72 |
| `/api/v1/e-stamp` | use | No | 78 |
| `/api/v1/emr` | use | No | 440 |
| `/api/v1/fcm` | use | No | 273 |
| `/api/v1/forms-catalog` | use | No | 545 |
| `/api/v1/gamification` | use | No | 347 |
| `/api/v1/health` | use | No | 58 |
| `/api/v1/helpdesk` | use | No | 247 |
| `/api/v1/hse` | use | No | 248 |
| `/api/v1/incidents` | use | No | 271 |
| `/api/v1/kitchen` | use | No | 193 |
| `/api/v1/laundry` | use | No | 194 |
| `/api/v1/legal-affairs` | use | No | 225 |
| `/api/v1/library` | use | No | 371 |
| `/api/v1/meetings` | use | No | 181 |
| `/api/v1/ml` | use | No | 289 |
| `/api/v1/moi-passport` | use | No | 328 |
| `/api/v1/otp-auth` | use | No | 268 |
| `/api/v1/performance` | use | No | 329 |
| `/api/v1/pharmacy` | use | No | 419 |
| `/api/v1/phase37` | use | No | 687 |
| `/api/v1/policies` | use | No | 272 |
| `/api/v1/public-forms` | use | No | 551 |
| `/api/v1/push` | use | No | 625 |
| `/api/v1/recruitment` | use | No | 205 |
| `/api/v1/reports-inbox` | use | No | 578 |
| `/api/v1/reports-ops` | use | No | 579 |
| `/api/v1/smart-inbox` | use | No | 556 |
| `/api/v1/subscriptions` | use | No | 348 |
| `/api/v1/tenants` | use | No | 274 |
| `/api/v1/training` | use | No | 226 |
| `/api/v1/uploads` | use | No | 628 |
| `/api/v1/vendors` | use | No | 258 |
| `/api/v1/visitor-auth` | use | No | 645 |
| `/api/v1/visitors` | use | No | 182 |
| `/api/v1/volunteers` | use | No | 195 |
| `/api/v1/waitlist` | use | No | 196 |
| `/api/v1/warehouse` | use | No | 224 |
| `/api/v1/wasel-address` | use | No | 602 |
| `/api/v1/workflow-pro` | use | No | 98 |
| `/api/vendors` | use | No | 258 |
| `/api/visitor-auth` | use | No | 645 |
| `/api/visitors` | use | No | 182 |
| `/api/volunteers` | use | No | 195 |
| `/api/waitlist` | use | No | 196 |
| `/api/warehouse` | use | No | 224 |
| `/api/wasel-address` | use | No | 602 |
| `/api/webhooks` | use | No | 53 |
| `/api/workflow-pro` | use | No | 98 |

### routes\registries\student-parent.registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/guardian` | use | No | 71 |
| `/api/parent-portal` | use | No | 77 |
| `/api/parent-portal-enhanced` | use | No | 85 |
| `/api/parents` | use | No | 70 |
| `/api/student-certificates` | use | No | 60 |
| `/api/student-complaints` | use | No | 59 |
| `/api/student-elearning` | use | No | 64 |
| `/api/student-events` | use | No | 63 |
| `/api/student-health` | use | No | 61 |
| `/api/student-management` | use | No | 51 |
| `/api/student-reports` | use | No | 50 |
| `/api/student-rewards` | use | No | 62 |
| `/api/students` | use | No | 49 |
| `/api/v1/parent-portal` | use | No | 77 |

### routes\rehab-disciplines.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/rehab/disciplines` | use | No | 12 |

### routes\student-portal.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/student` | use | No | 11 |

### routes\therapist-portal.routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/therapist` | use | No | 11 |

### scripts\audit-unauthenticated-routes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/..` | use | Yes | 103 |
| `/api/x` | use | Yes | 8 |
| `/path` | use | Yes | 112 |

### startup\adminEndpoints.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/_diag` | get | No | 102 |
| `/api/_init` | post | No | 26 |

### startup\aiRecommendationBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/ai-recommendations` | use | No | 37 |
| `/api/v1/ai-recommendations` | use | No | 38 |

### startup\capaBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/quality/branch-heatmap` | use | No | 127 |
| `/api/quality/capa` | use | No | 103 |
| `/api/quality/capa-producers` | use | No | 115 |
| `/api/quality/executive-1-page` | use | No | 156 |
| `/api/quality/therapist-workload` | use | No | 142 |
| `/api/v1/quality/branch-heatmap` | use | No | 128 |
| `/api/v1/quality/capa` | use | No | 104 |
| `/api/v1/quality/capa-producers` | use | No | 116 |
| `/api/v1/quality/executive-1-page` | use | No | 157 |
| `/api/v1/quality/therapist-workload` | use | No | 143 |

### startup\carePlanningBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/care-plans` | use | No | 9 |

### startup\disabilityAuthorityBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/disability-authority/adapter` | use | Yes | 42 |
| `/api/v1/disability-authority/adapter` | use | Yes | 43 |

### startup\dpiaBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/dpia` | use | No | 35 |
| `/api/v1/dpia` | use | No | 36 |

### startup\healthProbes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/` | get | No | 117 |
| `/api/build-info` | use | No | 149 |
| `/api/health/integrations` | use | No | 130 |
| `/api/health/metrics/integrations` | use | No | 139 |
| `/api/info` | get | No | 99 |
| `/health` | get | No | 35 |
| `/readiness` | get | No | 70 |

### startup\integrationHardeningBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/admin/ops` | use | No | 77 |

### startup\mfaChallengeBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/mfa` | use | Yes | 84 |

### startup\middleware.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api` | use | No | 254 |
| `/api/test` | get | No | 70 |
| `/api/upload` | use | No | 144 |
| `/service-worker.js` | get | No | 77 |
| `/test-first` | get | No | 63 |

### startup\ragBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/rag` | use | No | 43 |
| `/api/v1/rag` | use | No | 44 |

### startup\realtimeGatewayBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/realtime` | use | No | 182 |
| `/api/v1/realtime` | use | No | 183 |

### startup\redFlagBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/admin/red-flags` | use | No | 27 |
| `/api/v1/beneficiaries` | use | No | 25 |

### startup\riskSweeperBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/risk-sweep` | use | No | 220 |
| `/api/v1/risk-sweep` | use | No | 221 |

### startup\sehhatyBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/sehhaty` | use | No | 49 |
| `/api/v1/sehhaty` | use | No | 50 |

### startup\speechBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/speech` | use | No | 44 |
| `/api/v1/speech` | use | No | 45 |

### swagger.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api-docs.json` | get | No | 545 |

### utils\performance-optimizer.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/cache-stats` | get | No | 336 |
| `/api/cache/clear` | post | No | 345 |


## Additional Mounts (from Startup & Infrastructure Files)


### routes/registries/ops.registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/ops/work-orders` | use | No | 15 |
| `/api/v1/ops/work-orders` | use | No | 15 |
| `/api/ops/facilities` | use | No | 16 |
| `/api/v1/ops/facilities` | use | No | 16 |
| `/api/ops/sla` | use | No | 17 |
| `/api/v1/ops/sla` | use | No | 17 |
| `/api/ops/dashboard` | use | No | 18 |
| `/api/v1/ops/dashboard` | use | No | 18 |
| `/api/ops/purchase-requests` | use | No | 19 |
| `/api/v1/ops/purchase-requests` | use | No | 19 |
| `/api/ops/meeting-governance` | use | No | 20 |
| `/api/v1/ops/meeting-governance` | use | No | 20 |
| `/api/ops/route-optimization` | use | No | 21 |
| `/api/v1/ops/route-optimization` | use | No | 21 |
| `/api/ops/notification-dispatch` | use | No | 22 |
| `/api/v1/ops/notification-dispatch` | use | No | 22 |
| `/api/ops/maintenance-hub` | use | No | 23 |
| `/api/v1/ops/maintenance-hub` | use | No | 23 |

### routes/registries/cctv.registry.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/cctv/cameras` | use | No | 108 |
| `/api/v1/cctv/cameras` | use | No | 108 |
| `/api/cctv/nvrs` | use | No | 109 |
| `/api/v1/cctv/nvrs` | use | No | 109 |
| `/api/cctv/events` | use | No | 110 |
| `/api/v1/cctv/events` | use | No | 110 |
| `/api/cctv/alerts` | use | No | 111 |
| `/api/v1/cctv/alerts` | use | No | 111 |
| `/api/cctv/streams` | use | No | 112 |
| `/api/v1/cctv/streams` | use | No | 112 |
| `/api/cctv/recordings` | use | No | 113 |
| `/api/v1/cctv/recordings` | use | No | 113 |
| `/api/cctv/webhooks` | use | No | 114 |
| `/api/v1/cctv/webhooks` | use | No | 114 |
| `/api/cctv/ai` | use | No | 115 |
| `/api/v1/cctv/ai` | use | No | 115 |
| `/api/cctv/audit` | use | No | 116 |
| `/api/v1/cctv/audit` | use | No | 116 |
| `/api/cctv/parent-portal` | use | No | 117 |
| `/api/v1/cctv/parent-portal` | use | No | 117 |
| `/api/cctv/admin` | use | No | 118 |
| `/api/v1/cctv/admin` | use | No | 118 |
| `/api/cctv/reports` | use | No | 119 |
| `/api/v1/cctv/reports` | use | No | 119 |

### startup/aiRecommendationBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/ai-recommendations` | use | No | 37 |
| `/api/v1/ai-recommendations` | use | No | 38 |

### startup/beneficiaryLifecycleBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/beneficiary-lifecycle` | use | Yes | 230 |

### startup/capaBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/quality/capa` | use | No | 103 |
| `/api/v1/quality/capa` | use | No | 104 |
| `/api/quality/capa-producers` | use | No | 115 |
| `/api/v1/quality/capa-producers` | use | No | 116 |
| `/api/quality/branch-heatmap` | use | No | 127 |
| `/api/v1/quality/branch-heatmap` | use | No | 128 |
| `/api/quality/therapist-workload` | use | No | 142 |
| `/api/v1/quality/therapist-workload` | use | No | 143 |
| `/api/quality/executive-1-page` | use | No | 156 |
| `/api/v1/quality/executive-1-page` | use | No | 157 |

### startup/carePlanningBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/care-plans` | use | Yes | 149 |

### startup/disabilityAuthorityBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/disability-authority/adapter` | use | No | 42 |
| `/api/v1/disability-authority/adapter` | use | No | 43 |

### startup/dpiaBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/dpia` | use | No | 35 |
| `/api/v1/dpia` | use | No | 36 |

### startup/healthProbes.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/health` | get | No | 35 |
| `/readiness` | get | No | 70 |
| `/api/info` | get | No | 99 |
| `/` | get | No | 117 |
| `/api/health/integrations` | use | No | 130 |
| `/api/health/metrics/integrations` | use | No | 139 |
| `/api/build-info` | use | No | 149 |

### startup/hikvisionBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/hikvision` | use | Yes | 820 |
| `/api/v1/hikvision/webhooks` | use | No | 826 |

### startup/integrationHardeningBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/admin/ops` | use | No | 77 |

### startup/mfaChallengeBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/mfa` | use | Yes | 84 |

### startup/parentChatbotBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/parent/chatbot` | use | No | 181 |
| `/api/v1/ai/llm-telemetry` | use | No | 201 |
| `/api/v1/ai/llm-anomalies` | use | No | 282 |

### startup/ragBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/rag` | use | No | 43 |
| `/api/v1/rag` | use | No | 44 |

### startup/realtimeGatewayBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/realtime` | use | No | 182 |
| `/api/v1/realtime` | use | No | 183 |

### startup/riskSweeperBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/risk-sweep` | use | No | 220 |
| `/api/v1/risk-sweep` | use | No | 221 |

### startup/sehhatyBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/sehhaty` | use | No | 49 |
| `/api/v1/sehhaty` | use | No | 50 |

### startup/speechBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/speech` | use | No | 44 |
| `/api/v1/speech` | use | No | 45 |

### startup/accessReviewBootstrap.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/access-review` | use | Yes | 114 |

### startup/middleware.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/test-first` | get | No | 63 |
| `/api/test` | get | No | 70 |
| `/service-worker.js` | get | No | 77 |
| `/api/cache-stats` | get | No | 336 |
| `/api/cache/clear` | post | No | 345 |

### startup/adminEndpoints.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/_init` | post | No | 26 |
| `/api/_diag` | get | No | 102 |

### domains/_base/BaseDomainModule.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/{basePath}` | use | Yes | 111 |
| `/api/v1/{basePath}` | use | Yes | 112 |
| `/api/v2/{basePath}` | use | Yes | 113 |

### domains/episodes/index.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/episodes` | use | Yes | 272 |
| `/api/v1/episodes` | use | Yes | 273 |
| `/api/v2/episodes` | use | Yes | 274 |

### domains/sessions/index.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v1/sessions/admin` | use | Yes | 241 |
| `/api/sessions/admin` | use | Yes | 243 |
| `/api/v2/sessions/admin` | use | Yes | 245 |
| `/api/admin/therapy-sessions` | use | Yes | 249 |
| `/api/v1/sessions/therapist` | use | Yes | 254 |
| `/api/sessions/therapist` | use | Yes | 256 |
| `/api/v2/sessions/therapist` | use | Yes | 258 |
| `/api/sessions` | use | Yes | 262 |
| `/api/v1/sessions` | use | Yes | 263 |
| `/api/v2/sessions` | use | Yes | 264 |
| `/api/sessions` | use | Yes | 267 |
| `/api/v1/sessions` | use | Yes | 268 |
| `/api/v2/sessions` | use | Yes | 269 |

### middleware/apiVersion.middleware.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api{prefix}` | use | No | 102 |
| `/api/{version}{prefix}` | use | No | 104 |

### integration/systemIntegrationBus.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v2/integration-bus` | use | No | 517 |

### integration/moduleConnector.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v2/module-connector` | use | No | 430 |

### middleware/integrationContext.middleware.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/v2/integration-context` | use | No | 252 |

### utils/performance-optimizer.js

| Route Path | Method | Auth | Line |
|------------|--------|------|------|
| `/api/cache-stats` | get | No | 336 |
| `/api/cache/clear` | post | No | 345 |

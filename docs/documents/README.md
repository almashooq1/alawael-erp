# Document Hub — نظام إدارة المستندات الموحد

## نظرة عامة

Document Hub هو النظام المركزي لإدارة المستندات في Al-Awael ERP. يوحد الأنظمة السابقة المتعددة:

- `Document` (النظام الأساسي)
- `FileRecord` / `FileFolder` (prompt_08)
- `UploadedFile` (Wave 207b)
- `medicalFiles` في `CaseManagement`
- `clinical-docs.routes.js`

## البنية

```
frontend/src/pages/documents/DocumentHub.jsx
           │
           ▼
/api/v1/documents  (backend/routes/documents.routes.js)
           │
           ▼
Document Core Services
  ├─ documentUpload.service.js
  ├─ documentLink.service.js
  ├─ documentSharing.service.js
  ├─ documentVersioning.service.js
  └─ documentEventPublisher.service.js
           │
           ▼
Storage Abstraction Layer
  ├─ services/storage/local.provider.js
  └─ services/storage/s3.provider.js
           │
           ▼
System Integration Bus
  ├─ documents.document.uploaded
  ├─ documents.document.linked
  ├─ documents.document.deleted
  └─ documents.document.expiring
```

## API Endpoints

### Core CRUD

| Method | Path                             | Description     |
| ------ | -------------------------------- | --------------- |
| POST   | `/api/v1/documents/upload`       | رفع مستند جديد  |
| GET    | `/api/v1/documents`              | قائمة المستندات |
| GET    | `/api/v1/documents/:id`          | تفاصيل مستند    |
| GET    | `/api/v1/documents/:id/download` | تنزيل           |
| GET    | `/api/v1/documents/:id/preview`  | معاينة          |
| PUT    | `/api/v1/documents/:id`          | تحديث           |
| DELETE | `/api/v1/documents/:id`          | حذف ناعم        |

### Entity Linking

| Method | Path                                 | Description  |
| ------ | ------------------------------------ | ------------ |
| POST   | `/api/v1/documents/:id/link`         | ربط بكيان    |
| POST   | `/api/v1/documents/:id/unlink`       | فك ربط       |
| GET    | `/api/v1/documents/entity/:type/:id` | مستندات كيان |

### Compatibility

| Method | Path                         | Description             |
| ------ | ---------------------------- | ----------------------- |
| POST   | `/api/v1/files`              | رفع عبر الواجهة القديمة |
| GET    | `/api/v1/files/:id/download` | تنزيل UploadedFile      |
| POST   | `/api/medical-files/single`  | رفع ملف طبي             |
| POST   | `/api/admin/clinical-docs`   | رفع مستند سريري         |

## ربط نظام جديد

لربط نظام جديد بـ Document Hub:

1. عند رفع ملف من النظام، استخدم `documentUploadService.createDocumentRecord(file, user, metadata)`.
2. اربط المستند بالكيان عبر `documentLinkService.linkDocumentToEntity(documentId, entityType, entityId, { sourceModule })`.
3. احفظ `documentId` في نموذج النظام إن أمكن.
4. استمع إلى أحداث `documents.document.*` عبر Integration Bus للتحديثات.

## المتغيرات البيئية

| Variable           | Default           | Description            |
| ------------------ | ----------------- | ---------------------- |
| `STORAGE_PROVIDER` | `local`           | `local` أو `s3`        |
| `UPLOADS_ROOT`     | `backend/uploads` | مسار التخزين المحلي    |
| `AWS_S3_BUCKET`    | —                 | bucket name for S3     |
| `AWS_REGION`       | —                 | region for S3          |
| `CLAMAV_HOST`      | —                 | (optional) ClamAV host |

## Migration

لترحيل الملفات المضمنة القديمة:

```bash
node backend/scripts/migrate-embedded-files-to-documents.js --dry-run
node backend/scripts/migrate-embedded-files-to-documents.js
```

## الاختبارات

```bash
cd backend
npx jest __tests__/storage.service.test.js __tests__/document-upload.service.test.js __tests__/document-link.service.test.js --no-coverage --forceExit
```

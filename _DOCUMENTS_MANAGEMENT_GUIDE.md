# 📁 Document Management System - Implementation Guide

## Quick Start (5 Minutes)

### Step 1: Verify Files Created

```bash
# Check backend files
ls backend/models/Document.js
ls backend/controllers/documentController.js
ls backend/middleware/uploadMiddleware.js
ls backend/routes/documentRoutes.js

# Check frontend files
ls frontend/src/services/documentService.js
ls frontend/src/components/documents/DocumentUploader.js
ls frontend/src/components/documents/DocumentList.js
ls frontend/src/pages/Documents.js

# Check sample data
ls add_documents_sample_data.js
```

### Step 2: Load Sample Data

```bash
cd backend
node ../add_documents_sample_data.js
```

Expected output:

```
✓ تم الاتصال بقاعدة البيانات
✓ تم إضافة 5 مستندات عينة
📊 الإحصائيات:
  تقارير: 1 مستندات، 1.00 MB
  عقود: 1 مستندات، 0.50 MB
  سياسات: 1 مستندات، 2.00 MB
  تدريب: 1 مستندات، 3.00 MB
  مالي: 1 مستندات، 2.50 MB
```

### Step 3: Start Servers

```bash
# Terminal 1
cd backend
npm start

# Terminal 2
cd frontend
npm start
```

### Step 4: Access Application

```
Browser: http://localhost:3000
Menu: Sidebar → الاتصالات الإدارية → إدارة المستندات
Or Direct: http://localhost:3000/documents
```

---

## API Endpoints Reference

### Document Management

```
POST   /api/documents/upload        Upload new document
GET    /api/documents               List all documents (with filters)
GET    /api/documents/:id           Get document details
PUT    /api/documents/:id           Update document metadata
GET    /api/documents/:id/download  Download file
DELETE /api/documents/:id           Delete document (soft)
POST   /api/documents/:id/restore   Restore deleted document
```

### Sharing & Access

```
POST   /api/documents/:id/share     Share with user/email
DELETE /api/documents/:id/share/:id Remove access
```

### Statistics & Search

```
GET    /api/documents/stats         Get user statistics
GET    /api/documents/search        Advanced search
GET    /api/documents/folders       List folders
```

---

## Database Schema

### Document Collection Fields

**File Information:**

- `fileName` - Storage filename (with timestamp)
- `originalFileName` - User-visible filename
- `fileType` - Extension (pdf, docx, xlsx, jpg, png, txt, pptx, zip)
- `mimeType` - MIME type
- `fileSize` - Size in bytes
- `filePath` - Full path to stored file

**Document Metadata:**

- `title` - Required, searchable
- `description` - Optional
- `category` - Enum (تقارير, عقود, سياسات, تدريب, مالي, أخرى)
- `tags` - Array of strings
- `folder` - Organization

**Ownership & Sharing:**

- `uploadedBy` - User ID
- `uploadedByName` - User name
- `uploadedByEmail` - User email
- `isPublic` - Boolean for public access
- `sharedWith` - Array of sharing records:
  - userId, email, name
  - permission (view, edit, download, share)
  - sharedAt timestamp
- `sharedWithGroups` - Array of group sharing

**Versioning:**

- `version` - Current version number
- `isLatestVersion` - Boolean flag
- `previousVersions` - Array of old versions

**Activity Tracking:**

- `viewCount` - Number of views
- `downloadCount` - Number of downloads
- `activityLog` - Array of actions:
  - action (تحميل, تنزيل, عرض, مشاركة, تعديل, حذف, استرجاع)
  - performedBy, performedByName
  - performedAt, details

**Status & Lifecycle:**

- `status` - Enum (نشط, مؤرشف, محذوف, قيد المراجعة)
- `isArchived` - Boolean
- `archivedAt` - Timestamp
- `archivedBy` - User ID

**Approvals:**

- `requiresApproval` - Boolean
- `approvalStatus` - Enum (معلق, موافق عليه, مرفوض)
- `approvedBy` - User ID

**Dates:**

- `createdAt` - Upload timestamp
- `updatedAt` - Last modification
- `expiryDate` - Optional expiration
- `lastModified` - Last change time
- `lastModifiedBy` - User ID

---

## Component Architecture

### Frontend Data Flow

```
[DocumentsPage]
    ↓
[documentService] ← → [API Backend]
    ↓ ↓ ↓
[DocumentUploader] [DocumentList] [Share Dialog]
    ↓                  ↓ ↓ ↓
[Upload Form]    [Table] [Actions] [Details]
```

### Backend Data Flow

```
[HTTP Request]
    ↓
[uploadMiddleware] → [File Validation]
    ↓
[documentController]
    ↓ ↓ ↓
[CRUD] [Share] [Search]
    ↓
[Document Model]
    ↓
[MongoDB]
```

---

## Features By Component

### DocumentUploader

```
✓ Drag & drop file selection
✓ File type & size validation
✓ Title input (required)
✓ Description input
✓ Category dropdown
✓ Dynamic tags
✓ Upload progress bar
✓ Error messages
✓ Success notification
```

### DocumentList

```
✓ Table display
✓ File type icons
✓ Category badges
✓ File size formatting
✓ Upload date
✓ Context menu (⋮)
✓ Download action
✓ Share action
✓ Details modal
✓ Delete action
```

### Documents Page

```
✓ Upload button
✓ Statistics cards
✓ Search field
✓ Category filter
✓ Folder filter
✓ Refresh button
✓ Empty state
✓ Loading spinner
✓ Error alerts
✓ Success toasts
✓ Share dialog
```

---

## Permissions System

### Permission Levels

```
view     - Read-only access
edit     - Can modify document metadata
download - Can download file
share    - Can share with others
```

### Access Control

```
Owner      - All permissions (implicit)
Shared User - Assigned permission level
Public     - View only (if isPublic=true)
Other      - No access
```

### Methods

```javascript
document.hasAccess(userId, requiredPermission)
  → Returns: boolean
  → Checks: ownership, sharing, public status
```

---

## File Upload Process

### Step-by-Step

1. **User selects file**
   - File input handler
   - Size validation (<50MB)
   - Type validation

2. **Upload form submitted**
   - Title required check
   - FormData created
   - POST /api/documents/upload

3. **Backend processing**
   - Multer validates & stores
   - File metadata extracted
   - Document record created
   - Activity log added

4. **Response handling**
   - Success notification
   - Document added to list
   - Statistics updated
   - Dialog closed

5. **File storage**
   - Location: `backend/uploads/`
   - Naming: `original-name-timestamp.ext`
   - Path stored in database

---

## Search & Filter

### Search Query

```javascript
{
  q: "search term",                    // Full text search
  category: "تقارير",                  // Optional category
  dateFrom: "2024-01-01",             // Optional start date
  dateTo: "2024-12-31"                // Optional end date
}
```

### Full-Text Indexes

```
- title (text index)
- description (text index)
- tags (text index)
- searchKeywords (derived field)
```

### Filter Examples

```
// Search in title only
GET /api/documents/search?q=سياسة

// By category
GET /api/documents?category=تقارير

// Date range
GET /api/documents/search?dateFrom=2024-01-01&dateTo=2024-01-31

// Folder
GET /api/documents?folder=root

// Combined
GET /api/documents/search?q=مالية&category=مالي&dateFrom=2024-01-01
```

---

## Sharing Workflow

### Share Document

```
1. User clicks "Share" on document
2. Share dialog opens
3. Enter recipient email
4. Select permission level
5. Click "Share"
6. Backend validates
7. Record added to sharedWith[]
8. Activity log entry
9. Success notification
10. UI updates
```

### Recipient Access

```
1. Recipient with matching email
2. Can see document in list (if not archived)
3. Can perform actions per permission:
   - view: Read metadata
   - edit: Update metadata
   - download: Get file
   - share: Can reshare
```

### Revoke Access

```
1. Owner clicks "More" (⋮)
2. Opens shared users list
3. Finds recipient
4. Clicks remove/revoke
5. Removed from sharedWith[]
6. Activity logged
7. No longer accessible to recipient
```

---

## Statistics System

### Collection-Level Stats

```javascript
{
  totalDocuments: 45,
  totalSize: 157286400,  // in bytes
  byCategory: [
    { _id: "تقارير", count: 15, totalSize: 52428800 },
    { _id: "عقود", count: 10, totalSize: 31457280 },
    // ...
  ]
}
```

### Document-Level Tracking

```javascript
{
  viewCount: 23,        // Times viewed
  downloadCount: 8,     // Times downloaded
  version: 2,           // Current version

  activityLog: [
    {
      action: "تنزيل",
      performedBy: ObjectId,
      performedByName: "محمد علي",
      performedAt: Date,
      details: ""
    },
    // ... more entries
  ]
}
```

### Queries

```javascript
// Get user stats
GET / api / documents / stats;

// View counts
db.documents.findById(id).viewCount;

// Download counts
db.documents.findById(id).downloadCount;

// Category distribution
db.documents.aggregate([{ $match: { uploadedBy: userId } }, { $group: { _id: '$category', count: { $sum: 1 } } }]);
```

---

## Error Handling

### Upload Errors

```
- No file selected: "لم يتم تحديد ملف"
- File too large: "حجم الملف كبير جداً (50MB max)"
- Invalid type: "نوع الملف غير مدعوم"
- Title required: "العنوان مطلوب"
- Server error: "خطأ في تحميل المستند"
```

### Access Errors

```
- Not found: "المستند غير موجود" (404)
- No permission: "ليس لديك صلاحية" (403)
- Not owner: "فقط المالك يمكنه..." (403)
```

### Network Errors

```
- Connection failed: Fallback to mock data
- Timeout: Retry with exponential backoff
- Server error: User-friendly error message
```

---

## Testing Checklist

### Functional Tests

- [ ] Upload various file types
- [ ] Upload multiple times
- [ ] Update document metadata
- [ ] Share with different permissions
- [ ] Search by title
- [ ] Filter by category
- [ ] Filter by folder
- [ ] Download file
- [ ] Delete and restore
- [ ] View statistics

### Security Tests

- [ ] File type validation
- [ ] File size limits
- [ ] Access control validation
- [ ] Ownership checks
- [ ] Permission verification

### Performance Tests

- [ ] Load with 100+ documents
- [ ] Search large datasets
- [ ] Upload large files
- [ ] Handle concurrent uploads

---

## Troubleshooting

### Documents not showing

```
1. Check backend is running (port 3001)
2. Check frontend is running (port 3000)
3. Check sample data loaded:
   - Backend console should show 5 documents
4. Check browser console for errors
5. Verify auth token exists
```

### Upload fails

```
1. Check file size <50MB
2. Check file type is supported
3. Check title field is filled
4. Check backend uploads folder exists
5. Check MongoDB is connected
6. Check server logs for errors
```

### Share not working

```
1. Verify you're the document owner
2. Check email format is valid
3. Verify backend running
4. Check MongoDB connected
5. Look for errors in console
```

### Search not working

```
1. Check title/description has text
2. Verify MongoDB text indexes created
3. Try searching different terms
4. Check backend connected
5. Clear browser cache
```

---

## Production Checklist

Before deploying to production:

- [ ] Enable HTTPS/SSL
- [ ] Set up environment variables
- [ ] Configure file storage (S3 or similar)
- [ ] Set up database backups
- [ ] Enable virus scanning
- [ ] Configure rate limiting
- [ ] Set up logging
- [ ] Enable compression
- [ ] Set up monitoring
- [ ] Configure email notifications
- [ ] Set up document retention policies
- [ ] Enable full-text search indexing
- [ ] Configure file cleanup jobs
- [ ] Set up audit logging
- [ ] Test disaster recovery

---

**Document Management System Ready to Deploy! 🚀**

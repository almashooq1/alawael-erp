# 🔌 **Phase 9 - API Reference**

## **Base URL**
```
http://localhost:3001/api/upload
```

## **Authentication**
```
All endpoints require:
Header: Authorization: Bearer <JWT_TOKEN>
```

---

## 📤 **UPLOAD ENDPOINTS**

### **POST /single** - Single File Upload
```http
POST /api/upload/single
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- file: <binary file data>

Response (200 OK):
{
  "success": true,
  "file": {
    "filename": "document.pdf",
    "originalName": "document.pdf",
    "size": 2097152,
    "sizeFormatted": "2 MB",
    "mimeType": "application/pdf",
    "uploadedAt": "2026-02-19T10:30:00Z",
    "url": "/api/upload/document.pdf",
    "hash": "abc123def456..."
  },
  "message": "File uploaded successfully"
}
```

**Error Responses:**
```
400 - Invalid file (missing, wrong type, too large)
401 - Unauthorized (invalid token)
413 - Payload too large (> 100MB)
507 - Insufficient storage quota
```

---

### **POST /multiple** - Multiple Files Upload
```http
POST /api/upload/multiple
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- files: <file1.pdf>
- files: <file2.jpg>
- files: <file3.doc>

Response (200 OK):
{
  "success": true,
  "files": [
    {
      "filename": "document1.pdf",
      "size": 1048576,
      "sizeFormatted": "1 MB",
      "status": "success"
    },
    {
      "filename": "image.jpg",
      "size": 512000,
      "sizeFormatted": "500 KB",
      "status": "success"
    }
  ],
  "totalSize": 1560576,
  "totalSizeFormatted": "1.5 MB",
  "count": 2,
  "message": "2 files uploaded successfully"
}
```

---

## 📥 **DOWNLOAD ENDPOINTS**

### **GET /:filename** - Download File
```http
GET /api/upload/document.pdf
Authorization: Bearer <token>

Response (200 OK):
- Headers:
  Content-Type: application/pdf
  Content-Length: 2097152
  Content-Disposition: attachment; filename="document.pdf"
  
- Body: Binary file data
```

---

## 📋 **LIST & VIEW ENDPOINTS**

### **GET /list** - List All User Files
```http
GET /api/upload/list?page=1&limit=10&sort=-uploadedAt
Authorization: Bearer <token>

Query Parameters:
- page: Page number (default: 1)
- limit: Files per page (default: 10, max: 100)
- sort: Sort field (uploadedAt, size, filename)

Response (200 OK):
{
  "success": true,
  "files": [
    {
      "filename": "report.pdf",
      "size": 1048576,
      "sizeFormatted": "1 MB",
      "mimeType": "application/pdf",
      "type": "documents",
      "uploadedAt": "2026-02-19T10:30:00Z"
    },
    {
      "filename": "photo.jpg",
      "size": 512000,
      "sizeFormatted": "500 KB",
      "mimeType": "image/jpeg",
      "type": "images",
      "uploadedAt": "2026-02-19T10:15:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalFiles": 15,
    "filesPerPage": 10
  }
}
```

---

### **GET /types/:type** - Filter by Type
```http
GET /api/upload/types/images
GET /api/upload/types/documents
GET /api/upload/types/videos
GET /api/upload/types/archives

Available types:
- images: jpeg, jpg, png, gif, webp
- documents: pdf, doc, docx, txt, xls, xlsx, csv
- videos: mp4, mov, avi, mkv
- archives: zip, rar, 7z

Response (200 OK):
{
  "success": true,
  "type": "images",
  "files": [
    {
      "filename": "photo.jpg",
      "size": 512000,
      "sizeFormatted": "500 KB",
      "extension": "jpg"
    }
  ],
  "total": 1
}
```

---

### **GET /search** - Search Files
```http
GET /api/upload/search?q=invoice&type=documents
Authorization: Bearer <token>

Query Parameters:
- q: Search query (filename, case-insensitive)
- type: Filter by type (optional)
- limit: Max results (default: 50)

Response (200 OK):
{
  "success": true,
  "query": "invoice",
  "results": [
    {
      "filename": "invoice_2026_01.pdf",
      "size": 2097152,
      "sizeFormatted": "2 MB",
      "type": "documents",
      "uploadedAt": "2026-02-19T10:30:00Z",
      "relevance": 1.0
    }
  ],
  "totalResults": 1
}
```

---

## 📊 **STATISTICS & STORAGE ENDPOINTS**

### **GET /storage** - Storage Information
```http
GET /api/upload/storage
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "used": 5242880,
  "usedFormatted": "5 MB",
  "limit": 5368709120,
  "limitFormatted": "5 GB",
  "percentage": 0.097,
  "available": 5363466240,
  "availableFormatted": "5 GB"
}
```

---

### **GET /stats** - File Statistics
```http
GET /api/upload/stats
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "totalFiles": 25,
  "totalSize": 5242880,
  "totalSizeFormatted": "5 MB",
  "averageFileSize": 209715,
  "averageFileSizeFormatted": "205 KB",
  "largestFile": {
    "filename": "video.mp4",
    "size": 1048576,
    "sizeFormatted": "1 MB"
  },
  "smallestFile": {
    "filename": "note.txt",
    "size": 1024,
    "sizeFormatted": "1 KB"
  },
  "fileTypes": {
    "pdf": 5,
    "jpg": 10,
    "doc": 3,
    "zip": 2,
    "mp4": 1,
    "other": 4
  },
  "categories": {
    "images": 10,
    "documents": 8,
    "archives": 2,
    "videos": 1,
    "other": 4
  }
}
```

---

### **GET /compression** - Compression Analysis
```http
GET /api/upload/compression
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "compressibleSize": 1048576,
  "compressibleSizeFormatted": "1 MB",
  "estimatedSavings": 524288,
  "estimatedSavingsFormatted": "512 KB",
  "estimatedCompressionRatio": 0.5,
  "compressibleFiles": [
    {
      "filename": "large_image.jpg",
      "size": 512000,
      "sizeFormatted": "500 KB",
      "potentialSavings": 256000
    },
    {
      "filename": "document.pdf",
      "size": 536576,
      "potential_savings": 268288
    }
  ],
  "compressibleCount": 2,
  "compressionPercentage": 49.9
}
```

---

## 🗑️ **DELETE ENDPOINTS**

### **DELETE /:filename** - Delete Single File
```http
DELETE /api/upload/document.pdf
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "filename": "document.pdf",
  "message": "File deleted successfully",
  "timestamp": "2026-02-19T10:45:00Z"
}

Response (404):
{
  "success": false,
  "message": "File not found"
}
```

---

### **DELETE /multiple** - Delete Multiple Files
```http
DELETE /api/upload/multiple
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "filenames": [
    "document1.pdf",
    "image.jpg",
    "archive.zip"
  ]
}

Response (200 OK):
{
  "success": true,
  "deleted": 3,
  "failed": 0,
  "results": [
    {
      "filename": "document1.pdf",
      "status": "deleted"
    },
    {
      "filename": "image.jpg",
      "status": "deleted"
    },
    {
      "filename": "archive.zip",
      "status": "deleted"
    }
  ],
  "message": "3 files deleted successfully"
}
```

---

## 💾 **BACKUP ENDPOINTS**

### **POST /backup** - Create Backup
```http
POST /api/upload/backup
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "backupName": "backup_2026_02_19_10_45_00",
  "timestamp": "2026-02-19T10:45:00Z",
  "fileCount": 25,
  "totalSize": 5242880,
  "totalSizeFormatted": "5 MB",
  "message": "Backup created successfully"
}
```

---

### **GET /backups** - List Backups
```http
GET /api/upload/backups
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "backups": [
    {
      "name": "backup_2026_02_19_10_45_00",
      "timestamp": "2026-02-19T10:45:00Z",
      "fileCount": 25,
      "size": 5242880,
      "sizeFormatted": "5 MB"
    },
    {
      "name": "backup_2026_02_19_09_30_00",
      "timestamp": "2026-02-19T09:30:00Z",
      "fileCount": 24,
      "size": 5123456,
      "sizeFormatted": "4.9 MB"
    }
  ],
  "totalBackups": 2
}
```

---

### **POST /backup/:backupName/restore** - Restore Backup
```http
POST /api/upload/backup/backup_2026_02_19_10_45_00/restore
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "backupName": "backup_2026_02_19_10_45_00",
  "filesRestored": 25,
  "message": "Files restored successfully from backup"
}
```

---

## 🔥 **MAINTENANCE ENDPOINTS**

### **POST /cleanup** - Cleanup Old Files
```http
POST /api/upload/cleanup?days=30
Authorization: Bearer <token>

Query Parameters:
- days: Delete files older than N days (default: 90)

Response (200 OK):
{
  "success": true,
  "filesDeleted": 5,
  "spacedFreed": 10485760,
  "spacedFreedFormatted": "10 MB",
  "message": "Cleanup completed successfully"
}
```

---

## 📝 **UPDATE ENDPOINTS**

### **PUT /:filename/rename** - Rename File
```http
PUT /api/upload/document.pdf/rename
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "newFilename": "report_final.pdf"
}

Response (200 OK):
{
  "success": true,
  "oldFilename": "document.pdf",
  "newFilename": "report_final.pdf",
  "message": "File renamed successfully"
}
```

---

## 🔐 **Authentication Examples**

### **Using cURL**
```bash
# Get token (login endpoint)
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.token')

# Upload file with token
curl -X POST http://localhost:3001/api/upload/single \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf"
```

### **Using Fetch (JavaScript)**
```javascript
const token = localStorage.getItem('authToken');

fetch('/api/upload/single', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
.then(res => res.json())
.then(data => console.log(data));
```

### **Using Axios (JavaScript)**
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Upload
api.post('/upload/single', formData)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

---

## ⚡ **Error Codes**

| Code | Error | Solution |
|------|-------|----------|
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Provide valid JWT token |
| 404 | Not Found | File doesn't exist |
| 413 | File Too Large | File exceeds 100MB limit |
| 415 | Unsupported Type | File type not allowed |
| 507 | Storage Exceeded | User quota exceeded |
| 500 | Server Error | Contact support |

---

## 🧪 **Testing API**

### **Using Postman**

1. Create environment variable:
   ```
   {{base_url}}: http://localhost:3001
   {{token}}: <your_jwt_token>
   ```

2. Add authorization header:
   ```
   Authorization: Bearer {{token}}
   ```

3. Test endpoints:
   - POST {{base_url}}/api/upload/single
   - GET {{base_url}}/api/upload/list
   - GET {{base_url}}/api/upload/storage
   - etc.

---

## 📊 **Rate Limiting** (Optional)

Default: No rate limiting  
Recommended: 100 requests per minute per user

---

**API Version:** 1.0.0  
**Last Updated:** Feb 19, 2026  
**Status:** ✅ Production Ready

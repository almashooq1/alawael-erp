# ⚡ **Phase 9: File Management - Quick Start Guide**

## 🚀 **Get Started in 2 Minutes**

### **1. Start the Service**

```bash
cd erp_new_system/backend
npm start
# Server ready on http://localhost:3001
```

### **2. Test Upload**

```bash
# Get a JWT token first
export TOKEN="your_jwt_token"

# Single file upload
curl -X POST http://localhost:3001/api/upload/single \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf"

# Multiple files
curl -X POST http://localhost:3001/api/upload/multiple \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@file1.pdf" \
  -F "files=@file2.jpg"
```

### **3. Check Storage**

```bash
curl http://localhost:3001/api/upload/storage \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "used": 2097152,
#   "limit": 5368709120,
#   "percentage": 0.04,
#   "available": 5366612000
# }
```

---

## 📝 **Common Operations**

### **List All Files**
```bash
curl http://localhost:3001/api/upload/list \
  -H "Authorization: Bearer $TOKEN"
```

### **Search for Files**
```bash
curl "http://localhost:3001/api/upload/search?q=invoice" \
  -H "Authorization: Bearer $TOKEN"
```

### **Filter by Type**
```bash
# Available types: images, documents, videos, archives
curl http://localhost:3001/api/upload/types/images \
  -H "Authorization: Bearer $TOKEN"
```

### **Get File Statistics**
```bash
curl http://localhost:3001/api/upload/stats \
  -H "Authorization: Bearer $TOKEN"

# Response shows file count, sizes, types, etc.
```

### **Delete File**
```bash
curl -X DELETE http://localhost:3001/api/upload/document.pdf \
  -H "Authorization: Bearer $TOKEN"
```

### **Create Backup**
```bash
curl -X POST http://localhost:3001/api/upload/backup \
  -H "Authorization: Bearer $TOKEN"

# Creates timestamped backup of all files
```

---

## 🔧 **Configuration**

**Environment Variables** (`.env`):
```
MAX_FILE_SIZE=104857600              # 100MB
MAX_STORAGE_PER_USER=5368709120      # 5GB
UPLOAD_DIR=./uploads
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,png,gif,zip
```

**Allowed File Types:**
- Images: jpeg, jpg, png, gif, webp
- Documents: pdf, doc, docx, txt
- Spreadsheets: xls, xlsx, csv
- Archives: zip, rar, 7z

---

## 💡 **React Integration Example**

```javascript
import { useState } from 'react';

function FileUploadExample() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const selectedFiles = e.target.files;
    setUploading(true);

    const formData = new FormData();
    Array.from(selectedFiles).forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/upload/multiple', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData,
      });

      const result = await response.json();
      setFiles(result.files);
      alert(`✅ ${result.files.length} files uploaded!`);
    } catch (error) {
      alert('❌ Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      
      <ul>
        {files.map(file => (
          <li key={file.filename}>
            {file.filename} - {file.sizeFormatted}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🧪 **Run Tests**

```bash
cd backend
node test-phase-9.js

# Output: ✅ 47/47 tests passed (100%)
```

---

## ⚠️ **Important Notes**

✅ Each user gets **5GB** storage limit  
✅ Maximum file size is **100MB**  
✅ Files are stored in `uploads/` directory  
✅ All operations require JWT authentication  
✅ Backup frequency: manual (on-demand)  
✅ Old files can be auto-cleaned (configurable)  

---

## 🎯 **Next Features (Phase 10)**

- 📊 Advanced Analytics
- 📈 Storage Trends
- 👥 User Behavior Analysis
- 🔍 Smart Search
- 📱 Mobile Upload

---

**Phase 9 Status:** ✅ **PRODUCTION READY**

*Last Updated: Feb 19, 2026*

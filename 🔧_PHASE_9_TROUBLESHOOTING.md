# 🔧 **Phase 9 - Troubleshooting Guide**

## 🐛 **Common Issues & Solutions**

---

## 🚀 **Installation Issues**

### **Issue: multer not found**
```
Error: Cannot find module 'multer'
```

**Solution:**
```bash
npm install multer --save
```

---

### **Issue: Upload directory permission denied**
```
Error: EACCES: permission denied, mkdir './uploads'
```

**Solution:**
```bash
# Give full permissions to uploads directory
chmod 755 ./uploads/

# Or create with permissions
mkdir -p -m 755 ./uploads/
```

---

## 📤 **Upload Issues**

### **Issue: File upload fails with 413**
```
413 Payload Too Large
```

**Cause:** File exceeds 100MB limit or server body limit  
**Solution:**
```javascript
// In app.js, increase body limit
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// In middleware
app.use(express.json({ limit: '100mb' }));
```

---

### **Issue: File upload fails with 415**
```
415 Unsupported Media Type
```

**Cause:** File type not in whitelist  
**Solution:**
```javascript
// Check allowed file types in fileManagement.service.js
const ALLOWED_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif'],
  documents: ['application/pdf', 'application/msword'],
  // ... add more types
};
```

---

### **Issue: Filename collision**
```
Multiple files with same name overwriting each other
```

**Cause:** generateFilename() not creating unique names  
**Solution:**
```javascript
// generateFilename should return unique name
generateFilename(originalName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  return `${name}_${timestamp}_${random}${ext}`;
}
```

---

### **Issue: File not found after upload**
```
File uploaded but cannot download
```

**Cause:** File saved in wrong location  
**Solution:**
```javascript
// Ensure getUserUploadDir is called with correct userId
const userDir = fileService.getUserUploadDir(req.user.id);
console.log('Upload directory:', userDir);
console.log('File path:', filePath);

// Verify directory exists
if (!fs.existsSync(userDir)) {
  fs.mkdirSync(userDir, { recursive: true });
}
```

---

## 📥 **Download Issues**

### **Issue: Download returns 404**
```
404 File Not Found
```

**Cause:** File doesn't exist in user's directory  
**Solution:**
```javascript
// Check if file exists before download
router.get('/:filename', auth, (req, res) => {
  const userDir = fileService.getUserUploadDir(req.user.id);
  const filePath = path.join(userDir, req.params.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  // Stream file
});
```

---

### **Issue: Downloaded file is corrupted**
```
File downloads but cannot open
```

**Cause:** Headers not set correctly  
**Solution:**
```javascript
// Set correct headers
res.setHeader('Content-Type', 'application/octet-stream');
res.setHeader('Content-Length', stats.size);
res.setHeader(
  'Content-Disposition',
  `attachment; filename="${filename}"`
);
```

---

### **Issue: Download speed too slow**
```
Large files taking too long
```

**Cause:** Buffering entire file  
**Solution:**
```javascript
// Use streaming instead
const stream = fs.createReadStream(filePath);
stream.pipe(res);

// Optionally set buffer size
const stream = fs.createReadStream(filePath, {
  highWaterMark: 1024 * 1024 // 1MB buffer
});
```

---

## 💾 **Storage Issues**

### **Issue: Storage quota exceeded**
```
507 Storage Quota Exceeded
```

**Cause:** User has exceeded 5GB limit  
**Solution:**
```javascript
// Check before upload
const quotaCheck = fileService.checkStorageQuota(userId, fileSize);

if (!quotaCheck.allowed) {
  // Delete old files
  fileService.clearOldFiles(userId, 30); // Clear files older than 30 days
  
  // Or ask user to delete some files
}

// Or increase quota in service
MAX_STORAGE_PER_USER = 10368709120; // 10GB
```

---

### **Issue: Storage percentage incorrect**
```
Storage showing wrong percentage
```

**Cause:** Storage calculation error  
**Solution:**
```javascript
// Recalculate storage
const usage = fileService.getUserStorageUsage(userId);
console.log('Total size:', usage.total);
console.log('File count:', usage.fileCount);
console.log('Percentage:', (usage.total / MAX_STORAGE) * 100);
```

---

## 🔐 **Authentication Issues**

### **Issue: 401 Unauthorized**
```
401 Unauthorized - Missing or invalid token
```

**Cause:** Token not provided or expired  
**Solution:**
```javascript
// Ensure token is in header
Authorization: Bearer YOUR_TOKEN_HERE

// Check token validity
router.get('/protected', auth, (req, res) => {
  // If we reach here, token is valid
  console.log('User:', req.user.id);
});
```

---

### **Issue: CORS error on file upload**
```
Cross-Origin Request Blocked
```

**Cause:** CORS not configured  
**Solution:**
```javascript
// Add CORS middleware
const cors = require('cors');

app.use(cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 🗑️ **Delete Issues**

### **Issue: Cannot delete file - permission denied**
```
Error: EACCES: permission denied, unlink './uploads/...'
```

**Cause:** File permissions restricted  
**Solution:**
```javascript
try {
  fs.unlinkSync(filePath);
} catch (error) {
  // Try with different approach
  fs.chmod(filePath, 0o644, () => {
    fs.unlinkSync(filePath);
  });
}
```

---

### **Issue: Delete fails for multiple files**
```
Only some files deleted
```

**Cause:** Error in loop breaks execution  
**Solution:**
```javascript
const results = [];
for (const filename of filenames) {
  try {
    fileService.deleteFile(userId, filename);
    results.push({ filename, status: 'deleted' });
  } catch (error) {
    results.push({ 
      filename, 
      status: 'failed', 
      error: error.message 
    });
  }
}
```

---

## 🆘 **Backup Issues**

### **Issue: Backup not created**
```
Backup endpoint returns error
```

**Solution:**
```javascript
// Ensure _backups directory exists
const backupDir = path.join(userDir, '_backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}
```

---

### **Issue: Restore fails**
```
Cannot restore files from backup
```

**Solution:**
```javascript
// Check backup exists
const backupPath = path.join(userDir, '_backups', backupName);
if (!fs.existsSync(backupPath)) {
  console.error('Backup not found:', backupName);
  return false;
}

// Verify backup is readable
try {
  const files = fs.readdirSync(backupPath);
  console.log('Backup contains', files.length, 'files');
} catch (error) {
  console.error('Cannot read backup:', error);
}
```

---

## 📊 **Statistics Issues**

### **Issue: Statistics showing wrong values**
```
File count or size incorrect
```

**Solution:**
```javascript
// Rebuild statistics
const files = fs.readdirSync(userDir);
let totalSize = 0;

files.forEach(file => {
  const stats = fs.statSync(path.join(userDir, file));
  totalSize += stats.size;
  console.log(`${file}: ${stats.size} bytes`);
});

console.log(`Total: ${totalSize} bytes`);
```

---

## 🔍 **Search Issues**

### **Issue: Search returns no results**
```
Searching for "invoice" returns empty
```

**Cause:** Search function case-sensitive  
**Solution:**
```javascript
searchFiles(userId, query) {
  const userDir = this.getUserUploadDir(userId);
  const files = fs.readdirSync(userDir);
  
  return files.filter(file => 
    file.toLowerCase().includes(query.toLowerCase())
  );
}
```

---

### **Issue: Search too slow**
```
Search takes > 1 second for 1000 files
```

**Cause:** No indexing  
**Solution:**
```javascript
// Consider adding file index
// Option 1: Cache file list
this.fileCache = new Map();

// Option 2: Use search library
const lunr = require('lunr');

// Option 3: Index to database
// Store files in MongoDB with indexed fields
```

---

## 🧪 **Testing Issues**

### **Issue: Tests fail with "Cannot find module"**
```
Error: Cannot find module 'fileManagement.service'
```

**Solution:**
```javascript
// Fix path in test file
const FileManagementService = 
  require('../backend/services/fileManagement.service');
```

---

### **Issue: Tests time out**
```
Jest timeout exceeded
```

**Solution:**
```javascript
// Increase timeout
jest.setTimeout(10000); // 10 seconds

// Or for specific test
test('upload file', async () => {
  // ...
}, 10000);
```

---

## 🔥 **Performance Issues**

### **Issue: Slow uploads**
```
Upload speed < 100KB/s
```

**Cause:** Small node buffer  
**Solution:**
```javascript
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    fields: 10,
    files: 10
  }
});

// Check disk I/O
// Monitor CPU usage
// Check network
```

---

### **Issue: High memory usage**
```
Node process using > 500MB
```

**Cause:** Buffering entire file  
**Solution:**
```javascript
// Use streaming
const stream = fs.createReadStream(filePath, {
  highWaterMark: 64 * 1024 // 64KB chunks
});

// Monitor memory
console.log('Memory:', process.memoryUsage());
```

---

## 📋 **Debugging Checklist**

- [ ] Check server logs
- [ ] Verify file permissions
- [ ] Check disk space available
- [ ] Verify JWT token validity
- [ ] Check CORS configuration
- [ ] Monitor network requests
- [ ] Verify file paths
- [ ] Check multer configuration
- [ ] Verify upload directory exists
- [ ] Check file size limits

---

## 📞 **Getting Help**

1. **Check logs:**
   ```bash
   tail -f logs/error.log
   tail -f logs/access.log
   ```

2. **Debug with console:**
   ```javascript
   console.log('Debug info:', { userId, filePath, fileSize });
   ```

3. **Test with Postman:**
   - Test each endpoint individually
   - Check headers and body
   - Verify authentication

4. **Run tests:**
   ```bash
   node test-phase-9.js
   ```

---

## 🎯 **Prevention Tips**

✅ Always validate file input  
✅ Check storage quota before upload  
✅ Use streaming for large files  
✅ Implement proper error handling  
✅ Log all operations  
✅ Test before production  
✅ Monitor disk space  
✅ Clean old files regularly  
✅ Keep backups  
✅ Use HTTPS in production  

---

**Status:** ✅ Troubleshooting Guide Complete  
*Last Updated: Feb 19, 2026*

# 🔐 **Phase 9 - Security Best Practices**

## **Overview**

File management involves handling user data, so security is critical. This guide covers:
- File validation
- Access control
- Storage security
- Data protection
- Compliance

---

## 🛡️ **File Validation**

### **1. File Type Validation**

❌ **Bad:**
```javascript
// Allows any file type
router.post('/upload', (req, res) => {
  // No validation
  saveFile(req.file);
});
```

✅ **Good:**
```javascript
// Whitelist allowed types
const ALLOWED_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif'],
  documents: ['application/pdf', 'application/msword'],
  archives: ['application/zip']
};

// Validate MIME type
function validateFile(file) {
  const allowed = Object.values(ALLOWED_TYPES).flat();
  if (!allowed.includes(file.mimetype)) {
    throw new Error('Invalid file type');
  }
}

// Check magic numbers (file signatures)
function verifyFileSignature(filePath, mimeType) {
  const buffer = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 4);
  fs.closeSync(fd);
  
  const magic = buffer.toString('hex');
  
  // JPEG: FFD8FF
  // PNG: 89504E47
  // PDF: 25504446
  // ZIP: 504B0304
}
```

---

### **2. File Size Validation**

❌ **Bad:**
```javascript
// No size limit - allows huge files
const upload = multer({ dest: 'uploads/' });
```

✅ **Good:**
```javascript
// Set reasonable limits
const upload = multer({
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
    files: 10                      // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    if (file.size > 100 * 1024 * 1024) {
      cb(new Error('File too large'));
    } else {
      cb(null, true);
    }
  }
});
```

---

### **3. Filename Validation**

❌ **Bad:**
```javascript
// Stores original filename - allows path traversal
fs.writeFile(req.file.originalname, data);
```

✅ **Good:**
```javascript
// Sanitize filename, prevent path traversal
function sanitizeFilename(filename) {
  // Remove path separators
  filename = filename.replace(/\.\./g, '')
                     .replace(/[\/\\]/g, '')
                     .substring(0, 255);
  
  // Ensure it has extension
  if (!path.extname(filename)) {
    throw new Error('No file extension');
  }
  
  return filename;
}

// Generate unique filename
function generateSecureFilename(original) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(original);
  return `${timestamp}_${random}${ext}`;
}
```

---

## 🔒 **Access Control**

### **1. User Directory Isolation**

❌ **Bad:**
```javascript
// All files in one directory - users can see each other's files
const uploadDir = './uploads/';
fs.writeFile(path.join(uploadDir, filename), data);
```

✅ **Good:**
```javascript
// Separate directory per user - prevents cross-user access
function getUserUploadDir(userId) {
  return path.join('./uploads', userId);
}

// Verify user owns file
function verifyFileOwnership(userId, filename) {
  const userDir = getUserUploadDir(userId);
  const filePath = path.join(userDir, filename);
  
  // Prevent path traversal
  if (!filePath.startsWith(userDir)) {
    throw new Error('Access denied');
  }
  
  return filePath;
}
```

---

### **2. Authentication Required**

❌ **Bad:**
```javascript
// Allows unauthenticated access
router.get('/download/:filename', (req, res) => {
  // Just download any file
});
```

✅ **Good:**
```javascript
// Require JWT token
router.get('/download/:filename', 
  authenticate, 
  authorize, 
  (req, res) => {
    // User must be authenticated
    const filePath = getUserFile(req.user.id, req.params.filename);
    res.download(filePath);
  }
);

// Middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

### **3. Role-Based Access (Optional)**

```javascript
// Different permissions for different roles
const authorize = {
  user: (req, res, next) => {
    // Users can only access own files
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  },
  
  admin: (req, res, next) => {
    // Admins can access any files
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    next();
  }
};
```

---

## 💾 **Storage Security**

### **1. Prevent Path Traversal**

❌ **Bad:**
```javascript
// Allows accessing parent directories
const filePath = path.join('./uploads', req.params.path);
// User requests: ../../sensitive/file.txt
```

✅ **Good:**
```javascript
// Validate path stays within upload directory
const filePath = path.resolve(
  path.join(uploadDir, filename)
);

if (!filePath.startsWith(uploadDir)) {
  throw new Error('Invalid path');
}
```

---

### **2. Secure File Deletion**

❌ **Bad:**
```javascript
// File data can be recovered with forensics
fs.unlinkSync(filePath);
```

✅ **Good:**
```javascript
// Overwrite file before deletion (for sensitive files)
const fileSize = fs.statSync(filePath).size;
const randomData = crypto.randomBytes(fileSize);
fs.writeFileSync(filePath, randomData);
fs.unlinkSync(filePath);
```

---

### **3. Disk Space Limits**

```javascript
// Prevent disk space exhaustion
const MAX_STORAGE_PER_USER = 5 * 1024 * 1024 * 1024; // 5GB

function checkStorageQuota(userId, fileSize) {
  const used = calculateUsedStorage(userId);
  const available = MAX_STORAGE_PER_USER - used;
  
  if (fileSize > available) {
    throw new Error('Storage quota exceeded');
  }
  
  return true;
}
```

---

## 🔐 **Data Protection**

### **1. Encryption (Optional)**

```javascript
// Encrypt sensitive files
const crypto = require('crypto');

function encryptFile(filePath, key) {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  const input = fs.createReadStream(filePath);
  const output = fs.createWriteStream(filePath + '.enc');
  
  input.pipe(cipher).pipe(output);
}

// Or use AES with IV
const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(password, salt, 32);
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv(algorithm, key, iv);
```

---

### **2. File Hash/Checksum**

```javascript
// Verify file integrity
const crypto = require('crypto');

function calculateFileHash(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  
  return new Promise((resolve, reject) => {
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// Store hash in database
// Compare on download to detect tampering
```

---

### **3. HTTPS Only (Production)**

```javascript
// In production, enforce HTTPS
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
};

https.createServer(options, app).listen(443);
```

---

## 🚨 **Malware & Virus Scanning**

### **Optional: ClamAV Integration**

```javascript
const NodeClam = require('clamscan');

const clamscan = new NodeClam().init({
  clamdscan: {
    host: 'localhost',
    port: 3310
  }
});

// Scan uploaded file
router.post('/upload', upload.single('file'), async (req, res) => {
  const { isInfected, viruses } = await clamscan.scanFile(
    req.file.path
  );
  
  if (isInfected) {
    // Delete file
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Malware detected' });
  }
  
  // Safe to use
});
```

---

## 📋 **Audit Logging**

### **Log All File Operations**

```javascript
const logger = require('./logger');

// Log file upload
router.post('/upload', upload.single('file'), (req, res) => {
  logger.info('File uploaded', {
    userId: req.user.id,
    filename: req.file.filename,
    size: req.file.size,
    mimeType: req.file.mimetype,
    ip: req.ip,
    timestamp: new Date()
  });
});

// Log file download
router.get('/:filename', auth, (req, res) => {
  logger.info('File downloaded', {
    userId: req.user.id,
    filename: req.params.filename,
    ip: req.ip,
    timestamp: new Date()
  });
});

// Log file deletion
router.delete('/:filename', auth, (req, res) => {
  logger.warn('File deleted', {
    userId: req.user.id,
    filename: req.params.filename,
    ip: req.ip,
    timestamp: new Date()
  });
});
```

---

## 🔄 **Rate Limiting**

### **Prevent Abuse**

```javascript
const rateLimit = require('express-rate-limit');

// Limit uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                    // 10 uploads per window
  message: 'Too many uploads, try again later'
});

// Limit downloads
const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 30,              // 30 downloads per minute
  skip: req => req.user.role === 'admin'
});

router.post('/upload', uploadLimiter, auth, (req, res) => {
  // ...
});

router.get('/:filename', downloadLimiter, auth, (req, res) => {
  // ...
});
```

---

## 📊 **Security Checklist**

Before production, verify:

- [ ] **File Types**: Only allow safe file types
- [ ] **File Size**: Enforce reasonable limits
- [ ] **Filenames**: Sanitize and validate
- [ ] **Path Traversal**: Prevent ../ attacks
- [ ] **Authentication**: Require valid JWT
- [ ] **Authorization**: Check user ownership
- [ ] **Directory Isolation**: Separate per user
- [ ] **HTTPS**: Use in production
- [ ] **Encryption**: For sensitive files
- [ ] **Audit Logging**: Log all operations
- [ ] **Rate Limiting**: Prevent abuse
- [ ] **Virus Scanning**: Optional but recommended
- [ ] **Backups**: Regular backups enabled
- [ ] **Monitoring**: Alert on suspicious activity
- [ ] **CORS**: Configure properly

---

## 🎯 **Compliance**

### **GDPR (EU)**
```javascript
// Right to be forgotten - delete user files
router.delete('/user/:userId', adminAuth, async (req, res) => {
  // Delete all files for user
  const userDir = path.join('./uploads', req.params.userId);
  fs.rmSync(userDir, { recursive: true });
  
  // Log deletion
  logger.warn('User data deleted', {
    userId: req.params.userId,
    timestamp: new Date()
  });
});
```

### **HIPAA (Healthcare)**
```javascript
// Encrypt healthcare files
// Maintain audit logs (7+ years)
// Restrict access (role-based)
// Secure deletion
```

### **Various Standards**
- **PCI-DSS**: For payment file uploads
- **SOC 2**: For access controls
- **ISO 27001**: For information security

---

## 🚨 **Incident Response**

### **Suspected Breach**

1. **Immediately:**
   - Stop accepting uploads
   - Review logs for suspicious activity
   - Identify affected files/users

2. **Within 24 hours:**
   - Backup affected files (for investigation)
   - Notify affected users
   - Document timeline

3. **Short term:**
   - Force password resets
   - Issue new tokens
   - Review access logs

4. **Long term:**
   - Security audit
   - Implement fixes
   - Staff training

---

## 📚 **References**

- [OWASP File Upload](https://owasp.org/www-community/attacks/Unrestricted_File_Upload)
- [CWE-434](https://cwe.mitre.org/data/definitions/434.html)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Phase 9 Security:** ✅ Best Practices Documented  
*Last Updated: Feb 19, 2026*

/**
 * Cloud Storage Service
 * خدمة تخزين الفيديو على السحابة (AWS S3 و Google Cloud)
 */

const AWS = require('aws-sdk');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CloudStorageService {
  constructor(config = {}) {
    // إعداد AWS S3
    if (config.awsAccessKeyId) {
      this.s3 = new AWS.S3({
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
        region: config.awsRegion || 'us-east-1',
      });
      this.s3BucketName = config.s3BucketName;
    }

    // إعداد Google Cloud Storage
    if (config.googleProjectId) {
      this.googleStorage = new Storage({
        projectId: config.googleProjectId,
        keyFilename: config.googleKeyPath,
      });
      this.googleBucketName = config.googleBucketName;
    }

    this.uploadDir = config.uploadDir || path.join(__dirname, '../../uploads');
    this.chunkSize = config.chunkSize || 5 * 1024 * 1024; // 5 MB
  }

  /**
   * رفع ملف على AWS S3
   */
  async uploadToS3(filePath, fileName, metadata = {}) {
    try {
      if (!this.s3) {
        throw new Error('AWS S3 لم يتم تكوينه');
      }

      const fileContent = fs.readFileSync(filePath);
      const fileSize = fs.statSync(filePath).size;

      const params = {
        Bucket: this.s3BucketName,
        Key: this.buildS3Key(fileName),
        Body: fileContent,
        ContentType: 'video/mp4',
        ServerSideEncryption: 'AES256',
        Metadata: {
          'camera-id': metadata.cameraId || 'unknown',
          'branch-id': metadata.branchId || 'unknown',
          'upload-date': new Date().toISOString(),
          'original-name': metadata.originalName || fileName,
        },
        TagSet: [
          { Key: 'environment', Value: 'production' },
          { Key: 'retention', Value: metadata.retention || '30days' },
        ],
      };

      // رفع متعدد الأجزاء للملفات الكبيرة
      if (fileSize > this.chunkSize) {
        return this.multipartUploadS3(filePath, params, metadata);
      }

      const result = await this.s3.upload(params).promise();

      return {
        success: true,
        provider: 'aws-s3',
        bucket: this.s3BucketName,
        key: params.Key,
        url: result.Location,
        size: fileSize,
        uploadedAt: new Date(),
        etag: result.ETag,
      };
    } catch (error) {
      console.error('❌ خطأ في رفع S3:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * رفع متعدد الأجزاء على S3
   */
  async multipartUploadS3(filePath, baseParams, metadata) {
    try {
      const fileSize = fs.statSync(filePath).size;
      const numChunks = Math.ceil(fileSize / this.chunkSize);

      // بدء الرفع متعدد الأجزاء
      const multipartUpload = await this.s3.createMultipartUpload(baseParams).promise();

      const uploadId = multipartUpload.UploadId;
      const parts = [];

      // رفع كل جزء
      for (let i = 0; i < numChunks; i++) {
        const start = i * this.chunkSize;
        const end = Math.min(start + this.chunkSize, fileSize);
        const chunk = fs
          .readFileSync(filePath, {
            encoding: null,
            flag: 'r',
          })
          .slice(start, end);

        const partParams = {
          Bucket: baseParams.Bucket,
          Key: baseParams.Key,
          PartNumber: i + 1,
          UploadId: uploadId,
          Body: chunk,
        };

        const result = await this.s3.uploadPart(partParams).promise();
        parts.push({
          ETag: result.ETag,
          PartNumber: i + 1,
        });

        // إرسال تحديث التقدم
        const progress = Math.round(((i + 1) / numChunks) * 100);
        console.log(`📤 تقدم الرفع: ${progress}%`);
      }

      // إكمال الرفع
      const completeParams = {
        Bucket: baseParams.Bucket,
        Key: baseParams.Key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      };

      const result = await this.s3.completeMultipartUpload(completeParams).promise();

      return {
        success: true,
        provider: 'aws-s3',
        bucket: baseParams.Bucket,
        key: baseParams.Key,
        url: result.Location,
        size: fileSize,
        uploadedAt: new Date(),
        etag: result.ETag,
      };
    } catch (error) {
      console.error('❌ خطأ في الرفع متعدد الأجزاء:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * رفع ملف على Google Cloud Storage
   */
  async uploadToGCS(filePath, fileName, metadata = {}) {
    try {
      if (!this.googleStorage) {
        throw new Error('Google Cloud Storage لم يتم تكوينه');
      }

      const bucket = this.googleStorage.bucket(this.googleBucketName);
      const file = bucket.file(this.buildGCSKey(fileName));

      const options = {
        metadata: {
          metadata: {
            cameraId: metadata.cameraId || 'unknown',
            branchId: metadata.branchId || 'unknown',
            uploadDate: new Date().toISOString(),
            originalName: metadata.originalName || fileName,
          },
        },
      };

      await bucket.upload(filePath, options);

      const publicUrl = `https://storage.googleapis.com/${this.googleBucketName}/${this.buildGCSKey(fileName)}`;
      const fileSize = fs.statSync(filePath).size;

      return {
        success: true,
        provider: 'google-cloud',
        bucket: this.googleBucketName,
        key: this.buildGCSKey(fileName),
        url: publicUrl,
        size: fileSize,
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error('❌ خطأ في رفع GCS:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * تحميل ملف من S3
   */
  async downloadFromS3(key, outputPath) {
    try {
      const params = {
        Bucket: this.s3BucketName,
        Key: key,
      };

      const data = await this.s3.getObject(params).promise();

      fs.writeFileSync(outputPath, data.Body);

      return {
        success: true,
        path: outputPath,
        size: data.Body.length,
      };
    } catch (error) {
      console.error('❌ خطأ في تحميل S3:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * حذف ملف من S3
   */
  async deleteFromS3(key) {
    try {
      const params = {
        Bucket: this.s3BucketName,
        Key: key,
      };

      await this.s3.deleteObject(params).promise();

      return {
        success: true,
        message: `تم حذف الملف ${key}`,
      };
    } catch (error) {
      console.error('❌ خطأ في حذف S3:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * حذف ملف من GCS
   */
  async deleteFromGCS(key) {
    try {
      const bucket = this.googleStorage.bucket(this.googleBucketName);
      await bucket.file(key).delete();

      return {
        success: true,
        message: `تم حذف الملف ${key}`,
      };
    } catch (error) {
      console.error('❌ خطأ في حذف GCS:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * الحصول على معلومات الملف من S3
   */
  async getS3FileInfo(key) {
    try {
      const params = {
        Bucket: this.s3BucketName,
        Key: key,
      };

      const data = await this.s3.headObject(params).promise();

      return {
        success: true,
        info: {
          key,
          size: data.ContentLength,
          lastModified: data.LastModified,
          etag: data.ETag,
          contentType: data.ContentType,
          metadata: data.Metadata,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * إنشاء رابط مؤقت للوصول
   */
  async getPresignedUrl(key, expiresIn = 3600) {
    try {
      const params = {
        Bucket: this.s3BucketName,
        Key: key,
        Expires: expiresIn,
      };

      const url = this.s3.getSignedUrl('getObject', params);

      return {
        success: true,
        url,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * قائمة الملفات في S3
   */
  async listS3Files(prefix = '', limit = 100) {
    try {
      const params = {
        Bucket: this.s3BucketName,
        Prefix: prefix,
        MaxKeys: limit,
      };

      const data = await this.s3.listObjectsV2(params).promise();

      const files =
        data.Contents?.map(item => ({
          key: item.Key,
          size: item.Size,
          lastModified: item.LastModified,
          etag: item.ETag,
        })) || [];

      return {
        success: true,
        files,
        isTruncated: data.IsTruncated,
        nextToken: data.NextContinuationToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * الحصول على إحصائيات الدلو
   */
  async getBucketStats() {
    try {
      const params = {
        Bucket: this.s3BucketName,
      };

      // الحصول على حجم الدلو (يتطلب CloudWatch)
      const acl = await this.s3.getBucketAcl(params).promise();
      const versioning = await this.s3.getBucketVersioning(params).promise();

      return {
        success: true,
        stats: {
          bucket: this.s3BucketName,
          versioning: versioning.Status || 'Disabled',
          owner: acl.Owner.DisplayName,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * بناء مفتاح S3 بناءً على الهيكل
   */
  buildS3Key(fileName) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `recordings/${year}/${month}/${day}/${fileName}`;
  }

  /**
   * بناء مفتاح GCS بناءً على الهيكل
   */
  buildGCSKey(fileName) {
    return this.buildS3Key(fileName); // نفس الهيكل
  }
}

module.exports = new CloudStorageService();

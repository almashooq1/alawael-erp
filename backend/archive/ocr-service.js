/**
 * OCR Service - خدمة التعرف الضوئي على الحروف
 * Optical Character Recognition for Archive Documents
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

/**
 * OCR Configuration
 */
const ocrConfig = {
  // Provider
  provider: process.env.OCR_PROVIDER || 'tesseract', // tesseract, google, azure, aws
  
  // Languages
  languages: ['ara', 'eng'],
  
  // Output formats
  outputFormat: 'text', // text, hocr, pdf
  
  // Processing
  batchSize: 5,
  timeout: 60000, // 1 minute
  
  // Confidence threshold
  minConfidence: 0.6,
  
  // Paths
  tesseractPath: process.env.TESSERACT_PATH || 'tesseract',
  tempPath: process.env.OCR_TEMP_PATH || './storage/temp/ocr',
};

/**
 * OCR Job Schema (for MongoDB)
 */
const OCRJobSchema = {
  documentId: { type: 'ObjectId', required: true },
  status: { type: 'String', enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  
  // Input
  inputPath: { type: 'String', required: true },
  inputFile: { type: 'String', required: true },
  
  // Output
  outputPath: String,
  extractedText: String,
  confidence: Number,
  pages: [{
    pageNumber: Number,
    text: String,
    confidence: Number,
    regions: [{
      x: Number,
      y: Number,
      width: Number,
      height: Number,
      text: String,
      confidence: Number,
    }],
  }],
  
  // Processing info
  provider: String,
  processingTime: Number,
  error: String,
  
  // Timestamps
  createdAt: { type: 'Date', default: Date.now },
  startedAt: Date,
  completedAt: Date,
};

/**
 * OCR Service Class
 */
class OCRService {
  constructor() {
    this.config = ocrConfig;
    this.jobQueue = [];
    this.isProcessing = false;
    this.providers = new Map();
  }
  
  /**
   * Initialize service
   */
  async initialize() {
    // Ensure temp directory exists
    await fs.mkdir(this.config.tempPath, { recursive: true });
    
    // Register providers
    this.registerProviders();
    
    console.log('✅ OCR Service initialized');
  }
  
  /**
   * Register OCR providers
   */
  registerProviders() {
    // Tesseract (local)
    this.registerProvider('tesseract', {
      process: this.processWithTesseract.bind(this),
      languages: ['ara', 'eng', 'fra', 'deu', 'spa'],
    });
    
    // Google Vision (cloud)
    this.registerProvider('google', {
      process: this.processWithGoogleVision.bind(this),
      languages: ['ar', 'en', 'fr', 'de', 'es'],
    });
    
    // Azure Computer Vision (cloud)
    this.registerProvider('azure', {
      process: this.processWithAzure.bind(this),
      languages: ['ar', 'en', 'fr', 'de', 'es'],
    });
    
    // AWS Textract (cloud)
    this.registerProvider('aws', {
      process: this.processWithAWS.bind(this),
      languages: ['ar', 'en'],
    });
  }
  
  /**
   * Register provider
   */
  registerProvider(name, config) {
    this.providers.set(name, config);
  }
  
  /**
   * Process document with OCR
   */
  async processDocument(documentPath, options = {}) {
    const jobId = `ocr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const provider = options.provider || this.config.provider;
    
    const job = {
      id: jobId,
      documentPath,
      status: 'pending',
      provider,
      createdAt: new Date(),
      options: {
        languages: options.languages || this.config.languages,
        outputFormat: options.outputFormat || this.config.outputFormat,
      },
    };
    
    // Add to queue
    this.jobQueue.push(job);
    
    // Process queue
    this.processQueue();
    
    return job;
  }
  
  /**
   * Process queue
   */
  async processQueue() {
    if (this.isProcessing || this.jobQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift();
      
      try {
        await this.executeJob(job);
      } catch (error) {
        console.error(`OCR Job ${job.id} failed:`, error.message);
        job.status = 'failed';
        job.error = error.message;
      }
    }
    
    this.isProcessing = false;
  }
  
  /**
   * Execute OCR job
   */
  async executeJob(job) {
    job.status = 'processing';
    job.startedAt = new Date();
    
    const provider = this.providers.get(job.provider);
    if (!provider) {
      throw new Error(`OCR provider '${job.provider}' not found`);
    }
    
    const result = await provider.process(job.documentPath, job.options);
    
    job.status = 'completed';
    job.completedAt = new Date();
    job.processingTime = job.completedAt - job.startedAt;
    job.extractedText = result.text;
    job.confidence = result.confidence;
    job.pages = result.pages;
    
    return job;
  }
  
  /**
   * Process with Tesseract (local)
   */
  async processWithTesseract(filePath, options) {
    const outputPath = path.join(this.config.tempPath, `ocr-${Date.now()}`);
    
    return new Promise((resolve, reject) => {
      const langParam = options.languages.join('+');
      
      const args = [
        filePath,
        outputPath,
        '-l', langParam,
        '--oem', '3',
        '--psm', '3',
      ];
      
      if (options.outputFormat === 'hocr') {
        args.push('hocr');
      } else {
        args.push(options.outputFormat || 'txt');
      }
      
      const tesseract = spawn(this.config.tesseractPath, args);
      
      let stdout = '';
      let stderr = '';
      
      tesseract.stdout.on('data', (data) => { stdout += data.toString(); });
      tesseract.stderr.on('data', (data) => { stderr += data.toString(); });
      
      tesseract.on('close', async (code) => {
        if (code !== 0) {
          return reject(new Error(`Tesseract exited with code ${code}: ${stderr}`));
        }
        
        try {
          // Read output file
          const outputFile = `${outputPath}.${options.outputFormat || 'txt'}`;
          const text = await fs.readFile(outputFile, 'utf8');
          
          // Cleanup
          await fs.unlink(outputFile).catch(() => {});
          
          resolve({
            text: text.trim(),
            confidence: 0.85, // Tesseract doesn't provide overall confidence
            pages: [{
              pageNumber: 1,
              text: text.trim(),
              confidence: 0.85,
            }],
          });
        } catch (error) {
          reject(error);
        }
      });
      
      tesseract.on('error', (error) => {
        reject(new Error(`Failed to start Tesseract: ${error.message}`));
      });
      
      // Set timeout
      setTimeout(() => {
        tesseract.kill();
        reject(new Error('OCR processing timeout'));
      }, this.config.timeout);
    });
  }
  
  /**
   * Process with Google Vision API
   */
  async processWithGoogleVision(filePath, options) {
    // Placeholder for Google Vision API integration
    // Would require @google-cloud/vision package
    
    const text = 'Google Vision OCR result placeholder';
    
    return {
      text,
      confidence: 0.95,
      pages: [{
        pageNumber: 1,
        text,
        confidence: 0.95,
      }],
    };
  }
  
  /**
   * Process with Azure Computer Vision
   */
  async processWithAzure(filePath, options) {
    // Placeholder for Azure Computer Vision integration
    // Would require @azure/cognitiveservices-computervision package
    
    const text = 'Azure OCR result placeholder';
    
    return {
      text,
      confidence: 0.92,
      pages: [{
        pageNumber: 1,
        text,
        confidence: 0.92,
      }],
    };
  }
  
  /**
   * Process with AWS Textract
   */
  async processWithAWS(filePath, options) {
    // Placeholder for AWS Textract integration
    // Would require aws-sdk package
    
    const text = 'AWS Textract OCR result placeholder';
    
    return {
      text,
      confidence: 0.93,
      pages: [{
        pageNumber: 1,
        text,
        confidence: 0.93,
      }],
    };
  }
  
  /**
   * Extract text from PDF
   */
  async extractFromPDF(filePath, options = {}) {
    // For PDFs, we might need to convert to images first
    // then process each page
    
    const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
    
    const data = await fs.readFile(filePath);
    const pdf = await pdfjs.getDocument(data).promise;
    
    const pages = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const text = textContent.items.map(item => item.str).join(' ');
      
      pages.push({
        pageNumber: i,
        text,
        confidence: 1.0, // Direct text extraction has high confidence
      });
    }
    
    const fullText = pages.map(p => p.text).join('\n\n');
    
    return {
      text: fullText,
      confidence: 1.0,
      pages,
    };
  }
  
  /**
   * Batch process documents
   */
  async batchProcess(filePaths, options = {}) {
    const results = [];
    const batchSize = options.batchSize || this.config.batchSize;
    
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(filePath => this.processDocument(filePath, options))
      );
      
      results.push(...batchResults);
    }
    
    return results;
  }
  
  /**
   * Get job status
   */
  getJobStatus(jobId) {
    // In a real implementation, this would query the database
    return this.jobQueue.find(j => j.id === jobId) || null;
  }
  
  /**
   * Cancel job
   */
  cancelJob(jobId) {
    const index = this.jobQueue.findIndex(j => j.id === jobId);
    if (index !== -1) {
      const job = this.jobQueue[index];
      if (job.status === 'pending') {
        this.jobQueue.splice(index, 1);
        return true;
      }
    }
    return false;
  }
  
  /**
   * Extract specific regions
   */
  async extractRegions(filePath, regions, options = {}) {
    // Extract text from specific regions of an image
    const fullResult = await this.processDocument(filePath, options);
    
    // Wait for completion (simplified)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const extractedRegions = regions.map(region => ({
      ...region,
      extractedText: '', // Would contain text from that region
      confidence: 0.8,
    }));
    
    return extractedRegions;
  }
  
  /**
   * Detect language
   */
  async detectLanguage(text) {
    // Simple language detection based on character patterns
    const arabicPattern = /[\u0600-\u06FF]/;
    const englishPattern = /[a-zA-Z]/;
    
    const arabicChars = (text.match(arabicPattern) || []).length;
    const englishChars = (text.match(englishPattern) || []).length;
    
    const total = arabicChars + englishChars;
    if (total === 0) return 'unknown';
    
    if (arabicChars > englishChars) return 'ar';
    if (englishChars > arabicChars) return 'en';
    return 'mixed';
  }
  
  /**
   * Preprocess image for better OCR
   */
  async preprocessImage(imagePath, options = {}) {
    // Image preprocessing for better OCR results
    // Would use sharp or jimp for image manipulation
    
    const preprocessedPath = path.join(
      this.config.tempPath,
      `preprocessed-${Date.now()}${path.extname(imagePath)}`
    );
    
    // Placeholder - would implement actual preprocessing:
    // - Convert to grayscale
    // - Increase contrast
    // - Remove noise
    // - Deskew
    // - Binarization
    
    await fs.copyFile(imagePath, preprocessedPath);
    
    return preprocessedPath;
  }
  
  /**
   * Get statistics
   */
  getStatistics() {
    const completed = this.jobQueue.filter(j => j.status === 'completed').length;
    const failed = this.jobQueue.filter(j => j.status === 'failed').length;
    const pending = this.jobQueue.filter(j => j.status === 'pending').length;
    const processing = this.jobQueue.filter(j => j.status === 'processing').length;
    
    return {
      total: this.jobQueue.length,
      completed,
      failed,
      pending,
      processing,
      successRate: this.jobQueue.length > 0 
        ? (completed / (completed + failed)) * 100 
        : 0,
    };
  }
}

// Singleton instance
const ocrService = new OCRService();

/**
 * OCR Middleware for Express
 */
function ocrMiddleware(options = {}) {
  return async (req, res, next) => {
    if (!req.file) {
      return next();
    }
    
    // Check if file type is supported
    const supportedTypes = ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'];
    if (!supportedTypes.includes(req.file.mimetype)) {
      return next();
    }
    
    try {
      const result = await ocrService.processDocument(req.file.path, {
        languages: options.languages || ['ara', 'eng'],
      });
      
      req.ocrResult = result;
      next();
    } catch (error) {
      console.error('OCR middleware error:', error.message);
      next();
    }
  };
}

module.exports = {
  OCRService,
  ocrService,
  ocrConfig,
  ocrMiddleware,
  OCRJobSchema,
};
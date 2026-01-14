/**
 * Add Document Sample Data
 * نص البرنامج لإضافة بيانات عينة للمستندات
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const Document = require('./backend/models/Document');

// الاتصال بقاعدة البيانات
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael');
    console.log('✓ تم الاتصال بقاعدة البيانات');
  } catch (error) {
    console.error('✗ خطأ في الاتصال بقاعدة البيانات:', error);
    process.exit(1);
  }
};

// بيانات عينة
const sampleDocuments = [
  {
    fileName: 'sample-1.pdf',
    originalFileName: 'سياسة الموارد البشرية.pdf',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    fileSize: 2048000,
    filePath: './uploads/sample-1.pdf',
    title: 'سياسة الموارد البشرية',
    description: 'وثيقة تتضمن السياسات الأساسية لإدارة الموارد البشرية والعاملين',
    category: 'سياسات',
    tags: ['HR', 'سياسات', 'موارد بشرية'],
    folder: 'root',
    uploadedBy: new mongoose.Types.ObjectId(),
    uploadedByName: 'مدير النظام',
    uploadedByEmail: 'admin@alawael.com',
    isPublic: false,
    version: 1,
    viewCount: 5,
    downloadCount: 2,
  },
  {
    fileName: 'sample-2.docx',
    originalFileName: 'عقد العمل الموحد.docx',
    fileType: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 512000,
    filePath: './uploads/sample-2.docx',
    title: 'عقد العمل الموحد',
    description: 'نموذج موحد لعقود العمل يتوافق مع القانون العام',
    category: 'عقود',
    tags: ['عقود', 'عمل', 'قانوني'],
    folder: 'root',
    uploadedBy: new mongoose.Types.ObjectId(),
    uploadedByName: 'قسم القانون',
    uploadedByEmail: 'legal@alawael.com',
    isPublic: true,
    version: 2,
    viewCount: 15,
    downloadCount: 8,
  },
  {
    fileName: 'sample-3.xlsx',
    originalFileName: 'تقرير الأداء الشهري.xlsx',
    fileType: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileSize: 1024000,
    filePath: './uploads/sample-3.xlsx',
    title: 'تقرير الأداء الشهري',
    description: 'تقرير شامل عن أداء القسم خلال الشهر',
    category: 'تقارير',
    tags: ['تقارير', 'أداء', 'شهري'],
    folder: 'root',
    uploadedBy: new mongoose.Types.ObjectId(),
    uploadedByName: 'مدير الأداء',
    uploadedByEmail: 'performance@alawael.com',
    isPublic: false,
    version: 1,
    viewCount: 20,
    downloadCount: 12,
  },
  {
    fileName: 'sample-4.pdf',
    originalFileName: 'برنامج التدريب السنوي.pdf',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    fileSize: 3072000,
    filePath: './uploads/sample-4.pdf',
    title: 'برنامج التدريب السنوي',
    description: 'خطة التدريب الشاملة للعام الجاري',
    category: 'تدريب',
    tags: ['تدريب', 'تطوير', 'سنوي'],
    folder: 'root',
    uploadedBy: new mongoose.Types.ObjectId(),
    uploadedByName: 'إدارة التدريب',
    uploadedByEmail: 'training@alawael.com',
    isPublic: false,
    version: 1,
    viewCount: 8,
    downloadCount: 3,
  },
  {
    fileName: 'sample-5.xlsx',
    originalFileName: 'الميزانية السنوية 2024.xlsx',
    fileType: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileSize: 2560000,
    filePath: './uploads/sample-5.xlsx',
    title: 'الميزانية السنوية 2024',
    description: 'تفاصيل الميزانية المقررة للعام المالي 2024',
    category: 'مالي',
    tags: ['مالية', 'ميزانية', '2024'],
    folder: 'root',
    uploadedBy: new mongoose.Types.ObjectId(),
    uploadedByName: 'المالية والمراقبة',
    uploadedByEmail: 'finance@alawael.com',
    isPublic: false,
    version: 1,
    viewCount: 25,
    downloadCount: 10,
  },
];

// إضافة البيانات
const addDocuments = async () => {
  try {
    // حذف البيانات القديمة
    await Document.deleteMany({});
    console.log('تم مسح البيانات القديمة');

    // إضافة البيانات الجديدة
    const insertedDocs = await Document.insertMany(sampleDocuments);
    console.log(`✓ تم إضافة ${insertedDocs.length} مستند عينة`);

    // عرض الإحصائيات
    const stats = await Document.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
        },
      },
    ]);

    console.log('\n📊 الإحصائيات:');
    stats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} مستندات، ${(stat.totalSize / 1024 / 1024).toFixed(2)} MB`);
    });

    console.log('\n✓ تم إضافة البيانات بنجاح');
    process.exit(0);
  } catch (error) {
    console.error('✗ خطأ في إضافة البيانات:', error);
    process.exit(1);
  }
};

// تنفيذ البرنامج
connectDB().then(() => addDocuments());

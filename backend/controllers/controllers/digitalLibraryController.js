const DigitalLibrary = require('../models/DigitalLibrary');
const { sendSuccess, sendError } = require('../utils/responseHelpers');

// Upload resource to library
exports.uploadResource = async (req, res) => {
  try {
    const {
      title,
      description,
      resourceType,
      disabilityCategories,
      author,
      fileUrl,
      fileType,
      fileSize,
      language,
      publicationDate,
      publisher,
      categories,
      tags,
      keywords,
      accessibilityFormat,
      license,
    } = req.body;

    if (!title || !description || !resourceType || !fileUrl || !fileType) {
      return sendError(res, 'جميع الحقول المطلوبة يجب أن تكون مملوءة', 400);
    }

    const resource = await DigitalLibrary.create({
      title,
      description,
      resourceType,
      disabilityCategories,
      author,
      uploader: req.user._id,
      fileUrl,
      fileType,
      fileSize,
      language,
      publicationDate,
      publisher,
      categories,
      tags,
      keywords,
      accessibilityFormat,
      license,
      status: 'pending_review',
    });

    await resource.populate('uploader', 'name email');

    sendSuccess(res, resource, 'تم تحميل المورد بنجاح', 201);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get all resources (with filters)
exports.getAllResources = async (req, res) => {
  try {
    const { page = 1, limit = 15, resourceType, category, language, search } = req.query;
    const skip = (page - 1) * limit;

    let query = { isPublic: true, status: 'approved' };

    if (resourceType) {
      query.resourceType = resourceType;
    }

    if (category) {
      query.categories = { $in: [category] };
    }

    if (language) {
      query.language = language;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
        { keywords: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const resources = await DigitalLibrary.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('uploader', 'name email');

    const total = await DigitalLibrary.countDocuments(query);

    sendSuccess(
      res,
      {
        resources,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      },
      'تم جلب الموارد بنجاح'
    );
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Search resources
exports.searchResources = async (req, res) => {
  try {
    const { q, type, category, language, limit = 20 } = req.query;

    if (!q) {
      return sendError(res, 'يجب تقديم كلمة البحث', 400);
    }

    const filters = { resourceType: type, disabilityCategories: category, language, limit };

    const results = await DigitalLibrary.searchResources(q, filters);

    sendSuccess(res, results, 'تم البحث بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get resources by category
exports.getResourcesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 15 } = req.query;

    const resources = await DigitalLibrary.getByCategory(category, parseInt(limit));

    sendSuccess(res, resources, `تم جلب الموارد للفئة: ${category}`);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get single resource
exports.getResourceById = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await DigitalLibrary.findById(id).populate('uploader', 'name email');

    if (!resource) {
      return sendError(res, 'المورد غير موجود', 404);
    }

    // Increment views
    resource.views += 1;
    await resource.save();

    sendSuccess(res, resource, 'تم جلب المورد بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Download resource
exports.downloadResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await DigitalLibrary.findById(id);

    if (!resource) {
      return sendError(res, 'المورد غير موجود', 404);
    }

    // Increment downloads
    await resource.incrementDownloads();

    // Return download URL or redirect
    sendSuccess(res, { downloadUrl: resource.fileUrl }, 'تم بدء التنزيل');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Add review to resource
exports.addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return sendError(res, 'التقييم يجب أن يكون بين 1 و 5', 400);
    }

    const resource = await DigitalLibrary.findById(id);

    if (!resource) {
      return sendError(res, 'المورد غير موجود', 404);
    }

    await resource.addReview(req.user._id, rating, comment);

    sendSuccess(res, resource.reviews[resource.reviews.length - 1], 'تم إضافة التقييم بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Update resource
exports.updateResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await DigitalLibrary.findById(id);

    if (!resource) {
      return sendError(res, 'المورد غير موجود', 404);
    }

    // Check authorization
    if (resource.uploader.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendError(res, 'لا تملك صلاحية لتعديل هذا المورد', 403);
    }

    const updatedResource = await DigitalLibrary.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    sendSuccess(res, updatedResource, 'تم تحديث المورد بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Approve resource (admin only)
exports.approveResource = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return sendError(res, 'لا تملك صلاحية الموافقة على الموارد', 403);
    }

    const resource = await DigitalLibrary.findById(id);

    if (!resource) {
      return sendError(res, 'المورد غير موجود', 404);
    }

    resource.status = 'approved';
    resource.isPublic = true;
    await resource.save();

    sendSuccess(res, resource, 'تمت الموافقة على المورد بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Delete resource
exports.deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await DigitalLibrary.findById(id);

    if (!resource) {
      return sendError(res, 'المورد غير موجود', 404);
    }

    // Check authorization
    if (resource.uploader.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendError(res, 'لا تملك صلاحية لحذف هذا المورد', 403);
    }

    await DigitalLibrary.findByIdAndDelete(id);

    sendSuccess(res, null, 'تم حذف المورد بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get library statistics
exports.getLibraryStatistics = async (req, res) => {
  try {
    const resources = await DigitalLibrary.find({ isPublic: true, status: 'approved' });

    const stats = {
      totalResources: resources.length,
      byType: {},
      byLanguage: {},
      totalViews: 0,
      totalDownloads: 0,
      averageRating: 0,
    };

    const types = [
      'book',
      'guide',
      'article',
      'research_paper',
      'case_study',
      'toolkit',
      'template',
      'tool',
      'research_statistics',
    ];
    const languages = ['ar', 'en', 'fr', 'multilingual'];

    for (const type of types) {
      stats.byType[type] = resources.filter(r => r.resourceType === type).length;
    }

    for (const lang of languages) {
      stats.byLanguage[lang] = resources.filter(r => r.language === lang).length;
    }

    stats.totalViews = resources.reduce((sum, r) => sum + r.views, 0);
    stats.totalDownloads = resources.reduce((sum, r) => sum + r.downloads, 0);

    if (resources.length > 0) {
      stats.averageRating =
        Math.round(
          (resources.reduce((sum, r) => sum + r.rating.average, 0) / resources.length) * 10
        ) / 10;
    }

    sendSuccess(res, stats, 'تم جلب إحصائيات المكتبة بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

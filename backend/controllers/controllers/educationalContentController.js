const EducationalContent = require('../models/EducationalContent');
const { sendSuccess, sendError } = require('../utils/responseHelpers');

// Create educational content
exports.createContent = async (req, res) => {
  try {
    const {
      title,
      description,
      contentType,
      disabilityCategory,
      contentUrl,
      level,
      tags,
      accessibilityFeatures,
    } = req.body;

    if (!title || !description || !contentType || !disabilityCategory || !contentUrl) {
      return sendError(res, 'جميع الحقول المطلوبة يجب أن تكون مملوءة', 400);
    }

    const content = await EducationalContent.create({
      title,
      description,
      contentType,
      disabilityCategory,
      contentUrl,
      level,
      tags,
      accessibilityFeatures,
      author: req.user._id,
      status: 'draft',
    });

    sendSuccess(res, content, 'تم إنشاء المحتوى بنجاح', 201);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get all educational content (paginated)
exports.getAllContent = async (req, res) => {
  try {
    const { page = 1, limit = 10, disabilityCategory, contentType, search } = req.query;
    const skip = (page - 1) * limit;

    let query = { isPublished: true };

    if (disabilityCategory && disabilityCategory !== 'all') {
      query.disabilityCategory = disabilityCategory;
    }

    if (contentType) {
      query.contentType = contentType;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const content = await EducationalContent.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('author', 'name email');

    const total = await EducationalContent.countDocuments(query);

    sendSuccess(
      res,
      {
        content,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      },
      'تم جلب المحتوى بنجاح'
    );
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get content by category
exports.getContentByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20 } = req.query;

    if (
      ![
        'visual',
        'hearing',
        'mobility',
        'intellectual',
        'psychosocial',
        'multiple',
        'general',
      ].includes(category)
    ) {
      return sendError(res, 'فئة غير صحيحة', 400);
    }

    const content = await EducationalContent.getByCategory(category, parseInt(limit));

    sendSuccess(res, content, `تم جلب المحتوى للفئة: ${category}`);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get single content
exports.getContentById = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await EducationalContent.findById(id).populate('author', 'name email');

    if (!content) {
      return sendError(res, 'المحتوى غير موجود', 404);
    }

    // Increment views
    await content.incrementViews();

    sendSuccess(res, content, 'تم جلب المحتوى بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Update content
exports.updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await EducationalContent.findById(id);

    if (!content) {
      return sendError(res, 'المحتوى غير موجود', 404);
    }

    // Check authorization
    if (content.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendError(res, 'لا تملك صلاحية لتعديل هذا المحتوى', 403);
    }

    const updatedContent = await EducationalContent.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    sendSuccess(res, updatedContent, 'تم تحديث المحتوى بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Publish content
exports.publishContent = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await EducationalContent.findById(id);

    if (!content) {
      return sendError(res, 'المحتوى غير موجود', 404);
    }

    // Check authorization
    if (content.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendError(res, 'لا تملك صلاحية لنشر هذا المحتوى', 403);
    }

    content.isPublished = true;
    content.publishedAt = new Date();
    content.status = 'approved';
    await content.save();

    sendSuccess(res, content, 'تم نشر المحتوى بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Delete content
exports.deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await EducationalContent.findById(id);

    if (!content) {
      return sendError(res, 'المحتوى غير موجود', 404);
    }

    // Check authorization
    if (content.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendError(res, 'لا تملك صلاحية لحذف هذا المحتوى', 403);
    }

    await EducationalContent.findByIdAndDelete(id);

    sendSuccess(res, null, 'تم حذف المحتوى بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get popular content
exports.getPopularContent = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const content = await EducationalContent.getPopularContent(parseInt(limit));

    sendSuccess(res, content, 'تم جلب المحتوى الشهير بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Rate content
exports.rateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return sendError(res, 'التقييم يجب أن يكون بين 1 و 5', 400);
    }

    const content = await EducationalContent.findById(id);

    if (!content) {
      return sendError(res, 'المحتوى غير موجود', 404);
    }

    // Update rating
    const oldAverage = content.rating.average;
    const newAverage = (oldAverage * content.rating.count + rating) / (content.rating.count + 1);

    content.rating.average = Math.round(newAverage * 10) / 10;
    content.rating.count += 1;

    await content.save();

    sendSuccess(res, content.rating, 'تم حفظ التقييم بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get content statistics
exports.getContentStatistics = async (req, res) => {
  try {
    const stats = {
      totalContent: await EducationalContent.countDocuments(),
      publishedContent: await EducationalContent.countDocuments({ isPublished: true }),
      byType: {},
      byCategory: {},
      totalViews: 0,
    };

    const contentTypes = ['article', 'video', 'audio', 'pdf', 'infographic', 'interactive'];
    const categories = [
      'visual',
      'hearing',
      'mobility',
      'intellectual',
      'psychosocial',
      'multiple',
      'general',
    ];

    for (const type of contentTypes) {
      stats.byType[type] = await EducationalContent.countDocuments({ contentType: type });
    }

    for (const category of categories) {
      stats.byCategory[category] = await EducationalContent.countDocuments({
        disabilityCategory: category,
      });
    }

    const allContent = await EducationalContent.find();
    stats.totalViews = allContent.reduce((sum, c) => sum + c.views, 0);

    sendSuccess(res, stats, 'تم جلب الإحصائيات بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

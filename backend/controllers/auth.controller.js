/* eslint-disable no-unused-vars */
/**
 * وحدة تحكم المصادقة
 * نظام الأصول ERP - الإصدار 2.0.0
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../utils/logger');
const { jwtSecret } = require('../config/secrets');
const { sendEmail, emailTemplates, transporter } = require('../services/emailService');

// تكوين JWT
const JWT_SECRET = jwtSecret;
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * تسجيل الدخول
 * @route POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // التحقق من البيانات
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال اسم المستخدم وكلمة المرور',
      });
    }

    // البحث عن المستخدم باسم المستخدم أو البريد الإلكتروني
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      });
    }

    // التحقق من حالة المستخدم
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'هذا الحساب غير مفعل',
      });
    }

    // التحقق من كلمة المرور
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      });
    }

    // إنشاء رمز JWT
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    // تحديث آخر تسجيل دخول
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          name: user.fullName,
          role: user.role,
          branch: user.branch,
        },
      },
    });
  } catch (error) {
    logger.error('خطأ في تسجيل الدخول:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * تسجيل مستخدم جديد
 * @route POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { username, email, password, name, role, branch } = req.body;

    // التحقق من البيانات المطلوبة
    if (!username || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة',
      });
    }

    // التحقق من عدم وجود المستخدم
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل',
      });
    }

    // إنشاء المستخدم الجديد — never allow role escalation from user input
    const ALLOWED_SELF_REGISTER_ROLES = ['employee', 'parent', 'student'];
    const safeRole = ALLOWED_SELF_REGISTER_ROLES.includes(role) ? role : 'employee';
    const user = new User({
      username,
      email,
      password,
      fullName: name,
      role: safeRole,
      branch,
      isActive: true,
    });

    await user.save();

    // إنشاء رمز JWT
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          name: user.fullName,
          role: user.role,
          branch: user.branch,
        },
      },
    });
  } catch (error) {
    logger.error('خطأ في التسجيل:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * الحصول على المستخدم الحالي
 * @route GET /api/auth/me
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('branch', 'name code')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('خطأ في الحصول على المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * تسجيل الخروج
 * @route POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح',
    });
  } catch (error) {
    logger.error('خطأ في تسجيل الخروج:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * تحديث كلمة المرور
 * @route PUT /api/auth/password
 */
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال كلمة المرور الحالية والجديدة',
      });
    }

    const user = await User.findById(req.user.id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة',
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'تم تحديث كلمة المرور بنجاح',
    });
  } catch (error) {
    logger.error('خطأ في تحديث كلمة المرور:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * طلب إعادة تعيين كلمة المرور
 * @route POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Always return the same response to prevent user enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
      });
    }

    // إنشاء رمز إعادة التعيين
    const resetToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

    // حفظ الرمز في المستخدم
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // ساعة واحدة
    await user.save();

    // إرسال بريد إعادة تعيين كلمة المرور
    try {
      const template = emailTemplates.passwordReset(user, resetToken);
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"نظام الأوائل ERP" <${process.env.EMAIL_USER}>`,
        to: user.email,
        ...template,
      });
      logger.info(`Password reset email sent to ${user.email}`);
    } catch (emailErr) {
      logger.error('Failed to send password reset email:', emailErr.message);
      // لا نفشل العملية - الرمز محفوظ ويمكن استخدامه
    }

    res.json({
      success: true,
      message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
    });
  } catch (error) {
    logger.error('خطأ في طلب إعادة تعيين كلمة المرور:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * إعادة تعيين كلمة المرور
 * @route POST /api/auth/reset-password/:token
 */
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Validate password strength
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
      });
    }

    // التحقق من الرمز
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      '+resetPasswordToken +resetPasswordExpires'
    );

    if (!user || user.resetPasswordToken !== token) {
      return res.status(400).json({
        success: false,
        message: 'رمز إعادة التعيين غير صالح أو منتهي الصلاحية',
      });
    }

    // تحديث كلمة المرور
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'تم إعادة تعيين كلمة المرور بنجاح',
    });
  } catch (error) {
    logger.error('خطأ في إعادة تعيين كلمة المرور:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * تجديد الرمز
 * @route POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود أو غير مفعل',
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    res.json({
      success: true,
      data: { token },
    });
  } catch (error) {
    logger.error('خطأ في تجديد الرمز:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

module.exports = {
  login,
  register,
  getCurrentUser,
  logout,
  updatePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
};

const SubscriptionPlan = require('../models/SubscriptionPlan');
const UserSubscription = require('../models/UserSubscription');
const { sendSuccess, sendError } = require('../utils/responseHelpers');

// Create subscription plan (admin only)
exports.createPlan = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return sendError(res, 'لا تملك صلاحية إنشاء خطط الاشتراك', 403);
    }

    const { name, description, price, features, limitations, disabilityFocus } = req.body;

    if (!name || !description) {
      return sendError(res, 'اسم الخطة والوصف مطلوبان', 400);
    }

    const plan = await SubscriptionPlan.create({
      name,
      description,
      price,
      features,
      limitations,
      disabilityFocus,
    });

    sendSuccess(res, plan, 'تم إنشاء خطة الاشتراك بنجاح', 201);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get all subscription plans
exports.getAllPlans = async (req, res) => {
  try {
    const { isActive = true } = req.query;

    const plans = await SubscriptionPlan.find({ isActive }).sort({ 'price.monthly': 1 });

    sendSuccess(res, plans, 'تم جلب خطط الاشتراك بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get plan by ID
exports.getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await SubscriptionPlan.findById(id);

    if (!plan) {
      return sendError(res, 'الخطة غير موجودة', 404);
    }

    sendSuccess(res, plan, 'تم جلب الخطة بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Update plan (admin only)
exports.updatePlan = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return sendError(res, 'لا تملك صلاحية تعديل خطط الاشتراك', 403);
    }

    const { id } = req.params;

    const plan = await SubscriptionPlan.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!plan) {
      return sendError(res, 'الخطة غير موجودة', 404);
    }

    sendSuccess(res, plan, 'تم تحديث الخطة بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Subscribe user to plan
exports.subscribeUser = async (req, res) => {
  try {
    const { planId, subscriptionType } = req.body;

    if (!planId || !subscriptionType) {
      return sendError(res, 'معرف الخطة ونوع الاشتراك مطلوبان', 400);
    }

    const plan = await SubscriptionPlan.findById(planId);

    if (!plan) {
      return sendError(res, 'الخطة غير موجودة', 404);
    }

    // Check if user already has active subscription
    const activeSubscription = await UserSubscription.findOne({
      userId: req.user._id,
      status: 'active',
      endDate: { $gt: new Date() },
    });

    if (activeSubscription) {
      return sendError(res, 'لديك اشتراك نشط بالفعل', 400);
    }

    // Calculate price
    let price = 0;
    if (subscriptionType === 'monthly') {
      price = plan.price.monthly;
    } else if (subscriptionType === 'annual') {
      price = plan.price.annual;
    }

    // Calculate end date
    const startDate = new Date();
    let endDate = new Date(startDate);
    if (subscriptionType === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (subscriptionType === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Generate referral code
    const referralCode = `REF_${req.user._id}_${Date.now()}`;

    const subscription = await UserSubscription.create({
      userId: req.user._id,
      planId,
      status: 'active',
      subscriptionType,
      startDate,
      endDate,
      price: {
        original: price,
        discountedPrice: price,
        currency: 'SAR',
      },
      autoRenew: true,
      referralCode,
    });

    // Add payment record
    subscription.paymentHistory.push({
      date: new Date(),
      amount: price,
      status: 'completed',
      transactionId: `TRX_${Date.now()}`,
    });

    await subscription.save();

    // Populate before sending
    await subscription.populate('planId', 'name features');
    await subscription.populate('userId', 'name email');

    sendSuccess(res, subscription, 'تم الاشتراك بنجاح', 201);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get user subscription
exports.getUserSubscription = async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('planId', 'name features limitations')
      .populate('userId', 'name email');

    if (!subscription) {
      return sendSuccess(res, null, 'لا توجد اشتراكات');
    }

    sendSuccess(res, subscription, 'تم جلب الاشتراك بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Upgrade subscription
exports.upgradeSubscription = async (req, res) => {
  try {
    const { newPlanId } = req.body;

    if (!newPlanId) {
      return sendError(res, 'معرف الخطة الجديدة مطلوب', 400);
    }

    const currentSubscription = await UserSubscription.findOne({
      userId: req.user._id,
      status: 'active',
    });

    if (!currentSubscription) {
      return sendError(res, 'لا توجد اشتراكات نشطة للترقية من', 400);
    }

    const newPlan = await SubscriptionPlan.findById(newPlanId);

    if (!newPlan) {
      return sendError(res, 'الخطة الجديدة غير موجودة', 404);
    }

    // Calculate new price
    let newPrice = newPlan.price.monthly;
    if (currentSubscription.subscriptionType === 'annual') {
      newPrice = newPlan.price.annual;
    }

    await currentSubscription.upgradePlan(newPlanId, newPrice);

    await currentSubscription.populate('planId', 'name features');

    sendSuccess(res, currentSubscription, 'تم ترقية الاشتراك بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Renew subscription
exports.renewSubscription = async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({ userId: req.user._id });

    if (!subscription) {
      return sendError(res, 'لا توجد اشتراكات', 404);
    }

    // Calculate new end date
    const newEndDate = new Date(subscription.endDate);
    if (subscription.subscriptionType === 'monthly') {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else if (subscription.subscriptionType === 'annual') {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }

    const plan = await SubscriptionPlan.findById(subscription.planId);

    let price = plan.price.monthly;
    if (subscription.subscriptionType === 'annual') {
      price = plan.price.annual;
    }

    subscription.endDate = newEndDate;
    subscription.status = 'active';
    subscription.paymentHistory.push({
      date: new Date(),
      amount: price,
      status: 'completed',
      transactionId: `TRX_${Date.now()}`,
    });

    await subscription.save();

    sendSuccess(res, subscription, 'تم تجديد الاشتراك بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const { reason } = req.body;

    const subscription = await UserSubscription.findOne({
      userId: req.user._id,
      status: 'active',
    });

    if (!subscription) {
      return sendError(res, 'لا توجد اشتراكات نشطة للإلغاء', 404);
    }

    await subscription.cancelSubscription(reason);

    sendSuccess(res, subscription, 'تم إلغاء الاشتراك بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get expiring subscriptions (admin only)
exports.getExpiringSubscriptions = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return sendError(res, 'لا تملك صلاحية الوصول إلى هذه البيانات', 403);
    }

    const { daysThreshold = 7 } = req.query;

    const subscriptions = await UserSubscription.getExpiringSubscriptions(parseInt(daysThreshold));

    sendSuccess(res, subscriptions, `تم جلب الاشتراكات المنتهية خلال ${daysThreshold} أيام بنجاح`);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get subscription statistics (admin only)
exports.getSubscriptionStatistics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return sendError(res, 'لا تملك صلاحية الوصول إلى هذه البيانات', 403);
    }

    const totalSubscriptions = await UserSubscription.countDocuments();
    const activeSubscriptions = await UserSubscription.countDocuments({ status: 'active' });
    const cancelledSubscriptions = await UserSubscription.countDocuments({
      status: 'cancelled',
    });
    const expiredSubscriptions = await UserSubscription.countDocuments({ status: 'expired' });

    const stats = {
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      expiredSubscriptions,
      byPlan: {},
      totalRevenue: 0,
    };

    const plans = await SubscriptionPlan.find();
    for (const plan of plans) {
      const count = await UserSubscription.countDocuments({ planId: plan._id });
      stats.byPlan[plan.name] = count;
    }

    // Calculate revenue
    const subscriptions = await UserSubscription.find();
    stats.totalRevenue = subscriptions.reduce((sum, s) => sum + (s.price.original || 0), 0);

    sendSuccess(res, stats, 'تم جلب إحصائيات الاشتراكات بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

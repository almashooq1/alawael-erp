# 💳 Phase 2: نظام الدفع والمعاملات المالية المتقدم

**المدة:** أسبوعين (27 يناير - 9 فبراير)  
**الحالة:** جاهز للبدء  
**الأولوية:** عالية جداً

---

## 📋 قائمة المهام

- [ ] **2.1** إعداد Stripe و PayPal
- [ ] **2.2** إنشاء نموذج الدفع
- [ ] **2.3** تطوير Payment Gateway Service
- [ ] **2.4** نظام الاشتراكات والفاتورة
- [ ] **2.5** لوحة تحكم المحاسبة
- [ ] **2.6** اختبار الدفع
- [ ] **2.7** توثيق

---

## 🛠️ البيئة والإعدادات

### التثبيت الأول

```bash
npm install stripe
npm install paypal-rest-sdk
npm install razorpay
npm install nodemailer

# متغيرات البيئة في .env
STRIPE_PUBLIC_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

PAYPAL_CLIENT_ID=xxxxx
PAYPAL_CLIENT_SECRET=xxxxx
PAYPAL_MODE=sandbox

RAZORPAY_KEY_ID=xxxxx
RAZORPAY_KEY_SECRET=xxxxx

SENDGRID_API_KEY=xxxxx
```

---

## 📄 الملفات الرئيسية

### الملف 1: `backend/models/payment.model.js`

```javascript
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    required: true,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  amount: {
    type: Number,
    required: true,
  },

  currency: {
    type: String,
    default: 'SAR',
    enum: ['SAR', 'AED', 'EGP', 'USD', 'EUR'],
  },

  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'razorpay', 'bank_transfer', 'installment'],
    required: true,
  },

  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },

  stripePaymentIntentId: String,
  paypalTransactionId: String,
  razorpayPaymentId: String,

  cardDetails: {
    brand: String,
    last4: String,
    expMonth: Number,
    expYear: Number,
  },

  description: String,

  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
  },

  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },

  metadata: {
    type: Map,
    of: String,
  },

  errorMessage: String,

  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
});

module.exports = mongoose.model('Payment', PaymentSchema);
```

### الملف 2: `backend/models/subscription.model.js`

```javascript
const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  plan: {
    type: String,
    enum: ['free', 'basic', 'professional', 'enterprise'],
    default: 'free',
  },

  price: {
    monthly: Number,
    annual: Number,
  },

  billingCycle: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly',
  },

  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled', 'expired'],
    default: 'active',
  },

  stripeSubscriptionId: String,

  currentPeriod: {
    start: Date,
    end: Date,
  },

  nextBillingDate: Date,

  autoRenew: {
    type: Boolean,
    default: true,
  },

  features: [
    {
      feature: String,
      limit: Number,
      used: Number,
    },
  ],

  paymentMethod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentMethod',
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  cancelledAt: Date,
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
```

### الملف 3: `backend/models/invoice.model.js`

```javascript
const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  items: [
    {
      description: String,
      quantity: Number,
      unitPrice: Number,
      total: Number,
    },
  ],

  subtotal: Number,
  tax: Number,
  discount: Number,
  total: Number,

  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
  },

  dueDate: Date,

  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  },

  notes: String,

  createdAt: { type: Date, default: Date.now },
  paidAt: Date,
  sentAt: Date,
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
```

---

## 🔧 خدمة الدفع الرئيسية

### الملف 4: `backend/services/payment-gateway.service.js`

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('paypal-rest-sdk');
const Razorpay = require('razorpay');
const Payment = require('../models/payment.model');
const Invoice = require('../models/invoice.model');
const Subscription = require('../models/subscription.model');
const nodemailer = require('nodemailer');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

class PaymentGatewayService {
  /**
   * معالجة الدفع عبر Stripe
   */
  async processStripePayment(userId, amount, currency = 'SAR') {
    try {
      const customer = await this.getOrCreateStripeCustomer(userId);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // تحويل إلى فلوس
        currency: currency.toLowerCase(),
        customer: customer.id,
        metadata: { userId },
      });

      const payment = new Payment({
        transactionId: paymentIntent.id,
        userId,
        amount,
        currency,
        paymentMethod: 'card',
        status: 'processing',
        stripePaymentIntentId: paymentIntent.id,
      });

      await payment.save();

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentId: paymentIntent.id,
        payment: payment,
      };
    } catch (error) {
      console.error('خطأ في معالجة دفع Stripe:', error);
      throw error;
    }
  }

  /**
   * معالجة الدفع عبر PayPal
   */
  async processPayPalPayment(userId, amount, description) {
    try {
      const payment_json = {
        intent: 'sale',
        payer: { payment_method: 'paypal' },
        redirect_urls: {
          return_url: `${process.env.FRONTEND_URL}/payment-success`,
          cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
        },
        transactions: [
          {
            amount: { total: amount.toString(), currency: 'SAR', details: { subtotal: amount.toString() } },
            description: description,
          },
        ],
      };

      return new Promise((resolve, reject) => {
        paypal.payment.create(payment_json, (error, payment) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              success: true,
              paymentId: payment.id,
              redirectUrl: payment.links.find(l => l.rel === 'approval_url').href,
            });
          }
        });
      });
    } catch (error) {
      console.error('خطأ في معالجة دفع PayPal:', error);
      throw error;
    }
  }

  /**
   * معالجة الدفع عبر Razorpay
   */
  async processRazorpayPayment(userId, amount, description) {
    try {
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: 'SAR',
        receipt: `receipt_${userId}_${Date.now()}`,
        notes: { description },
      });

      const payment = new Payment({
        transactionId: order.id,
        userId,
        amount,
        currency: 'SAR',
        paymentMethod: 'razorpay',
        status: 'processing',
        razorpayPaymentId: order.id,
      });

      await payment.save();

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      };
    } catch (error) {
      console.error('خطأ في معالجة دفع Razorpay:', error);
      throw error;
    }
  }

  /**
   * معالجة الدفع بالتقسيط
   */
  async processInstallmentPayment(userId, amount, months = 3) {
    try {
      const monthlyAmount = amount / months;
      const installments = [];

      for (let i = 0; i < months; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i + 1);

        installments.push({
          number: i + 1,
          amount: monthlyAmount,
          dueDate: dueDate,
          status: 'pending',
        });
      }

      return {
        success: true,
        totalAmount: amount,
        monthlyAmount: monthlyAmount,
        months: months,
        installments: installments,
      };
    } catch (error) {
      console.error('خطأ في معالجة الدفع بالتقسيط:', error);
      throw error;
    }
  }

  /**
   * تأكيد الدفع
   */
  async confirmPayment(paymentId, token = null) {
    try {
      const payment = await Payment.findById(paymentId);

      if (!payment) {
        throw new Error('الدفع غير موجود');
      }

      // تأكيد عبر Stripe
      if (payment.stripePaymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.confirm(payment.stripePaymentIntentId, { payment_method: token });

        payment.status = paymentIntent.status === 'succeeded' ? 'completed' : 'failed';
        payment.completedAt = paymentIntent.status === 'succeeded' ? new Date() : null;
      }

      await payment.save();

      if (payment.status === 'completed') {
        await this.sendPaymentConfirmationEmail(payment);
      }

      return {
        success: payment.status === 'completed',
        payment: payment,
      };
    } catch (error) {
      console.error('خطأ في تأكيد الدفع:', error);
      throw error;
    }
  }

  /**
   * استرجاع الدفع (Refund)
   */
  async refundPayment(paymentId, reason = null) {
    try {
      const payment = await Payment.findById(paymentId);

      if (!payment || payment.status !== 'completed') {
        throw new Error('لا يمكن استرجاع هذا الدفع');
      }

      // استرجاع من Stripe
      if (payment.stripePaymentIntentId) {
        await stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          reason: reason || 'requested_by_customer',
        });
      }

      payment.status = 'refunded';
      payment.metadata = payment.metadata || new Map();
      payment.metadata.set('refundReason', reason || 'No reason provided');
      payment.metadata.set('refundDate', new Date().toISOString());

      await payment.save();

      await this.sendRefundConfirmationEmail(payment);

      return {
        success: true,
        message: 'تم استرجاع الدفع بنجاح',
        payment: payment,
      };
    } catch (error) {
      console.error('خطأ في استرجاع الدفع:', error);
      throw error;
    }
  }

  /**
   * إنشاء أو تحديث اشتراك
   */
  async createSubscription(userId, plan = 'basic', billingCycle = 'monthly') {
    try {
      const plans = {
        free: { monthly: 0, annual: 0 },
        basic: { monthly: 99, annual: 999 },
        professional: { monthly: 299, annual: 2990 },
        enterprise: { monthly: 999, annual: 9990 },
      };

      const planConfig = plans[plan];
      if (!planConfig) {
        throw new Error('خطة غير صحيحة');
      }

      const price = planConfig[billingCycle];
      const currentSubscription = await Subscription.findOne({ userId, status: 'active' });

      if (currentSubscription) {
        currentSubscription.plan = plan;
        currentSubscription.price = planConfig;
        currentSubscription.billingCycle = billingCycle;
        currentSubscription.nextBillingDate = this.calculateNextBillingDate(billingCycle);
        await currentSubscription.save();
        return currentSubscription;
      }

      const subscription = new Subscription({
        userId,
        plan,
        price: planConfig,
        billingCycle,
        currentPeriod: {
          start: new Date(),
          end: this.calculateNextBillingDate(billingCycle),
        },
        nextBillingDate: this.calculateNextBillingDate(billingCycle),
        features: this.getPlanFeatures(plan),
      });

      await subscription.save();

      if (price > 0) {
        await this.processStripePayment(userId, price, 'SAR');
      }

      return subscription;
    } catch (error) {
      console.error('خطأ في إنشاء الاشتراك:', error);
      throw error;
    }
  }

  /**
   * إنشاء فاتورة
   */
  async createInvoice(userId, items, notes = null) {
    try {
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.15; // 15% ضريبة
      const total = subtotal + tax;

      const invoiceNumber = `INV-${Date.now()}`;

      const invoice = new Invoice({
        invoiceNumber,
        userId,
        items,
        subtotal,
        tax,
        total,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 يوم
        notes,
      });

      await invoice.save();

      await this.sendInvoiceEmail(invoice);

      return invoice;
    } catch (error) {
      console.error('خطأ في إنشاء الفاتورة:', error);
      throw error;
    }
  }

  /**
   * الحصول على سجل الدفع
   */
  async getPaymentHistory(userId, limit = 20) {
    try {
      const payments = await Payment.find({ userId }).sort({ createdAt: -1 }).limit(limit);

      return payments;
    } catch (error) {
      console.error('خطأ في جلب سجل الدفع:', error);
      throw error;
    }
  }

  /**
   * إرسال بريد تأكيد الدفع
   */
  async sendPaymentConfirmationEmail(payment) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: payment.userId.email, // يجب جلب البريد من قاعدة البيانات
        subject: 'تأكيد الدفع',
        html: `
          <h2>تم استقبال دفعتك بنجاح</h2>
          <p>المبلغ: ${payment.amount} ${payment.currency}</p>
          <p>رقم العملية: ${payment.transactionId}</p>
          <p>التاريخ: ${payment.completedAt}</p>
          <p>شكراً لاستخدامك خدماتنا</p>
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('خطأ في إرسال بريد تأكيد الدفع:', error);
    }
  }

  /**
   * إرسال بريد استرجاع الدفع
   */
  async sendRefundConfirmationEmail(payment) {
    // مشابهة لـ sendPaymentConfirmationEmail لكن برسالة استرجاع
  }

  /**
   * إرسال الفاتورة
   */
  async sendInvoiceEmail(invoice) {
    // إرسال الفاتورة عبر البريد الإلكتروني
  }

  // دوال مساعدة
  async getOrCreateStripeCustomer(userId) {
    // البحث أو إنشاء عميل Stripe
    return { id: 'cus_xxxxx' };
  }

  calculateNextBillingDate(billingCycle) {
    const date = new Date();
    if (billingCycle === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else if (billingCycle === 'annual') {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date;
  }

  getPlanFeatures(plan) {
    const features = {
      free: [
        { feature: 'Users', limit: 1, used: 0 },
        { feature: 'Storage', limit: 1, used: 0 },
      ],
      basic: [
        { feature: 'Users', limit: 5, used: 0 },
        { feature: 'Storage', limit: 50, used: 0 },
      ],
      professional: [
        { feature: 'Users', limit: 50, used: 0 },
        { feature: 'Storage', limit: 500, used: 0 },
      ],
      enterprise: [
        { feature: 'Users', limit: -1, used: 0 },
        { feature: 'Storage', limit: -1, used: 0 },
      ],
    };

    return features[plan] || [];
  }
}

module.exports = new PaymentGatewayService();
```

---

## 📡 API Routes

### الملف 5: `backend/routes/payments.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const paymentService = require('../services/payment-gateway.service');
const { authenticateToken } = require('../middleware/auth');

// معالجة الدفع عبر Stripe
router.post('/stripe', authenticateToken, async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const result = await paymentService.processStripePayment(req.user.id, amount, currency);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// معالجة الدفع عبر PayPal
router.post('/paypal', authenticateToken, async (req, res) => {
  try {
    const { amount, description } = req.body;
    const result = await paymentService.processPayPalPayment(req.user.id, amount, description);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// معالجة الدفع عبر Razorpay
router.post('/razorpay', authenticateToken, async (req, res) => {
  try {
    const { amount, description } = req.body;
    const result = await paymentService.processRazorpayPayment(req.user.id, amount, description);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// الدفع بالتقسيط
router.post('/installment', authenticateToken, async (req, res) => {
  try {
    const { amount, months } = req.body;
    const result = await paymentService.processInstallmentPayment(req.user.id, amount, months);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// تأكيد الدفع
router.post('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    const result = await paymentService.confirmPayment(req.params.id, token);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// استرجاع الدفع
router.post('/:id/refund', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await paymentService.refundPayment(req.params.id, reason);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// الاشتراكات
router.post('/subscriptions/create', authenticateToken, async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;
    const subscription = await paymentService.createSubscription(req.user.id, plan, billingCycle);
    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// إنشاء فاتورة
router.post('/invoices', authenticateToken, async (req, res) => {
  try {
    const { items, notes } = req.body;
    const invoice = await paymentService.createInvoice(req.user.id, items, notes);
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// سجل الدفع
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const payments = await paymentService.getPaymentHistory(req.user.id);
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
```

---

## ⚙️ الإعدادات النهائية

أضف هذا في `backend/server.js`:

```javascript
const paymentRoutes = require('./routes/payments.routes');
app.use('/api/payments', paymentRoutes);
```

---

**جاهز للبدء في Phase 2! 💳✅**

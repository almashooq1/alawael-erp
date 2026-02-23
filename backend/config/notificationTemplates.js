/**
 * Notification Templates - Pre-built Email, SMS, Push templates
 * Created: February 22, 2026
 */

const NotificationService = require('../services/notificationService');
const { NotificationTemplate } = NotificationService;

// Email Templates
const emailTemplates = {
  welcome: new NotificationTemplate(
    'welcome',
    'email',
    'Welcome to AlAwael! 🎉',
    `<h1 style="color: #2c3e50;">Welcome {{name}}!</h1>
     <p>Thank you for joining AlAwael ERP system.</p>
     <p>Your account has been successfully created and is ready to use.</p>
     <p style="margin-top: 20px;">
       <a href="{{loginUrl}}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
         Get Started
       </a>
     </p>
     <p>If you have any questions, please contact our support team at support@alawael.com</p>`,
    ['{{name}}', '{{loginUrl}}']
  ),

  orderConfirmation: new NotificationTemplate(
    'orderConfirmation',
    'email',
    'Order Confirmation #{{orderId}}',
    `<h1 style="color: #27ae60;">Order Confirmed!</h1>
     <p>Hello {{customerName}},</p>
     <p>Your order #{{orderId}} has been successfully placed.</p>
     <div style="background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0;">
       <p><strong>Order Details:</strong></p>
       <p>Total Amount: <strong>{{total}} {{currency}}</strong></p>
       <p>Estimated Delivery: {{deliveryDate}}</p>
       <p>Order Status: <strong>Confirmed</strong></p>
     </div>
     <p>Track your order using the link below:</p>
     <p><a href="{{trackingUrl}}" style="color: #3498db;">Track Order</a></p>
     <p>Thank you for your business!</p>`,
    ['{{customerName}}', '{{orderId}}', '{{total}}', '{{currency}}', '{{deliveryDate}}', '{{trackingUrl}}']
  ),

  passwordReset: new NotificationTemplate(
    'passwordReset',
    'email',
    'Reset Your Password',
    `<h1 style="color: #e74c3c;">Password Reset Request</h1>
     <p>Hello {{name}},</p>
     <p>You requested to reset your password. Click the button below to create a new password:</p>
     <p style="margin-top: 20px;">
       <a href="{{resetUrl}}" style="background-color: #e74c3c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">
         Reset Password
       </a>
     </p>
     <p style="color: #7f8c8d; font-size: 12px;">This link will expire in 24 hours.</p>
     <p>If you didn't request this password reset, please ignore this email or contact support immediately.</p>`,
    ['{{name}}', '{{resetUrl}}']
  ),

  paymentReceipt: new NotificationTemplate(
    'paymentReceipt',
    'email',
    'Payment Receipt - {{amount}} {{currency}}',
    `<h1 style="color: #27ae60;">Payment Received</h1>
     <p>Thank you for your payment!</p>
     <div style="background-color: #f9f9f9; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0;">
       <p><strong>Payment Details:</strong></p>
       <p>Reference: {{transactionId}}</p>
       <p>Amount: {{amount}} {{currency}}</p>
       <p>Date: {{paymentDate}}</p>
       <p>Method: {{paymentMethod}}</p>
     </div>
     <p>Your invoice has been attached to this email.</p>`,
    ['{{transactionId}}', '{{amount}}', '{{currency}}', '{{paymentDate}}', '{{paymentMethod}}']
  ),

  accountVerification: new NotificationTemplate(
    'accountVerification',
    'email',
    'Verify Your Email Address',
    `<h1>Email Verification Required</h1>
     <p>Hello {{name}},</p>
     <p>Please verify your email address to complete your account setup.</p>
     <p style="margin-top: 20px;">
       <a href="{{verificationUrl}}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">
         Verify Email
       </a>
     </p>
     <p style="color: #7f8c8d; font-size: 12px;">Verification code: {{code}}</p>`,
    ['{{name}}', '{{verificationUrl}}', '{{code}}']
  ),
};

// SMS Templates
const smsTemplates = {
  otp: new NotificationTemplate(
    'otp',
    'sms',
    'Two-Factor Authentication',
    `Your AlAwael verification code is: {{code}}. Valid for 10 minutes. Do not share with anyone.`,
    ['{{code}}']
  ),

  paymentAlert: new NotificationTemplate(
    'paymentAlert',
    'sms',
    'Payment Notification',
    `Payment of {{amount}} {{currency}} received for Order #{{orderId}}. Reference: {{transactionId}}. Thank you!`,
    ['{{amount}}', '{{currency}}', '{{orderId}}', '{{transactionId}}']
  ),

  orderStatus: new NotificationTemplate(
    'orderStatus',
    'sms',
    'Order Status Update',
    `Your order #{{orderId}} status: {{status}}. {{message}}`,
    ['{{orderId}}', '{{status}}', '{{message}}']
  ),

  deliveryNotice: new NotificationTemplate(
    'deliveryNotice',
    'sms',
    'Delivery Information',
    `Order #{{orderId}} will be delivered {{deliveryDate}}. Driver {{driverName}} - {{driverPhone}}`,
    ['{{orderId}}', '{{deliveryDate}}', '{{driverName}}', '{{driverPhone}}']
  ),

  securityAlert: new NotificationTemplate(
    'securityAlert',
    'sms',
    'Security Alert',
    `Security Alert: {{activity}} on your account. If this wasn't you, reply VERIFY to confirm your identity.`,
    ['{{activity}}']
  ),
};

// Push Notification Templates
const pushTemplates = {
  orderUpdate: new NotificationTemplate(
    'orderUpdate',
    'push',
    'Order #{{orderId}} {{status}}',
    `Your order {{orderId}} is {{status}}. View details for more information.`,
    ['{{orderId}}', '{{status}}']
  ),

  promotionalOffer: new NotificationTemplate(
    'promotionalOffer',
    'push',
    '{{discount}}% Off - {{productName}}!',
    `Limited time offer! Get {{discount}}% off on {{productName}}. Act now!`,
    ['{{discount}}', '{{productName}}']
  ),

  systemAlert: new NotificationTemplate(
    'systemAlert',
    'push',
    'System Alert',
    `{{message}}`,
    ['{{message}}']
  ),

  accountActivity: new NotificationTemplate(
    'accountActivity',
    'push',
    'Account {{activity}}',
    `{{details}}. If not you, secure your account immediately.`,
    ['{{activity}}', '{{details}}']
  ),

  reminderNotification: new NotificationTemplate(
    'reminderNotification',
    'push',
    '{{title}}',
    `{{message}} Tap to view.`,
    ['{{title}}', '{{message}}']
  ),
};

/**
 * Initialize all templates
 */
function initializeTemplates(notificationService) {
  // Register email templates
  Object.values(emailTemplates).forEach((template) => {
    notificationService.registerTemplate(template);
  });

  // Register SMS templates
  Object.values(smsTemplates).forEach((template) => {
    notificationService.registerTemplate(template);
  });

  // Register push templates
  Object.values(pushTemplates).forEach((template) => {
    notificationService.registerTemplate(template);
  });

  return {
    email: emailTemplates,
    sms: smsTemplates,
    push: pushTemplates,
  };
}

module.exports = {
  emailTemplates,
  smsTemplates,
  pushTemplates,
  initializeTemplates,
};

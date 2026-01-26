const nodemailer = require('nodemailer');

// إنشاء transporter
let transporter = null;

/**
 * إعداد البريد الإلكتروني
 */
function setupEmailTransporter() {
  if (transporter) return transporter;
  
  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };
  
  // إذا لم تكن الإعدادات موجودة، استخدم Ethereal (للتطوير)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  Email credentials not configured. Using test account.');
    return null;
  }
  
  transporter = nodemailer.createTransport(emailConfig);
  
  // التحقق من الاتصال
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email configuration error:', error);
      transporter = null;
    } else {
      console.log('✅ Email server is ready to send messages');
    }
  });
  
  return transporter;
}

/**
 * إرسال إشعار اتصال جديد
 * @param {Object} communication - بيانات الاتصال
 * @param {String} recipientEmail - بريد المستقبل
 */
async function sendNewCommunicationEmail(communication, recipientEmail) {
  const transporter = setupEmailTransporter();
  if (!transporter) {
    console.warn('Email not configured - skipping notification');
    return null;
  }
  
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipientEmail,
      subject: `اتصال جديد: ${communication.title}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px;">
            🔔 اتصال جديد
          </h2>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>رقم المرجع:</strong> ${communication.referenceNumber}</p>
            <p><strong>العنوان:</strong> ${communication.title}</p>
            <p><strong>النوع:</strong> ${communication.type}</p>
            <p><strong>الأولوية:</strong> ${communication.priority}</p>
            <p><strong>تاريخ الإرسال:</strong> ${new Date(communication.sentDate).toLocaleDateString('ar-SA')}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <p><strong>الموضوع:</strong></p>
            <p style="background-color: #fff; padding: 10px; border-right: 3px solid #1976d2;">
              ${communication.subject}
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <p><strong>المرسل:</strong> ${communication.sender.name}</p>
            ${communication.sender.department ? `<p><strong>القسم:</strong> ${communication.sender.department}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/communications-system/view/${communication._id}" 
               style="background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              عرض التفاصيل الكاملة
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            هذا البريد تم إرساله تلقائياً من نظام إدارة الاتصالات الإدارية
          </p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return info;
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

/**
 * إرسال إشعار موافقة
 * @param {Object} communication - بيانات الاتصال
 * @param {String} approverEmail - بريد المُوافق
 * @param {Number} stageIndex - رقم المرحلة
 */
async function sendApprovalRequestEmail(communication, approverEmail, stageIndex) {
  const transporter = setupEmailTransporter();
  if (!transporter) return null;
  
  try {
    const stage = communication.approvalWorkflow.stages[stageIndex];
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: approverEmail,
      subject: `طلب موافقة: ${communication.title}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff9800; border-bottom: 2px solid #ff9800; padding-bottom: 10px;">
            ⏰ طلب موافقة
          </h2>
          
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-right: 4px solid #ff9800;">
            <p style="margin: 0; font-size: 16px; font-weight: bold;">
              يُرجى مراجعة الاتصال التالي والموافقة عليه أو رفضه:
            </p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>رقم المرجع:</strong> ${communication.referenceNumber}</p>
            <p><strong>العنوان:</strong> ${communication.title}</p>
            <p><strong>المرحلة:</strong> ${stage.name}</p>
            <p><strong>الأولوية:</strong> ${communication.priority}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <p><strong>الموضوع:</strong></p>
            <p style="background-color: #fff; padding: 10px;">
              ${communication.subject}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/communications-system/approve/${communication._id}" 
               style="background-color: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">
              ✓ موافقة
            </a>
            <a href="${process.env.FRONTEND_URL}/communications-system/reject/${communication._id}" 
               style="background-color: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">
              ✗ رفض
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            نظام إدارة الاتصالات الإدارية
          </p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Approval email sent:', info.messageId);
    return info;
    
  } catch (error) {
    console.error('❌ Error sending approval email:', error);
    throw error;
  }
}

/**
 * إرسال إشعار بتغيير الحالة
 * @param {Object} communication - بيانات الاتصال
 * @param {String} recipientEmail - بريد المستقبل
 * @param {String} oldStatus - الحالة القديمة
 * @param {String} newStatus - الحالة الجديدة
 */
async function sendStatusChangeEmail(communication, recipientEmail, oldStatus, newStatus) {
  const transporter = setupEmailTransporter();
  if (!transporter) return null;
  
  try {
    const statusLabels = {
      pending: 'قيد الانتظار',
      in_progress: 'قيد التنفيذ',
      under_review: 'قيد المراجعة',
      completed: 'مكتمل',
      cancelled: 'ملغي'
    };
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipientEmail,
      subject: `تحديث حالة: ${communication.title}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196f3; border-bottom: 2px solid #2196f3; padding-bottom: 10px;">
            🔄 تحديث حالة الاتصال
          </h2>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>رقم المرجع:</strong> ${communication.referenceNumber}</p>
            <p><strong>العنوان:</strong> ${communication.title}</p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
            <p style="margin: 0;">
              <span style="color: #666;">${statusLabels[oldStatus]}</span>
              <span style="margin: 0 10px; font-size: 20px;">→</span>
              <span style="color: #1976d2; font-weight: bold;">${statusLabels[newStatus]}</span>
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/communications-system/view/${communication._id}" 
               style="background-color: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              عرض التفاصيل
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            نظام إدارة الاتصالات الإدارية
          </p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Status change email sent:', info.messageId);
    return info;
    
  } catch (error) {
    console.error('❌ Error sending status change email:', error);
    throw error;
  }
}

module.exports = {
  setupEmailTransporter,
  sendNewCommunicationEmail,
  sendApprovalRequestEmail,
  sendStatusChangeEmail
};

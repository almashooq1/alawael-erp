// Mock WhatsApp Business API integration with delivery log
export function sendSecurityWhatsappAlert({ message }) {
  const number = localStorage.getItem('securityWhatsappNumber') || 'غير محدد';
  // Simulate async API call and delivery status
  return new Promise(resolve => {
    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.log(`[WhatsApp API] إرسال إلى ${number}:`, message);
      // Simulate random delivery status
      const delivered = Math.random() > 0.1;
      const log = {
        number,
        message,
        status: delivered ? 'delivered' : 'failed',
        timestamp: new Date().toISOString(),
      };
      // Save to log in localStorage
      const prev = JSON.parse(localStorage.getItem('whatsappDeliveryLog') || '[]');
      prev.push(log);
      localStorage.setItem('whatsappDeliveryLog', JSON.stringify(prev));
      if (delivered) {
        console.log(`[WhatsApp API] تم التسليم بنجاح إلى ${number}`);
        resolve({ status: 'delivered', number });
      } else {
        console.log(`[WhatsApp API] فشل التسليم إلى ${number}`);
        resolve({ status: 'failed', number });
      }
    }, 700);
  });
}

// Get WhatsApp delivery log
export function getWhatsappDeliveryLog() {
  return JSON.parse(localStorage.getItem('whatsappDeliveryLog') || '[]');
}

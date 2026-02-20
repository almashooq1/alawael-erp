// Mock function to send security SMS alert
export function sendSecuritySmsAlert({ message, to = '+966500000000' }) {
  // In real app, integrate with SMS gateway
  // For demo, just log
  console.log('Security SMS Sent:', { to, message });
  return Promise.resolve({ success: true });
}

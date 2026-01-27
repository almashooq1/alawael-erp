import { EmailService } from '../src/modules/email-service';

describe('EmailService', () => {
  it('should instantiate', () => {
    const email = new EmailService('smtp.example.com', 587, 'user', 'pass');
    expect(email).toBeDefined();
  });
});

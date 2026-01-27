import { SMSService } from '../src/modules/sms-service';

describe('SMSService', () => {
  it('should send sms', async () => {
    const sms = new SMSService();
    const result = await sms.send('+123456789', 'test');
    expect(result).toBe(true);
  });
});

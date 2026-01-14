const { getClientIP, logSecurityEvent } = require('../utils/security');

// Mock console for testing
jest.mock('fs', () => ({
  appendFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

describe('Security Utils', () => {
  describe('getClientIP', () => {
    let mockReq;

    beforeEach(() => {
      mockReq = {
        ip: '192.168.1.1',
        headers: {},
        connection: {
          remoteAddress: '10.0.0.1',
        },
      };
    });

    it('should return x-forwarded-for header if present', () => {
      mockReq.headers['x-forwarded-for'] = '203.0.113.1, 203.0.113.2';

      const ip = getClientIP(mockReq);

      expect(ip).toBe('203.0.113.1');
    });

    it('should return x-real-ip header if x-forwarded-for not present', () => {
      mockReq.headers['x-real-ip'] = '203.0.113.10';

      const ip = getClientIP(mockReq);

      expect(ip).toBe('203.0.113.10');
    });

    it('should return req.ip if headers not present', () => {
      const ip = getClientIP(mockReq);

      expect(ip).toBe('192.168.1.1');
    });

    it('should return connection remote address as fallback', () => {
      mockReq.ip = undefined;

      const ip = getClientIP(mockReq);

      expect(ip).toBe('10.0.0.1');
    });

    it('should handle empty string headers', () => {
      mockReq.headers['x-forwarded-for'] = '';
      mockReq.ip = '192.168.1.100';

      const ip = getClientIP(mockReq);

      expect(ip).toBe('192.168.1.100');
    });

    it('should handle multiple forwarded IPs and return first', () => {
      mockReq.headers['x-forwarded-for'] = '203.0.113.5, 203.0.113.6, 203.0.113.7';

      const ip = getClientIP(mockReq);

      expect(ip).toBe('203.0.113.5');
    });

    it('should handle IPv6 addresses', () => {
      mockReq.ip = '::1';

      const ip = getClientIP(mockReq);

      expect(ip).toBe('::1');
    });

    it('should handle undefined connection object', () => {
      mockReq.connection = undefined;
      mockReq.ip = '192.168.1.50';

      const ip = getClientIP(mockReq);

      expect(ip).toBe('192.168.1.50');
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security event with event name', () => {
      const result = logSecurityEvent('LOGIN_ATTEMPT', {
        userId: 'user-1',
        ip: '192.168.1.1',
      });

      expect(result).toEqual(
        expect.objectContaining({
          eventName: 'LOGIN_ATTEMPT',
          timestamp: expect.any(String),
          details: expect.objectContaining({
            userId: 'user-1',
            ip: '192.168.1.1',
          }),
        }),
      );
    });

    it('should include timestamp in ISO format', () => {
      const result = logSecurityEvent('ACCESS_DENIED', {
        userId: 'user-1',
      });

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle empty details object', () => {
      const result = logSecurityEvent('SYSTEM_START', {});

      expect(result).toEqual(
        expect.objectContaining({
          eventName: 'SYSTEM_START',
          details: {},
        }),
      );
    });

    it('should handle undefined details', () => {
      const result = logSecurityEvent('SYSTEM_STOP');

      expect(result).toEqual(
        expect.objectContaining({
          eventName: 'SYSTEM_STOP',
        }),
      );
    });

    it('should support multiple event types', () => {
      const events = [
        'LOGIN_ATTEMPT',
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'ACCESS_DENIED',
        'REGISTRATION_ATTEMPT',
        'USER_REGISTERED',
        'PASSWORD_CHANGED',
        'UNAUTHORIZED_ACCESS',
        'SYSTEM_START',
        'SYSTEM_STOP',
      ];

      events.forEach(event => {
        const result = logSecurityEvent(event, { test: true });
        expect(result.eventName).toBe(event);
      });
    });

    it('should include detailed information in logs', () => {
      const details = {
        userId: 'user-123',
        email: 'test@example.com',
        ip: '192.168.1.1',
        action: 'UPDATE_PROFILE',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      };

      const result = logSecurityEvent('PROFILE_UPDATED', details);

      expect(result.details).toEqual(details);
    });

    it('should handle special characters in event names', () => {
      const result = logSecurityEvent('USER_ACCESS_DENIED_HIGH_RISK', {
        reason: 'Suspicious activity',
      });

      expect(result.eventName).toBe('USER_ACCESS_DENIED_HIGH_RISK');
    });

    it('should handle nested details objects', () => {
      const result = logSecurityEvent('COMPLEX_EVENT', {
        user: {
          id: 'user-1',
          email: 'test@example.com',
        },
        request: {
          method: 'POST',
          path: '/api/users',
        },
      });

      expect(result.details.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
      });
      expect(result.details.request).toEqual({
        method: 'POST',
        path: '/api/users',
      });
    });
  });

  describe('Security Event Logging - Integration', () => {
    it('should log events with consistent structure', () => {
      const events = [
        { name: 'LOGIN', details: { userId: 'user-1' } },
        { name: 'LOGOUT', details: { userId: 'user-1' } },
        { name: 'ERROR', details: { message: 'Test error' } },
      ];

      events.forEach(({ name, details }) => {
        const result = logSecurityEvent(name, details);

        expect(result).toHaveProperty('eventName');
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('details');
      });
    });

    it('should handle rapid successive events', () => {
      const results = [];

      for (let i = 0; i < 5; i++) {
        results.push(logSecurityEvent(`EVENT_${i}`, { sequence: i }));
      }

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.eventName).toBe(`EVENT_${index}`);
      });
    });
  });

  describe('IP Detection Edge Cases', () => {
    let mockReq;

    beforeEach(() => {
      mockReq = {
        ip: null,
        headers: {},
        connection: {
          remoteAddress: null,
        },
      };
    });

    it('should handle all null/undefined values gracefully', () => {
      const ip = getClientIP(mockReq);

      expect(ip).toBeDefined();
    });

    it('should handle localhost addresses', () => {
      mockReq.ip = '127.0.0.1';

      const ip = getClientIP(mockReq);

      expect(ip).toBe('127.0.0.1');
    });

    it('should preserve IP format', () => {
      const testIPs = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '::1', '2001:db8::1'];

      testIPs.forEach(testIP => {
        mockReq.ip = testIP;
        const ip = getClientIP(mockReq);
        expect(ip).toBe(testIP);
      });
    });
  });
});

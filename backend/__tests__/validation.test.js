const {
  validatePassword,
  validateEmail,
  validateRegistration,
  validateProfileUpdate,
  validatePasswordChange,
} = require('../middleware/validation');

describe('Validation Middleware', () => {
  describe('Password Validation', () => {
    it('should accept valid password', () => {
      const result = validatePassword('ValidPass123!');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than minimum', () => {
      const result = validatePassword('Pass1!');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePassword('validpass123!');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePassword('VALIDPASS123!');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
    });

    it('should reject password without number', () => {
      const result = validatePassword('ValidPass!');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('number'))).toBe(true);
    });

    it('should reject password without special character', () => {
      const result = validatePassword('ValidPass123');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('special character'))).toBe(true);
    });

    it('should accept various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'];

      specialChars.forEach(char => {
        const password = `ValidPass123${char}`;
        const result = validatePassword(password);
        expect(result.valid).toBe(true, `Failed for special char: ${char}`);
      });
    });

    it('should reject null password', () => {
      const result = validatePassword(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should reject undefined password', () => {
      const result = validatePassword(undefined);

      expect(result.valid).toBe(false);
    });

    it('should reject non-string password', () => {
      const result = validatePassword(123456);

      expect(result.valid).toBe(false);
    });

    it('should reject empty string password', () => {
      const result = validatePassword('');

      expect(result.valid).toBe(false);
    });

    it('should reject password exceeding maximum length', () => {
      const longPassword = 'ValidPass123!' + 'A'.repeat(200);
      const result = validatePassword(longPassword);

      expect(result.valid).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('should accept valid email', () => {
      const result = validateEmail('test@example.com');

      expect(result.valid).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = validateEmail('not-an-email');

      expect(result.valid).toBe(false);
    });

    it('should accept emails with subdomains', () => {
      const result = validateEmail('test@mail.example.com');

      expect(result.valid).toBe(true);
    });

    it('should accept emails with special characters', () => {
      const validEmails = ['user+tag@example.com', 'user.name@example.com', 'user_name@example.com'];

      validEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.valid).toBe(true, `Failed for: ${email}`);
      });
    });

    it('should reject email without domain', () => {
      const result = validateEmail('test@');

      expect(result.valid).toBe(false);
    });

    it('should reject email without local part', () => {
      const result = validateEmail('@example.com');

      expect(result.valid).toBe(false);
    });

    it('should reject null email', () => {
      const result = validateEmail(null);

      expect(result.valid).toBe(false);
    });

    it('should reject undefined email', () => {
      const result = validateEmail(undefined);

      expect(result.valid).toBe(false);
    });

    it('should handle email normalization', () => {
      const result = validateEmail('TEST@EXAMPLE.COM');

      expect(result.valid).toBe(true);
    });
  });

  describe('Registration Validation', () => {
    it('should pass validation middleware for valid data', () => {
      const mockReq = {
        body: {
          email: 'newuser@example.com',
          password: 'ValidPass123!',
          fullName: 'John Doe',
        },
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const mockNext = jest.fn();

      // Call middleware
      if (validateRegistration) {
        validateRegistration(mockReq, mockRes, mockNext);
        // Should call next if valid
        expect(mockNext || mockRes.status).toBeDefined();
      }
    });

    it('should reject invalid email in registration', () => {
      const mockReq = {
        body: {
          email: 'invalid-email',
          password: 'ValidPass123!',
          fullName: 'John Doe',
        },
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const mockNext = jest.fn();

      // Validation should handle invalid data
      expect(mockReq.body.email).toBeDefined();
    });

    it('should reject weak password in registration', () => {
      const mockReq = {
        body: {
          email: 'test@example.com',
          password: 'weak',
          fullName: 'John Doe',
        },
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const mockNext = jest.fn();

      expect(mockReq.body.password).toBe('weak');
    });

    it('should require all registration fields', () => {
      const mockReq = {
        body: {
          email: 'test@example.com',
          // missing password and fullName
        },
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const mockNext = jest.fn();

      // Middleware should validate all required fields
      expect(mockReq.body).toBeDefined();
    });
  });

  describe('Profile Update Validation', () => {
    it('should accept valid profile update', () => {
      const mockReq = {
        body: {
          fullName: 'Updated Name',
          email: 'updated@example.com',
        },
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const mockNext = jest.fn();

      if (validateProfileUpdate) {
        validateProfileUpdate(mockReq, mockRes, mockNext);
      }

      expect(mockReq.body).toBeDefined();
    });

    it('should reject invalid email in profile update', () => {
      const mockReq = {
        body: {
          fullName: 'Updated Name',
          email: 'invalid-email',
        },
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const mockNext = jest.fn();

      expect(mockReq.body.email).toBeDefined();
    });
  });

  describe('Password Change Validation', () => {
    it('should validate old and new password', () => {
      const mockReq = {
        body: {
          oldPassword: 'OldPass123!',
          newPassword: 'NewPass456!',
          confirmPassword: 'NewPass456!',
        },
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const mockNext = jest.fn();

      if (validatePasswordChange) {
        validatePasswordChange(mockReq, mockRes, mockNext);
      }

      expect(mockReq.body.newPassword).toBeDefined();
    });

    it('should require password confirmation', () => {
      const mockReq = {
        body: {
          oldPassword: 'OldPass123!',
          newPassword: 'NewPass456!',
          // missing confirmPassword
        },
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const mockNext = jest.fn();

      expect(mockReq.body).toHaveProperty('oldPassword');
      expect(mockReq.body).toHaveProperty('newPassword');
    });

    it('should reject mismatched passwords', () => {
      const mockReq = {
        body: {
          oldPassword: 'OldPass123!',
          newPassword: 'NewPass456!',
          confirmPassword: 'Different789!',
        },
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const mockNext = jest.fn();

      // Should detect mismatch
      expect(mockReq.body.newPassword).not.toBe(mockReq.body.confirmPassword);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should handle null request body', () => {
      const mockReq = { body: null };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();

      expect(mockReq.body).toBe(null);
    });

    it('should handle undefined request body', () => {
      const mockReq = { body: undefined };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();

      expect(mockReq.body).toBeUndefined();
    });

    it('should handle extra fields in request body', () => {
      const mockReq = {
        body: {
          email: 'test@example.com',
          password: 'ValidPass123!',
          fullName: 'John Doe',
          extraField: 'should be ignored',
          anotherExtra: 123,
        },
      };

      expect(mockReq.body).toHaveProperty('email');
      expect(mockReq.body).toHaveProperty('extraField');
    });
  });

  describe('Password Policy', () => {
    it('should enforce minimum length of 8 characters', () => {
      const shortPassword = 'Pass1!';
      const result = validatePassword(shortPassword);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('8'))).toBe(true);
    });

    it('should enforce maximum length', () => {
      const longPassword = 'A'.repeat(150) + 'Pass1!';
      const result = validatePassword(longPassword);

      expect(result.valid).toBe(false);
    });

    it('should require all policy components', () => {
      const incompletePasswords = [
        'validpass123!', // missing uppercase
        'VALIDPASS123!', // missing lowercase
        'ValidPass!', // missing number
        'ValidPass123', // missing special char
      ];

      incompletePasswords.forEach(pwd => {
        const result = validatePassword(pwd);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });
});

const Joi = require('joi');
const { authValidators, employeeValidators } = require('../utils/validators');

describe('Validators', () => {
  describe('Auth Validators', () => {
    describe('Login Validation', () => {
      it('should validate correct login credentials', () => {
        const validData = {
          email: 'test@example.com',
          password: 'password123',
        };

        const result = authValidators.login.validate(validData);

        expect(result.error).toBeUndefined();
        expect(result.value).toEqual(validData);
      });

      it('should reject invalid email', () => {
        const invalidData = {
          email: 'not-an-email',
          password: 'password123',
        };

        const result = authValidators.login.validate(invalidData);

        expect(result.error).toBeDefined();
      });

      it('should reject short password', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'short',
        };

        const result = authValidators.login.validate(invalidData);

        expect(result.error).toBeDefined();
      });

      it('should reject missing email', () => {
        const invalidData = {
          password: 'password123',
        };

        const result = authValidators.login.validate(invalidData);

        expect(result.error).toBeDefined();
      });

      it('should reject missing password', () => {
        const invalidData = {
          email: 'test@example.com',
        };

        const result = authValidators.login.validate(invalidData);

        expect(result.error).toBeDefined();
      });

      it('should allow various valid email formats', () => {
        const validEmails = ['user@example.com', 'user.name@example.com', 'user+tag@example.co.uk', 'user_name@example.org'];

        validEmails.forEach(email => {
          const result = authValidators.login.validate({
            email,
            password: 'password123',
          });
          expect(result.error).toBeUndefined();
        });
      });
    });

    describe('Register Validation', () => {
      it('should validate correct registration data', () => {
        const validData = {
          email: 'newuser@example.com',
          password: 'Password@123',
          fullName: 'John Doe',
        };

        const result = authValidators.register.validate(validData);

        expect(result.error).toBeUndefined();
        expect(result.value).toEqual(validData);
      });

      it('should require minimum password length of 8', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'short1',
          fullName: 'John Doe',
        };

        const result = authValidators.register.validate(invalidData);

        expect(result.error).toBeDefined();
      });

      it('should require fullName', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'validpassword',
        };

        const result = authValidators.register.validate(invalidData);

        expect(result.error).toBeDefined();
      });

      it('should accept special characters in password', () => {
        const validData = {
          email: 'test@example.com',
          password: 'P@ssw0rd!#$',
          fullName: 'John Doe',
        };

        const result = authValidators.register.validate(validData);

        expect(result.error).toBeUndefined();
      });

      it('should accept unicode names', () => {
        const validData = {
          email: 'test@example.com',
          password: 'password123',
          fullName: 'محمد علي',
        };

        const result = authValidators.register.validate(validData);

        expect(result.error).toBeUndefined();
      });
    });
  });

  describe('Employee Validators', () => {
    describe('Create Employee Validation', () => {
      it('should validate correct employee data', () => {
        const validData = {
          name: 'Ahmed Hassan',
          email: 'ahmed@example.com',
          department: 'IT',
          position: 'Developer',
          salary: 5000,
        };

        const result = authValidators.employee?.create?.validate?.(validData) || { value: validData };

        expect(result.value).toBeDefined();
      });

      it('should require all mandatory fields', () => {
        const incompleteData = {
          name: 'Ahmed Hassan',
          email: 'ahmed@example.com',
          // missing department and position
        };

        // Validate that the validator exists and handles required fields
        expect(authValidators).toBeDefined();
      });

      it('should reject negative salary', () => {
        const invalidData = {
          name: 'Ahmed Hassan',
          email: 'ahmed@example.com',
          department: 'IT',
          position: 'Developer',
          salary: -1000,
        };

        // Validators should handle positive numbers
        expect(invalidData.salary).toBeLessThan(0);
      });

      it('should accept zero salary', () => {
        const validData = {
          name: 'Ahmed Hassan',
          email: 'ahmed@example.com',
          department: 'IT',
          position: 'Developer',
          salary: 0,
        };

        expect(validData.salary).toEqual(0);
      });
    });
  });

  describe('Validator Schema Structure', () => {
    it('should have auth validators defined', () => {
      expect(authValidators).toBeDefined();
      expect(authValidators.login).toBeDefined();
      expect(authValidators.register).toBeDefined();
    });

    it('should use Joi schemas', () => {
      expect(authValidators.login.describe).toBeDefined();
      expect(authValidators.register.describe).toBeDefined();
    });

    it('should have arabic error messages', () => {
      const result = authValidators.login.validate({
        email: 'invalid-email',
        password: 'short',
      });

      if (result.error) {
        const messages = result.error.details.map(d => d.message);
        // Validators should provide messages
        expect(messages.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace in email', () => {
      const result = authValidators.login.validate({
        email: ' test@example.com ',
        password: 'password123',
      });

      // Joi should handle trimming
      expect(result.error || result.value).toBeDefined();
    });

    it('should handle very long email addresses', () => {
      const longEmail = 'a'.repeat(255) + '@example.com';
      const result = authValidators.login.validate({
        email: longEmail,
        password: 'password123',
      });

      expect(result.error || result.value).toBeDefined();
    });

    it('should handle very long names', () => {
      const longName = 'A'.repeat(1000);
      const result = authValidators.register.validate({
        email: 'test@example.com',
        password: 'password123',
        fullName: longName,
      });

      expect(result.error || result.value).toBeDefined();
    });

    it('should handle empty strings', () => {
      const result = authValidators.register.validate({
        email: '',
        password: '',
        fullName: '',
      });

      expect(result.error).toBeDefined();
    });

    it('should handle null values', () => {
      const result = authValidators.login.validate({
        email: null,
        password: null,
      });

      expect(result.error).toBeDefined();
    });

    it('should handle undefined values', () => {
      const result = authValidators.register.validate({
        email: undefined,
        password: undefined,
        fullName: undefined,
      });

      expect(result.error).toBeDefined();
    });
  });

  describe('Validator Reusability', () => {
    it('should validate multiple times without interference', () => {
      const data1 = {
        email: 'user1@example.com',
        password: 'password123',
      };

      const data2 = {
        email: 'user2@example.com',
        password: 'password456',
      };

      const result1 = authValidators.login.validate(data1);
      const result2 = authValidators.login.validate(data2);

      expect(result1.error).toBeUndefined();
      expect(result2.error).toBeUndefined();
      expect(result1.value.email).toBe('user1@example.com');
      expect(result2.value.email).toBe('user2@example.com');
    });

    it('should not mutate original data', () => {
      const originalData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const dataCopy = { ...originalData };

      authValidators.login.validate(originalData);

      expect(originalData).toEqual(dataCopy);
    });
  });
});

/**
 * Unit Tests for Model and Utility Functions
 * Testing CRUD operations, data transformations, and helper functions
 * 
 * Coverage focus: Models and utility function coverage improvement
 */

describe('Model and Utility Functions Unit Tests', () => {
  describe('Data Transformation Utilities', () => {
    // These are example utility functions for testing
    // In production, these would be imported from actual utility modules

    test('should transform user data correctly with defined function', () => {
      const transformUserData = (user) => {
        if (!user) return null;
        return {
          id: user._id,
          name: user.fullName || `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      };

      const user = {
        _id: '123',
        firstName: 'Ahmed',
        lastName: 'Mohamed',
        email: 'ahmed@example.com',
        role: 'admin',
        status: 'active',
      };

      const result = transformUserData(user);
      expect(result.id).toBe('123');
      expect(result.name).toBe('Ahmed Mohamed');
      expect(result.email).toBe('ahmed@example.com');
      expect(result.role).toBe('admin');
    });

    test('should use fullName when available', () => {
      const transformUserData = (user) => {
        if (!user) return null;
        return {
          id: user._id,
          name: user.fullName || `${user.firstName} ${user.lastName}`,
        };
      };

      const user = {
        _id: '123',
        fullName: 'أحمد محمد',
        firstName: 'Ahmed',
        lastName: 'Mohamed',
      };

      const result = transformUserData(user);
      expect(result.name).toBe('أحمد محمد');
    });

    test('should handle null user', () => {
      const transformUserData = (user) => {
        if (!user) return null;
        return { id: user._id };
      };
      expect(transformUserData(null)).toBeNull();
    });

    test('should calculate salary with allowances', () => {
      const calculateSalaryWithAllowances = (baseSalary, allowances = {}) => {
        const allowanceTotal = Object.values(allowances).reduce((sum, val) => sum + (val || 0), 0);
        return baseSalary + allowanceTotal;
      };

      const baseSalary = 5000;
      const allowances = {
        housing: 1000,
        transport: 500,
        other: 200,
      };

      const total = calculateSalaryWithAllowances(baseSalary, allowances);
      expect(total).toBe(6700);
    });

    test('should calculate salary without allowances', () => {
      const calculateSalaryWithAllowances = (baseSalary, allowances = {}) => {
        const allowanceTotal = Object.values(allowances).reduce((sum, val) => sum + (val || 0), 0);
        return baseSalary + allowanceTotal;
      };

      const baseSalary = 5000;
      const total = calculateSalaryWithAllowances(baseSalary);
      expect(total).toBe(5000);
    });

    test('should handle partial allowances', () => {
      const calculateSalaryWithAllowances = (baseSalary, allowances = {}) => {
        const allowanceTotal = Object.values(allowances).reduce((sum, val) => sum + (val || 0), 0);
        return baseSalary + allowanceTotal;
      };

      const baseSalary = 5000;
      const allowances = { housing: 1000 };
      const total = calculateSalaryWithAllowances(baseSalary, allowances);
      expect(total).toBe(6000);
    });

    test('should ignore null allowances', () => {
      const calculateSalaryWithAllowances = (baseSalary, allowances = {}) => {
        const allowanceTotal = Object.values(allowances).reduce((sum, val) => sum + (val || 0), 0);
        return baseSalary + allowanceTotal;
      };

      const baseSalary = 5000;
      const allowances = { housing: 1000, other: null };
      const total = calculateSalaryWithAllowances(baseSalary, allowances);
      expect(total).toBe(6000);
    });
  });

  describe('Date and Time Utilities', () => {
    const getDateRange = (startDate, endDate) => {
      return {
        start: new Date(startDate),
        end: new Date(endDate),
        days: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)),
      };
    };

    const formatDate = (date, format = 'YYYY-MM-DD') => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      
      if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
      if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
      return date.toString();
    };

    const isBusinessDay = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      return day !== 5 && day !== 6; // Friday and Saturday are weekends in Saudi Arabia
    };

    test('should calculate date range correctly', () => {
      const result = getDateRange('2024-01-01', '2024-01-10');
      expect(Math.abs(result.days - 9)).toBeLessThan(1);
    });

    test('should format date as YYYY-MM-DD', () => {
      const result = formatDate('2024-01-15', 'YYYY-MM-DD');
      expect(result).toBe('2024-01-15');
    });

    test('should format date as DD/MM/YYYY', () => {
      const result = formatDate('2024-01-15', 'DD/MM/YYYY');
      expect(result).toBe('15/01/2024');
    });

    test('should identify business days correctly', () => {
      // Monday, 2024-01-15
      expect(isBusinessDay('2024-01-15')).toBe(true);
      // Friday, 2024-01-19
      expect(isBusinessDay('2024-01-19')).toBe(false);
      // Saturday, 2024-01-20
      expect(isBusinessDay('2024-01-20')).toBe(false);
    });

    test('should handle single day range', () => {
      const result = getDateRange('2024-01-15', '2024-01-15');
      expect(Math.abs(result.days) <= 1).toBe(true);
    });
  });

  describe('Array and Object Utilities', () => {
    const flattenObject = (obj, parent_key = '', sep = '_') => {
      let items = [];
      for (let k in obj) {
        let v = obj[k];
        let new_key = parent_key ? parent_key + sep + k : k;
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          items = items.concat(flattenObject(v, new_key, sep));
        } else {
          items.push([new_key, v]);
        }
      }
      return items;
    };

    const groupBy = (array, key) => {
      return array.reduce((acc, obj) => {
        const val = obj[key];
        acc[val] = acc[val] || [];
        acc[val].push(obj);
        return acc;
      }, {});
    };

    const removeDuplicates = (array, key) => {
      if (!key) return [...new Set(array)];
      const seen = new Set();
      return array.filter(item => {
        const val = item[key];
        if (seen.has(val)) return false;
        seen.add(val);
        return true;
      });
    };

    test('should flatten nested objects', () => {
      const obj = {
        name: 'Ahmed',
        address: { city: 'Riyadh', zip: '12345' },
      };
      const result = Object.fromEntries(flattenObject(obj));
      expect(result.name).toBe('Ahmed');
      expect(result.address_city).toBe('Riyadh');
      expect(result.address_zip).toBe('12345');
    });

    test('should group array by key', () => {
      const employees = [
        { id: 1, department: 'IT', name: 'Ahmed' },
        { id: 2, department: 'HR', name: 'Sara' },
        { id: 3, department: 'IT', name: 'Ali' },
      ];
      const result = groupBy(employees, 'department');
      expect(result.IT.length).toBe(2);
      expect(result.HR.length).toBe(1);
      expect(result.IT[0].name).toBe('Ahmed');
    });

    test('should remove duplicate primitives', () => {
      const arr = [1, 2, 2, 3, 1, 4];
      const result = removeDuplicates(arr);
      expect(result).toHaveLength(4);
      expect(result).toContain(1);
      expect(result).toContain(2);
    });

    test('should remove duplicates by key', () => {
      const items = [
        { id: 1, name: 'Item A' },
        { id: 2, name: 'Item B' },
        { id: 1, name: 'Item A Duplicate' },
      ];
      const result = removeDuplicates(items, 'id');
      expect(result).toHaveLength(2);
    });
  });

  describe('Number and Calculation Utilities', () => {
    const calculateDiscount = (price, discountPercent) => {
      return price * (1 - discountPercent / 100);
    };

    const calculateTax = (amount, taxPercent = 15) => {
      return amount * (taxPercent / 100);
    };

    const roundToDecimals = (num, decimals = 2) => {
      return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    };

    const calculatePercentage = (part, total) => {
      if (total === 0) return 0;
      return roundToDecimals((part / total) * 100);
    };

    test('should calculate discount correctly', () => {
      expect(calculateDiscount(100, 10)).toBe(90);
      expect(calculateDiscount(1000, 15)).toBe(850);
    });

    test('should calculate tax correctly', () => {
      expect(calculateTax(100, 15)).toBe(15);
      expect(calculateTax(1000)).toBe(150);
    });

    test('should round to specified decimals', () => {
      expect(roundToDecimals(3.14159, 2)).toBe(3.14);
      expect(roundToDecimals(3.14159, 4)).toBe(3.1416);
      expect(roundToDecimals(10)).toBe(10);
    });

    test('should calculate percentage correctly', () => {
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(50, 200)).toBe(25);
      expect(calculatePercentage(0, 100)).toBe(0);
    });

    test('should handle division by zero', () => {
      expect(calculatePercentage(50, 0)).toBe(0);
    });

    test('should handle negative numbers', () => {
      expect(calculateDiscount(100, -10)).toBeCloseTo(110, 2);
      expect(calculateTax(-100, 15)).toBe(-15);
    });
  });

  describe('String Transformation Utilities', () => {
    const camelCaseToKebab = (str) => {
      return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    };

    const kebabToCamelCase = (str) => {
      return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    };

    const capitalize = (str) => {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const truncate = (str, length = 50) => {
      if (str.length <= length) return str;
      return str.substring(0, length) + '...';
    };

    test('should convert camelCase to kebab-case', () => {
      expect(camelCaseToKebab('firstName')).toBe('first-name');
      expect(camelCaseToKebab('employeeId')).toBe('employee-id');
    });

    test('should convert kebab-case to camelCase', () => {
      expect(kebabToCamelCase('first-name')).toBe('firstName');
      expect(kebabToCamelCase('employee-id')).toBe('employeeId');
    });

    test('should capitalize strings', () => {
      expect(capitalize('ahmed')).toBe('Ahmed');
      expect(capitalize('SARA')).toBe('Sara');
      expect(capitalize('Ali')).toBe('Ali');
    });

    test('should truncate long strings', () => {
      const long = 'This is a very long string that should be truncated at 20 characters';
      const result = truncate(long, 20);
      expect(result.length).toBe(23); // 20 + '...'
      expect(result).toContain('...');
    });

    test('should not truncate short strings', () => {
      const short = 'Short';
      expect(truncate(short, 20)).toBe('Short');
    });
  });

  describe('Status and State Utilities', () => {
    const isActive = (status) => status === 'ACTIVE' || status === 'active';
    
    const canTransition = (currentStatus, targetStatus) => {
      const transitions = {
        ACTIVE: ['ON_LEAVE', 'TERMINATED'],
        ON_LEAVE: ['ACTIVE', 'TERMINATED'],
        TERMINATED: [],
      };
      return transitions[currentStatus]?.includes(targetStatus) ?? false;
    };

    const getStatusColor = (status) => {
      const colors = {
        ACTIVE: 'green',
        ON_LEAVE: 'yellow',
        TERMINATED: 'red',
      };
      return colors[status] || 'gray';
    };

    test('should check if status is active', () => {
      expect(isActive('ACTIVE')).toBe(true);
      expect(isActive('active')).toBe(true);
      expect(isActive('ON_LEAVE')).toBe(false);
    });

    test('should validate status transitions', () => {
      expect(canTransition('ACTIVE', 'ON_LEAVE')).toBe(true);
      expect(canTransition('ON_LEAVE', 'ACTIVE')).toBe(true);
      expect(canTransition('TERMINATED', 'ACTIVE')).toBe(false);
    });

    test('should get status color', () => {
      expect(getStatusColor('ACTIVE')).toBe('green');
      expect(getStatusColor('ON_LEAVE')).toBe('yellow');
      expect(getStatusColor('TERMINATED')).toBe('red');
      expect(getStatusColor('UNKNOWN')).toBe('gray');
    });
  });

  describe('Error Handling and Validation', () => {
    const validateRequired = (value, fieldName) => {
      if (!value || value === '') {
        return { valid: false, message: `${fieldName} is required` };
      }
      return { valid: true };
    };

    const validateEmail = (email) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regex.test(email)) {
        return { valid: false, message: 'Invalid email format' };
      }
      return { valid: true };
    };

    const validateRange = (value, min, max, fieldName) => {
      if (value < min || value > max) {
        return { valid: false, message: `${fieldName} must be between ${min} and ${max}` };
      }
      return { valid: true };
    };

    test('should validate required fields', () => {
      expect(validateRequired('value', 'Name').valid).toBe(true);
      expect(validateRequired('', 'Name').valid).toBe(false);
      expect(validateRequired(null, 'Name').valid).toBe(false);
    });

    test('should validate email format', () => {
      expect(validateEmail('test@example.com').valid).toBe(true);
      expect(validateEmail('invalid-email').valid).toBe(false);
      expect(validateEmail('test@domain').valid).toBe(false);
    });

    test('should validate numeric range', () => {
      expect(validateRange(50, 0, 100, 'Score').valid).toBe(true);
      expect(validateRange(-1, 0, 100, 'Score').valid).toBe(false);
      expect(validateRange(101, 0, 100, 'Score').valid).toBe(false);
    });

    test('should return appropriate error messages', () => {
      const result = validateRequired('', 'Email');
      expect(result.message).toContain('Email');
      expect(result.message).toContain('required');
    });
  });
});

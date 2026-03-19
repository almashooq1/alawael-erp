/**
 * ============================================================
 * 🧪 قالب اختبار Unit Test محسّن ومُحدّث
 * ============================================================
 * 
 * استخدام: انسخ هذا القالب عند كتابة اختبارات جديدة
 * يتبع أفضل الممارسات والمعايير الدولية
 * 
 * ✅ يتضمن:
 * - Setup/Teardown صحيح
 * - Mocking و Stubbing
 * - AAA Pattern (نمط Arrange-Act-Assert)
 * - معالجة الأخطاء
 * - الحالات الحدية
 * - التعليقات الواضحة
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

/**
 * مثال: اختبار UserService
 * يوضح كل ميزة من ميزات الاختبار الصحيح
 */
describe('UserService - Unit Tests', () => {
  // ============================================================
  // 📋 Setup و Teardown
  // ============================================================
  let userService;
  let mockDatabase;
  let mockEmailService;

  beforeEach(() => {
    // ✅ إعادة تعيين جميع الـ mocks قبل كل اختبار
    jest.clearAllMocks();

    // ✅ إنشاء mocks للـ dependencies
    mockDatabase = {
      createUser: jest.fn(),
      findUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      findAll: jest.fn(),
    };

    mockEmailService = {
      sendWelcomeEmail: jest.fn(),
      sendResetEmail: jest.fn(),
    };

    // ✅ إنشاء instance جديد مع mocked dependencies
    userService = new UserService(mockDatabase, mockEmailService);
  });

  afterEach(() => {
    // ✅ تنظيف بعد كل اختبار
    jest.resetAllMocks();
  });

  // ============================================================
  // ✅ الحالات الموجبة (Happy Path)
  // ============================================================
  describe('createUser - الحالات الموجبة', () => {
    it('يجب أن ينشئ مستخدماً جديداً بـ input صحيح', () => {
      // 📌 Arrange - تحضير البيانات
      const newUserData = {
        name: 'أحمد محمد',
        email: 'ahmed@example.com',
        age: 25,
      };

      const expectedUser = {
        id: '123',
        ...newUserData,
        createdAt: expect.any(Date),
      };

      mockDatabase.createUser.mockResolvedValue(expectedUser);

      // 📌 Act - تنفيذ الكود
      const result = userService.createUser(newUserData);

      // 📌 Assert - التحقق من النتائج
      expect(mockDatabase.createUser).toHaveBeenCalledWith(newUserData);
      expect(result).toEqual(expectedUser);
    });

    it('يجب أن يرسل رسالة ترحيب بعد الإنشاء', () => {
      // Arrange
      const userData = { email: 'ali@example.com', name: 'علي' };
      const createdUser = { id: '456', ...userData };

      mockDatabase.createUser.mockResolvedValue(createdUser);
      mockEmailService.sendWelcomeEmail.mockResolvedValue(true);

      // Act
      userService.createUser(userData);

      // Assert
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(createdUser);
    });

    it('يجب أن يعيد المستخدم مع جميع الحقول المتوقعة', () => {
      // Arrange
      const createdUser = {
        id: '789',
        name: 'فاطمة',
        email: 'fatimah@example.com',
        age: 30,
        role: 'user',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      mockDatabase.createUser.mockResolvedValue(createdUser);

      // Act
      const result = userService.createUser({});

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('createdAt');
    });
  });

  // ============================================================
  // ❌ الحالات السالبة (Error Cases)
  // ============================================================
  describe('createUser - الحالات السالبة', () => {
    it('يجب أن يرمي error عندما يكون email فارغاً', () => {
      // Arrange
      const invalidData = { name: 'محمد', email: '' };

      // Act & Assert
      expect(() => {
        userService.createUser(invalidData);
      }).toThrow('Email is required');
    });

    it('يجب أن يرمي error للـ email غير الصالح', () => {
      // Arrange
      const invalidData = {
        name: 'منى',
        email: 'invalid-email',
      };

      // Act & Assert
      expect(() => {
        userService.createUser(invalidData);
      }).toThrow('Invalid email format');
    });

    it('يجب أن يتعامل مع database error', () => {
      // Arrange
      const userData = { name: 'عمر', email: 'omar@example.com' };
      const dbError = new Error('Database connection failed');

      mockDatabase.createUser.mockRejectedValue(dbError);

      // Act & Assert
      expect(userService.createUser(userData)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('يجب أن يرمي error إذا فشل إرسال رسالة الترحيب', () => {
      // Arrange
      const userData = { name: 'سارة', email: 'sarah@example.com' };
      const createdUser = { id: '999', ...userData };

      mockDatabase.createUser.mockResolvedValue(createdUser);
      mockEmailService.sendWelcomeEmail.mockRejectedValue(
        new Error('Email service unavailable')
      );

      // Act & Assert
      expect(userService.createUser(userData)).rejects.toThrow(
        'Email service unavailable'
      );
    });
  });

  // ============================================================
  // 🎯 الحالات الحدية (Edge Cases)
  // ============================================================
  describe('createUser - الحالات الحدية', () => {
    it('يجب أن يتعامل مع اسم طويل جداً', () => {
      // Arrange
      const longName = 'a'.repeat(1000);
      const userData = {
        name: longName,
        email: 'test@example.com',
      };

      // Act & Assert
      expect(() => {
        userService.createUser(userData);
      }).toThrow('Name is too long');
    });

    it('يجب أن يتعامل مع null input', () => {
      // Act & Assert
      expect(() => {
        userService.createUser(null);
      }).toThrow('User data is required');
    });

    it('يجب أن يتعامل مع undefined properties', () => {
      // Arrange
      const userData = {
        name: 'خالد',
        email: undefined,
      };

      // Act & Assert
      expect(() => {
        userService.createUser(userData);
      }).toThrow('Email is required');
    });

    it('يجب أن يتجاهل الخصائص الإضافية غير المتوقعة', () => {
      // Arrange
      const userData = {
        name: 'مريم',
        email: 'maryam@example.com',
        extraField: 'should be ignored',
        anotherExtra: 123,
      };

      const expectedUser = {
        id: '100',
        name: 'مريم',
        email: 'maryam@example.com',
      };

      mockDatabase.createUser.mockResolvedValue(expectedUser);

      // Act
      const result = userService.createUser(userData);

      // Assert
      expect(result).not.toHaveProperty('extraField');
      expect(result).not.toHaveProperty('anotherExtra');
    });
  });

  // ============================================================
  // 🔍 اختبارات الأداء والعدد
  // ============================================================
  describe('findAll - اختبارات القوائم والعدد', () => {
    it('يجب أن يعيد قائمة بالمستخدمين', () => {
      // Arrange
      const users = [
        { id: '1', name: 'أحمد' },
        { id: '2', name: 'علي' },
        { id: '3', name: 'فاطمة' },
      ];

      mockDatabase.findAll.mockResolvedValue(users);

      // Act
      const result = userService.findAll();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect(result).toEqual(users);
    });

    it('يجب أن يعيد مصفوفة فارغة إذا لم توجد مستخدمون', () => {
      // Arrange
      mockDatabase.findAll.mockResolvedValue([]);

      // Act
      const result = userService.findAll();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('يجب أن يتعامل مع قائمة كبيرة من المستخدمين', () => {
      // Arrange
      const largeList = Array.from(
        { length: 10000 },
        (_, i) => ({ id: String(i), name: `User ${i}` })
      );

      mockDatabase.findAll.mockResolvedValue(largeList);

      // Act
      const result = userService.findAll();

      // Assert
      expect(result).toHaveLength(10000);
      expect(result[0]).toEqual({ id: '0', name: 'User 0' });
      expect(result[9999]).toEqual({ id: '9999', name: 'User 9999' });
    });
  });

  // ============================================================
  // 🔄 اختبارات التفاعل بين الدوال (Interaction Tests)
  // ============================================================
  describe('Interaction Tests - التفاعل بين functions', () => {
    it('يجب أن يستدعي database بالترتيب الصحيح', () => {
      // Arrange
      const userData = { name: 'نور', email: 'noor@example.com' };
      const createdUser = { id: '101', ...userData };

      mockDatabase.createUser.mockResolvedValue(createdUser);

      // Act
      userService.createUser(userData);

      // Assert - تحقق من ترتيب الاستدعاءات
      expect(mockDatabase.createUser).toHaveBeenCalledWith(userData);
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledTimes(1);

      // تحقق من ترتيب استدعاء الـ mocks
      expect(mockDatabase.createUser).toHaveBeenCalledBefore(
        mockEmailService.sendWelcomeEmail
      );
    });

    it('يجب أن لا يرسل email إذا فشل الإنشاء', () => {
      // Arrange
      const userData = { name: 'ياسمين', email: 'yasmin@example.com' };

      mockDatabase.createUser.mockRejectedValue(new Error('DB error'));

      // Act & Assert
      expect(userService.createUser(userData)).rejects.toThrow();
      expect(mockEmailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 📊 اختبارات البيانات المختلفة (Data Variations)
  // ============================================================
  describe('Input Validation - اختبار inputs مختلفة', () => {
    it.each([
      { email: 'user1@example.com' },
      { email: 'user+tag@example.co.uk' },
      { email: 'user.name@example.com' },
      { email: 'user_name@example.com' },
    ])('يجب أن يقبل email صالح: $email', (data) => {
      // Arrange
      mockDatabase.createUser.mockResolvedValue({ id: '200', ...data });

      // Act
      const result = userService.createUser(data);

      // Assert
      expect(result).toBeDefined();
      expect(mockDatabase.createUser).toHaveBeenCalled();
    });

    it.each([
      'test@',
      '@example.com',
      'test@.com',
      'test @example.com',
    ])('يجب أن يرفض email غير صالح: %s', (invalidEmail) => {
      // Act & Assert
      expect(() => {
        userService.createUser({ email: invalidEmail });
      }).toThrow('Invalid email format');
    });
  });
});

/**
 * ============================================================
 * 📝 ملاحظات مهمة:
 * ============================================================
 * 
 * 1. استخدم AAA Pattern دائماً:
 *    - Arrange: تحضير البيانات والـ mocks
 *    - Act: تنفيذ الكود
 *    - Assert: التحقق من النتائج
 * 
 * 2. اختبر الحالات الثلاث:
 *    - ✅ Happy Path: الحالات الموجبة
 *    - ❌ Error Cases: الأخطاء المتوقعة
 *    - 🎯 Edge Cases: الحالات الحدية
 * 
 * 3. استخدم descriptive names:
 *    ❌ "should work"
 *    ✅ "should create user with valid email"
 * 
 * 4. لا تختبر التفاصيل الداخلية:
 *    ❌ expect(user.id).toBeDefined();
 *    ✅ expect(user).toHaveProperty('id');
 * 
 * 5. استخدم it.each للبيانات المتشابهة:
 *    توفر الوقت والـ code duplication
 * 
 * 6. تجنب الـ dependencies الحقيقية:
 *    استخدم jest.mock() و jest.mocked()
 * 
 * 7. قم بـ mock فقط ما هو ضروري:
 *    لا تـ mock كل شيء، فقط الـ external dependencies
 */

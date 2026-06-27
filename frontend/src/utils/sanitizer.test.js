/**
 * Tests for Sanitizer Utility
 * فحوصات أداة التطهير
 */

import { sanitizeHtml, sanitizeText, sanitizeUrl, sanitizeObject } from '../utils/sanitizer';

describe('Sanitizer Utility', () => {
  describe('sanitizeHtml', () => {
    test('should allow safe tags', () => {
      const input = '<p>Hello <b>world</b>!</p>';
      expect(sanitizeHtml(input)).toBe('<p>Hello <b>world</b>!</p>');
    });

    test('should remove script tags', () => {
      const input = '<script>alert("xss")</script><p>Hello</p>';
      expect(sanitizeHtml(input)).toBe('<p>Hello</p>');
    });

    test('should remove event handlers', () => {
      const input = '<p onclick="alert(\'xss\')">Hello</p>';
      expect(sanitizeHtml(input)).toBe('<p>Hello</p>');
    });

    test('should return empty string for null/undefined', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
    });

    test('should return empty string for non-string', () => {
      expect(sanitizeHtml(123)).toBe('');
    });
  });

  describe('sanitizeText', () => {
    test('should remove all HTML tags', () => {
      const input = '<p>Hello <b>world</b>!</p>';
      expect(sanitizeText(input)).toBe('Hello world!');
    });

    test('should return plain text as-is', () => {
      const input = 'Hello world!';
      expect(sanitizeText(input)).toBe('Hello world!');
    });
  });

  describe('sanitizeUrl', () => {
    test('should allow http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
    });

    test('should allow https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
    });

    test('should allow mailto URLs', () => {
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    });

    test('should allow tel URLs', () => {
      expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
    });

    test('should block javascript URLs', () => {
      expect(sanitizeUrl('javascript:alert("xss")')).toBeNull();
    });

    test('should block data URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    });

    test('should allow relative URLs', () => {
      expect(sanitizeUrl('/dashboard')).toBe('/dashboard');
    });

    test('should return null for invalid URLs', () => {
      expect(sanitizeUrl('not-a-url')).toBeNull();
    });
  });

  describe('sanitizeObject', () => {
    test('should sanitize string values', () => {
      const input = { name: '<script>alert(1)</script>John' };
      expect(sanitizeObject(input)).toEqual({ name: 'alert(1)John' });
    });

    test('should preserve numbers', () => {
      const input = { age: 30 };
      expect(sanitizeObject(input)).toEqual({ age: 30 });
    });

    test('should preserve booleans', () => {
      const input = { active: true };
      expect(sanitizeObject(input)).toEqual({ active: true });
    });

    test('should handle nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          age: 30,
        },
      };
      expect(sanitizeObject(input)).toEqual({
        user: {
          name: 'John',
          age: 30,
        },
      });
    });

    test('should handle arrays', () => {
      const input = {
        tags: ['<script>evil</script>', 'good'],
      };
      expect(sanitizeObject(input)).toEqual({
        tags: ['evil', 'good'],
      });
    });
  });
});

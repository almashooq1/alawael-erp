import { FileManager, FileConfig } from '../src/modules/file-manager';
import { promises as fs } from 'fs';
import path from 'path';

describe('FileManager', () => {
  let fileManager: FileManager;
  const testDir = path.join(__dirname, '..', '.test-files');
  const testFile = path.join(testDir, 'test-file.txt');
  const testJsonFile = path.join(testDir, 'test.json');

  beforeEach(() => {
    fileManager = new FileManager();
  });

  afterEach(async () => {
    if (fileManager) {
      fileManager.clearOperations();
      fileManager.removeAllListeners();
    }
    // Cleanup test files
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization & Configuration', () => {
    it('should instantiate with default config', () => {
      const fm = new FileManager();
      expect(fm).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const config: Partial<FileConfig> = {
        encoding: 'utf-8',
        maxSize: 10485760
      };
      const fm = new FileManager(config);
      expect(fm).toBeDefined();
    });

    it('should throw error for invalid maxSize', () => {
      const invalidConfig: Partial<FileConfig> = { maxSize: 512 };
      expect(() => new FileManager(invalidConfig)).toThrow('Max size must be at least 1KB');
    });

    it('should throw error for missing encoding', () => {
      const invalidConfig: Partial<FileConfig> = { encoding: '' as any };
      expect(() => new FileManager(invalidConfig)).toThrow('Encoding is required');
    });

    it('should throw error for invalid extension types', () => {
      const invalidConfig: Partial<FileConfig> = {
        allowedExtensions: ['.txt', 123] as any
      };
      expect(() => new FileManager(invalidConfig)).toThrow('must be strings');
    });

    it('should accept allowed file extensions config', () => {
      const config: Partial<FileConfig> = {
        allowedExtensions: ['.txt', '.json', '.csv']
      };
      const fm = new FileManager(config);
      expect(fm).toBeDefined();
    });
  });

  describe('Write Operations', () => {
    it('should write file successfully', async () => {
      const testData = 'Hello, World!';
      await fileManager.write(testFile, testData);
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe(testData);
    });

    it('should throw error for missing path', async () => {
      await expect(fileManager.write('', 'data')).rejects.toThrow('File path is required');
    });

    it('should throw error for whitespace path', async () => {
      await expect(fileManager.write('   ', 'data')).rejects.toThrow('File path cannot be empty');
    });

    it('should throw error for oversized data', async () => {
      const config: Partial<FileConfig> = { maxSize: 2048 };
      const fm = new FileManager(config);
      const largeData = 'a'.repeat(3000);
      await expect(fm.write(testFile, largeData)).rejects.toThrow('exceeds max size');
    });

    it('should create missing directories', async () => {
      const nestedFile = path.join(testDir, 'nested', 'deep', 'file.txt');
      await fileManager.write(nestedFile, 'test data');
      
      const exists = await fileManager.exists(nestedFile);
      expect(exists).toBe(true);
    });

    it('should reject file with disallowed extension', async () => {
      const config: Partial<FileConfig> = {
        allowedExtensions: ['.txt', '.json']
      };
      const fm = new FileManager(config);
      
      await expect(fm.write(path.join(testDir, 'file.csv'), 'data')).rejects.toThrow('not allowed');
    });

    it('should accept file with allowed extension', async () => {
      const config: Partial<FileConfig> = {
        allowedExtensions: ['.txt', '.json']
      };
      const fm = new FileManager(config);
      
      await fm.write(testFile, 'test data');
      const exists = await fm.exists(testFile);
      expect(exists).toBe(true);
    });

    it('should overwrite existing file', async () => {
      await fileManager.write(testFile, 'Original content');
      await fileManager.write(testFile, 'New content');
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('New content');
    });

    it('should handle special characters in content', async () => {
      const specialContent = 'Special: !@#$%^&*()_+-=[]{}|;:,.<>?"\'\n\t';
      await fileManager.write(testFile, specialContent);
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe(specialContent);
    });

    it('should write unicode content', async () => {
      const unicodeContent = '你好世界 🌍 مرحبا بالعالم';
      await fileManager.write(testFile, unicodeContent);
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe(unicodeContent);
    });

    it('should write large content', async () => {
      const largeContent = 'A'.repeat(10000);
      await fileManager.write(testFile, largeContent);
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe(largeContent);
    });

    it('should handle JSON content', async () => {
      const jsonContent = JSON.stringify({ key: 'value', nested: { array: [1, 2, 3] } });
      await fileManager.write(testJsonFile, jsonContent);
      
      const content = await fs.readFile(testJsonFile, 'utf-8');
      expect(JSON.parse(content)).toEqual(JSON.parse(jsonContent));
    });
  });

  describe('Read Operations', () => {
    it('should read file successfully', async () => {
      const testData = 'Test content';
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFile, testData, 'utf-8');
      
      const content = await fileManager.read(testFile);
      expect(content).toBe(testData);
    });

    it('should throw error for missing path', async () => {
      await expect(fileManager.read('')).rejects.toThrow('File path is required');
    });

    it('should throw error for non-existent file', async () => {
      await expect(fileManager.read(testFile)).rejects.toThrow();
    });

    it('should read file with special characters', async () => {
      const specialContent = 'Special: !@#$%^&*()_+-=[]{}|;:,.<>?';
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFile, specialContent, 'utf-8');
      
      const content = await fileManager.read(testFile);
      expect(content).toBe(specialContent);
    });

    it('should read unicode content', async () => {
      const unicodeContent = '你好世界 مرحبا';
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFile, unicodeContent, 'utf-8');
      
      const content = await fileManager.read(testFile);
      expect(content).toBe(unicodeContent);
    });

    it('should read large file', async () => {
      const largeContent = 'B'.repeat(100000);
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFile, largeContent, 'utf-8');
      
      const content = await fileManager.read(testFile);
      expect(content).toBe(largeContent);
    });
  });

  describe('Append Operations', () => {
    it('should append to existing file', async () => {
      await fileManager.write(testFile, 'Line 1\n');
      await fileManager.append(testFile, 'Line 2\n');
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('Line 1\nLine 2\n');
    });

    it('should create file if not exists', async () => {
      await fileManager.append(testFile, 'New line');
      
      const exists = await fileManager.exists(testFile);
      expect(exists).toBe(true);
    });

    it('should throw error for missing path', async () => {
      await expect(fileManager.append('', 'data')).rejects.toThrow('File path is required');
    });

    it('should throw error for oversized data', async () => {
      const config: Partial<FileConfig> = { maxSize: 2048 };
      const fm = new FileManager(config);
      const largeData = 'a'.repeat(3000);
      await expect(fm.append(testFile, largeData)).rejects.toThrow('exceeds max size');
    });

    it('should append multiple times', async () => {
      await fileManager.append(testFile, 'First\n');
      await fileManager.append(testFile, 'Second\n');
      await fileManager.append(testFile, 'Third\n');
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('First\nSecond\nThird\n');
    });
  });

  describe('Delete Operations', () => {
    it('should delete file successfully', async () => {
      await fileManager.write(testFile, 'content');
      await fileManager.delete(testFile);
      
      const exists = await fileManager.exists(testFile);
      expect(exists).toBe(false);
    });

    it('should throw error for missing path', async () => {
      await expect(fileManager.delete('')).rejects.toThrow('File path is required');
    });

    it('should throw error for non-existent file', async () => {
      await expect(fileManager.delete(testFile)).rejects.toThrow();
    });
  });

  describe('Exists Operations', () => {
    it('should return true for existing file', async () => {
      await fileManager.write(testFile, 'content');
      
      const exists = await fileManager.exists(testFile);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const exists = await fileManager.exists(testFile);
      expect(exists).toBe(false);
    });

    it('should return false for missing path gracefully', async () => {
      const result = await fileManager.exists('');
      expect(result).toBe(false);
    });
  });

  describe('Stats Operations', () => {
    it('should get file stats', async () => {
      await fileManager.write(testFile, 'test content');
      
      const stats = await fileManager.getStats(testFile);
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('created');
      expect(stats).toHaveProperty('modified');
      expect(stats).toHaveProperty('accessed');
      expect(stats.isFile).toBe(true);
      expect(stats.isDirectory).toBe(false);
    });

    it('should get directory stats', async () => {
      await fileManager.write(testFile, 'test content'); // This creates testDir
      const stats = await fileManager.getStats(testDir);
      expect(stats.isDirectory).toBe(true);
    });
  });

  describe('Operation Tracking', () => {
    it('should track file operations', async () => {
      await fileManager.write(testFile, 'data');
      await fileManager.read(testFile);
      
      const count = fileManager.getOperationCount();
      expect(count).toBe(2);
    });

    it('should track append operations', async () => {
      await fileManager.write(testFile, 'line 1\n');
      await fileManager.append(testFile, 'line 2\n');
      
      const count = fileManager.getOperationCount();
      expect(count).toBe(2);
    });

    it('should get all operations', async () => {
      await fileManager.write(testFile, 'data');
      await fileManager.read(testFile);
      
      const allOps = fileManager.getAllOperations();
      expect(allOps.length).toBe(2);
      expect(allOps[0]).toHaveProperty('operationId');
      expect(allOps[0]).toHaveProperty('info');
    });

    it('should clear operations', async () => {
      await fileManager.write(testFile, 'data');
      expect(fileManager.getOperationCount()).toBe(1);
      
      fileManager.clearOperations();
      expect(fileManager.getOperationCount()).toBe(0);
    });

    it('should return null for non-existent operation', () => {
      const info = fileManager.getOperationInfo('non-existent');
      expect(info).toBeNull();
    });

    it('should store operation info correctly', async () => {
      await fileManager.write(testFile, 'test data');
      const allOps = fileManager.getAllOperations();
      
      expect(allOps[0].info).toHaveProperty('operation');
      expect(allOps[0].info).toHaveProperty('path');
      expect(allOps[0].info).toHaveProperty('size');
      expect(allOps[0].info).toHaveProperty('timestamp');
      expect(allOps[0].info).toHaveProperty('status');
    });
  });

  describe('Event Emission', () => {
    it('should emit fileWritten event', (done) => {
      fileManager.once('fileWritten', (data) => {
        expect(data).toHaveProperty('operationId');
        expect(data).toHaveProperty('path');
        expect(data).toHaveProperty('size');
        expect(data).toHaveProperty('timestamp');
        done();
      });
      
      fileManager.write(testFile, 'test data').catch(() => {});
    });

    it('should emit fileRead event', async () => {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFile, 'test', 'utf-8');
      
      return new Promise((done) => {
        fileManager.once('fileRead', (data) => {
          expect(data).toHaveProperty('operationId');
          expect(data).toHaveProperty('path');
          expect(data).toHaveProperty('size');
          done();
        });
        
        fileManager.read(testFile).catch(() => {});
      });
    });

    it('should emit fileAppended event', (done) => {
      fileManager.once('fileAppended', (data) => {
        expect(data).toHaveProperty('operationId');
        expect(data).toHaveProperty('path');
        done();
      });
      
      fileManager.append(testFile, 'append data').catch(() => {});
    });

    it('should emit fileDeleted event', (done) => {
      const testDeleteFile = path.join(testDir, 'to-delete.txt');
      
      fileManager.once('fileDeleted', (data) => {
        expect(data).toHaveProperty('operationId');
        expect(data).toHaveProperty('path');
        done();
      });
      
      fileManager.write(testDeleteFile, 'delete me').then(() => {
        fileManager.delete(testDeleteFile).catch(() => {});
      }).catch(() => {});
    });

    it('should emit fileError event on error', (done) => {
      fileManager.once('fileError', (data) => {
        expect(data).toHaveProperty('operation');
        expect(data).toHaveProperty('path');
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('timestamp');
        done();
      });
      
      fileManager.read('').catch(() => {});
    });

    it('should allow multiple event listeners', async () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      
      fileManager.on('fileWritten', spy1);
      fileManager.on('fileWritten', spy2);
      
      await fileManager.write(testFile, 'test');
      
      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });
  });

  describe('Configuration Management', () => {
    it('should return current config', () => {
      const config = fileManager.getConfig();
      expect(config).toHaveProperty('encoding');
      expect(config).toHaveProperty('maxSize');
    });

    it('should not modify returned config', () => {
      const config = fileManager.getConfig();
      config.encoding = 'ascii';
      
      const newConfig = fileManager.getConfig();
      expect(newConfig.encoding).toBe('utf-8');
    });
  });

  describe('Instance Isolation', () => {
    it('should not share state between instances', async () => {
      const fm1 = new FileManager();
      const fm2 = new FileManager();
      
      await fm1.write(testFile, 'fm1 data');
      await fm2.write(path.join(testDir, 'fm2.txt'), 'fm2 data');
      
      expect(fm1.getOperationCount()).toBe(1);
      expect(fm2.getOperationCount()).toBe(1);
    });

    it('should not share configuration between instances', () => {
      const fm1 = new FileManager({ encoding: 'utf-8', maxSize: 102400 });
      const fm2 = new FileManager({ encoding: 'utf-8', maxSize: 204800 });
      
      expect(fm1.getConfig().maxSize).toBe(102400);
      expect(fm2.getConfig().maxSize).toBe(204800);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file', async () => {
      await fileManager.write(testFile, '');
      const content = await fileManager.read(testFile);
      expect(content).toBe('');
    });

    it('should handle file with only whitespace', async () => {
      const whitespaceContent = '   \n\n\t\t  ';
      await fileManager.write(testFile, whitespaceContent);
      const content = await fileManager.read(testFile);
      expect(content).toBe(whitespaceContent);
    });

    it('should handle file paths with spaces', async () => {
      const fileWithSpaces = path.join(testDir, 'file with spaces.txt');
      await fileManager.write(fileWithSpaces, 'test');
      
      const exists = await fileManager.exists(fileWithSpaces);
      expect(exists).toBe(true);
    });

    it('should handle relative and absolute paths', async () => {
      const absolutePath = path.join(testDir, 'absolute.txt');
      await fileManager.write(absolutePath, 'test');
      const exists = await fileManager.exists(absolutePath);
      expect(exists).toBe(true);
    });
  });
});

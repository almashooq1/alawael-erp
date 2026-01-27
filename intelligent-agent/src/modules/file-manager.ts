// وحدة إدارة الملفات (File Manager)
import { promises as fs } from 'fs';

export class FileManager {
  async read(path: string): Promise<string> {
    return fs.readFile(path, 'utf-8');
  }

  async write(path: string, data: string): Promise<void> {
    await fs.writeFile(path, data, 'utf-8');
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}

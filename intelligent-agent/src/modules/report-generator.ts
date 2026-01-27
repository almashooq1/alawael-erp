// وحدة توليد التقارير (Report Generator)
import { FileManager } from './file-manager';

export class ReportGenerator {
  constructor(private fileManager: FileManager) {}

  async generateReport(data: any, path: string) {
    const content = JSON.stringify(data, null, 2);
    await this.fileManager.write(path, content);
    return path;
  }
}

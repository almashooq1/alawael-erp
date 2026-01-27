import { ReportGenerator } from '../src/modules/report-generator';
import { FileManager } from '../src/modules/file-manager';

describe('ReportGenerator', () => {
  it('should generate report file', async () => {
    const fileManager = new FileManager();
    const report = new ReportGenerator(fileManager);
    const path = 'test-report.json';
    await report.generateReport({ a: 1 }, path);
    const content = await fileManager.read(path);
    expect(content).toContain('a');
  });
});

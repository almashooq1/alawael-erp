import { NLPModule } from '../src/modules/nlp-module';

describe('NLPModule', () => {
  it('should detect positive sentiment', () => {
    const nlp = new NLPModule();
    const result = nlp.analyzeText('هذا نص جيد للاختبار');
    expect(result.sentiment).toBe('إيجابي');
  });

  it('should extract keywords longer than 3 chars', () => {
    const nlp = new NLPModule();
    const result = nlp.analyzeText('مرحبا بكم في النظام الذكي');
    expect(result.keywords).toContain('مرحبا');
    expect(result.keywords).toContain('النظام');
    expect(result.keywords).toContain('الذكي');
  });
});

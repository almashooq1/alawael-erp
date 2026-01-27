// وحدة القياس (Metrics)
export class Metrics {
  private counters: Record<string, number> = {};

  increment(metric: string) {
    this.counters[metric] = (this.counters[metric] || 0) + 1;
  }

  get(metric: string) {
    return this.counters[metric] || 0;
  }
}

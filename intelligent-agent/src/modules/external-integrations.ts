// External Integrations Module
// Stubs for ERP, CRM, Teams, Slack integrations. In production, connect to real APIs.
export type IntegrationType = 'erp' | 'crm' | 'teams' | 'slack';

export interface IntegrationConfig {
  id: string;
  type: IntegrationType;
  name: string;
  config: any;
  enabled: boolean;
}

export class ExternalIntegrations {
  private configs: IntegrationConfig[] = [];

  addIntegration(cfg: Omit<IntegrationConfig, 'id'>) {
    const c: IntegrationConfig = { ...cfg, id: Math.random().toString(36).slice(2) };
    this.configs.push(c);
    return c;
  }

  removeIntegration(id: string) {
    this.configs = this.configs.filter(c => c.id !== id);
  }

  listIntegrations() {
    return this.configs;
  }

  setEnabled(id: string, enabled: boolean) {
    const c = this.configs.find(x => x.id === id);
    if (c) c.enabled = enabled;
  }

  // Example: send ticket to integration (stub)
  sendTicket(type: IntegrationType, ticket: any) {
    // In production, call real API
    return { ok: true, type, ticket };
  }
}

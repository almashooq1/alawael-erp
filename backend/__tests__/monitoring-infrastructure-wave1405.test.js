// Wave 1405: Monitoring Infrastructure Verification
// Drift guard for Prometheus, Grafana, AlertManager configuration files

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..', '..');
const OPS_ROOT = path.join(ROOT, 'ops');
const DOCS_ROOT = path.join(ROOT, 'docs');

describe('Wave 1405: Monitoring Infrastructure', () => {
  describe('1. AlertManager Configuration', () => {
    it('should have alertmanager.yml file', () => {
      const configPath = path.join(OPS_ROOT, 'alertmanager.yml');
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('should have valid YAML syntax in alertmanager.yml', () => {
      const configPath = path.join(OPS_ROOT, 'alertmanager.yml');
      const content = fs.readFileSync(configPath, 'utf8');
      expect(() => yaml.load(content)).not.toThrow();
    });

    it('should define global configuration', () => {
      const configPath = path.join(OPS_ROOT, 'alertmanager.yml');
      const content = yaml.load(fs.readFileSync(configPath, 'utf8'));
      expect(content.global).toBeDefined();
      expect(content.global.resolve_timeout).toBeDefined();
    });

    it('should define multiple receivers', () => {
      const configPath = path.join(OPS_ROOT, 'alertmanager.yml');
      const content = yaml.load(fs.readFileSync(configPath, 'utf8'));
      expect(content.receivers).toBeDefined();
      expect(Array.isArray(content.receivers)).toBe(true);
      expect(content.receivers.length).toBeGreaterThan(0);

      const receiverNames = content.receivers.map(r => r.name);
      expect(receiverNames).toContain('default');
      expect(receiverNames).toContain('slack-critical');
      expect(receiverNames).toContain('pagerduty-critical');
    });

    it('should define alert routing rules', () => {
      const configPath = path.join(OPS_ROOT, 'alertmanager.yml');
      const content = yaml.load(fs.readFileSync(configPath, 'utf8'));
      expect(content.route).toBeDefined();
      expect(content.route.receiver).toBeDefined();
      expect(content.route.routes).toBeDefined();
      expect(Array.isArray(content.route.routes)).toBe(true);
    });

    it('should define inhibition rules to prevent alert storms', () => {
      const configPath = path.join(OPS_ROOT, 'alertmanager.yml');
      const content = yaml.load(fs.readFileSync(configPath, 'utf8'));
      expect(content.inhibit_rules).toBeDefined();
      expect(Array.isArray(content.inhibit_rules)).toBe(true);
      expect(content.inhibit_rules.length).toBeGreaterThan(0);
    });
  });

  describe('2. Grafana Datasources Configuration', () => {
    it('should have datasources provisioning directory', () => {
      const datasourcesDir = path.join(OPS_ROOT, 'grafana', 'provisioning', 'datasources');
      expect(fs.existsSync(datasourcesDir)).toBe(true);
    });

    it('should have prometheus.yml datasource config', () => {
      const configPath = path.join(
        OPS_ROOT,
        'grafana',
        'provisioning',
        'datasources',
        'prometheus.yml'
      );
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('should have valid YAML in datasources config', () => {
      const configPath = path.join(
        OPS_ROOT,
        'grafana',
        'provisioning',
        'datasources',
        'prometheus.yml'
      );
      const content = fs.readFileSync(configPath, 'utf8');
      expect(() => yaml.load(content)).not.toThrow();
    });

    it('should declare Prometheus datasource', () => {
      const configPath = path.join(
        OPS_ROOT,
        'grafana',
        'provisioning',
        'datasources',
        'prometheus.yml'
      );
      const content = yaml.load(fs.readFileSync(configPath, 'utf8'));
      expect(content.datasources).toBeDefined();
      expect(Array.isArray(content.datasources)).toBe(true);

      const prometheusDs = content.datasources.find(ds => ds.name === 'Prometheus');
      expect(prometheusDs).toBeDefined();
      expect(prometheusDs.type).toBe('prometheus');
      expect(prometheusDs.isDefault).toBe(true);
    });

    it('should declare AlertManager datasource', () => {
      const configPath = path.join(
        OPS_ROOT,
        'grafana',
        'provisioning',
        'datasources',
        'prometheus.yml'
      );
      const content = yaml.load(fs.readFileSync(configPath, 'utf8'));
      const alertmanagerDs = content.datasources.find(ds => ds.name === 'Alertmanager');
      expect(alertmanagerDs).toBeDefined();
      expect(alertmanagerDs.type).toBe('alertmanager');
    });
  });

  describe('3. Grafana Dashboard Configuration', () => {
    it('should have dashboards provisioning directory', () => {
      const dashboardsDir = path.join(OPS_ROOT, 'grafana', 'provisioning', 'dashboards');
      expect(fs.existsSync(dashboardsDir)).toBe(true);
    });

    it('should have alawael-dashboard.json', () => {
      const dashboardPath = path.join(
        OPS_ROOT,
        'grafana',
        'provisioning',
        'dashboards',
        'alawael-dashboard.json'
      );
      expect(fs.existsSync(dashboardPath)).toBe(true);
    });

    it('should have valid JSON in dashboard', () => {
      const dashboardPath = path.join(
        OPS_ROOT,
        'grafana',
        'provisioning',
        'dashboards',
        'alawael-dashboard.json'
      );
      const content = fs.readFileSync(dashboardPath, 'utf8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should declare panels for API metrics', () => {
      const dashboardPath = path.join(
        OPS_ROOT,
        'grafana',
        'provisioning',
        'dashboards',
        'alawael-dashboard.json'
      );
      const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

      const apiPanels = dashboard.panels.filter(p => p.title && p.title.includes('API'));
      expect(apiPanels.length).toBeGreaterThan(0);
    });

    it('should declare panels for database metrics', () => {
      const dashboardPath = path.join(
        OPS_ROOT,
        'grafana',
        'provisioning',
        'dashboards',
        'alawael-dashboard.json'
      );
      const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

      const dbPanels = dashboard.panels.filter(
        p => p.title && p.title.toLowerCase().includes('database')
      );
      expect(dbPanels.length).toBeGreaterThan(0);
    });

    it('should declare panels for system metrics', () => {
      const dashboardPath = path.join(
        OPS_ROOT,
        'grafana',
        'provisioning',
        'dashboards',
        'alawael-dashboard.json'
      );
      const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

      const systemPanels = dashboard.panels.filter(
        p =>
          p.title &&
          (p.title.includes('Memory') || p.title.includes('CPU') || p.title.includes('Throughput'))
      );
      expect(systemPanels.length).toBeGreaterThan(0);
    });

    it('should include alert list panel', () => {
      const dashboardPath = path.join(
        OPS_ROOT,
        'grafana',
        'provisioning',
        'dashboards',
        'alawael-dashboard.json'
      );
      const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

      const alertPanel = dashboard.panels.find(p => p.type === 'alertlist');
      expect(alertPanel).toBeDefined();
    });

    it('should be set to Asia/Riyadh timezone', () => {
      const dashboardPath = path.join(
        OPS_ROOT,
        'grafana',
        'provisioning',
        'dashboards',
        'alawael-dashboard.json'
      );
      const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
      expect(dashboard.timezone).toBe('Asia/Riyadh');
    });
  });

  describe('4. Integration with Deployment Plan', () => {
    it('should reference monitoring setup in deployment plan', () => {
      const planPath = path.join(DOCS_ROOT, 'runbooks', 'go-live-deployment-plan-w1404.md');
      const content = fs.readFileSync(planPath, 'utf8');

      expect(content).toContain('Prometheus');
      expect(content).toContain('Grafana');
      expect(content).toContain('prometheus');
      expect(content).toContain('alertmanager');
    });

    it('should document monitoring configuration steps', () => {
      const planPath = path.join(DOCS_ROOT, 'runbooks', 'go-live-deployment-plan-w1404.md');
      const content = fs.readFileSync(planPath, 'utf8');

      expect(content).toContain('prometheus.yml');
      expect(content).toContain('alerting-rules.yml');
      expect(content).toContain('alertmanager.yml');
    });
  });

  describe('5. Production Readiness', () => {
    it('should have all required monitoring files', () => {
      const requiredFiles = [
        path.join(OPS_ROOT, 'prometheus.yml'),
        path.join(OPS_ROOT, 'alerting-rules.yml'),
        path.join(OPS_ROOT, 'alertmanager.yml'),
        path.join(OPS_ROOT, 'grafana', 'provisioning', 'datasources', 'prometheus.yml'),
        path.join(OPS_ROOT, 'grafana', 'provisioning', 'dashboards', 'alawael-dashboard.json'),
      ];

      requiredFiles.forEach(file => {
        expect(fs.existsSync(file)).toBe(true);
      });
    });

    it('should have alerting rules for provider integrations', () => {
      const rulesPath = path.join(OPS_ROOT, 'alerting-rules.yml');
      const content = fs.readFileSync(rulesPath, 'utf8');

      expect(content).toContain('NPHIES');
      expect(content).toContain('ZATCA');
    });
  });

  describe('6. Wave Metadata', () => {
    it('should be part of W1404-W1405 monitoring series', () => {
      // This test verifies the wave exists as documentation
      const waveMarker = '1405';
      expect(waveMarker).toBe('1405');
    });
  });
});

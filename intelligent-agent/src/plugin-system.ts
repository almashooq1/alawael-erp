// نظام Plugins لتوسعة النظام
export interface AgentPlugin {
  name: string;
  init(): void;
}

export class PluginSystem {
  private plugins: AgentPlugin[] = [];
  register(plugin: AgentPlugin) {
    this.plugins.push(plugin);
    plugin.init();
  }
  list() {
    return this.plugins.map(p => p.name);
  }
}

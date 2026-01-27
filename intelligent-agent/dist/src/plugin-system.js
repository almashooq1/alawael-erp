"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginSystem = void 0;
class PluginSystem {
    constructor() {
        this.plugins = [];
    }
    register(plugin) {
        this.plugins.push(plugin);
        plugin.init();
    }
    list() {
        return this.plugins.map(p => p.name);
    }
}
exports.PluginSystem = PluginSystem;

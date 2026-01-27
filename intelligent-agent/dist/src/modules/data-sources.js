"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSource = addSource;
exports.updateSource = updateSource;
exports.listSources = listSources;
exports.removeSource = removeSource;
const sources = [];
function addSource(type, name, config, schedule) {
    const src = {
        id: Math.random().toString(36).slice(2),
        type, name, config, enabled: true, schedule
    };
    sources.push(src);
    return src;
}
function updateSource(id, patch) {
    const src = sources.find(s => s.id === id);
    if (src)
        Object.assign(src, patch);
    return src;
}
function listSources() {
    return sources;
}
function removeSource(id) {
    const idx = sources.findIndex(s => s.id === id);
    if (idx >= 0)
        sources.splice(idx, 1);
}

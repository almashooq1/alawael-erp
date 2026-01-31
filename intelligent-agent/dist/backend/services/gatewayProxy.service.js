"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyRequest = void 0;
const buildTargetUrl = (baseUrl, targetPath) => {
    const normalizedBase = baseUrl.replace(/\/$/, '');
    const normalizedPath = targetPath.replace(/^\//, '');
    if (!normalizedPath)
        return normalizedBase;
    return `${normalizedBase}/${normalizedPath}`;
};
const extractTargetPath = (originalUrl) => {
    return originalUrl.replace(/^\/api\/gateway\/[^/]+\/?/, '');
};
const shouldSendBody = (method) => !['GET', 'HEAD'].includes(method.toUpperCase());
const proxyRequest = async (config, req) => {
    const targetPath = extractTargetPath(req.originalUrl || req.url || '');
    const targetUrl = buildTargetUrl(config.baseUrl, targetPath);
    const headers = {};
    Object.entries(req.headers || {}).forEach(([key, value]) => {
        if (!value)
            return;
        if (key.toLowerCase() === 'host')
            return;
        if (key.toLowerCase() === 'content-length')
            return;
        headers[key] = Array.isArray(value) ? value.join(',') : String(value);
    });
    let body = undefined;
    if (shouldSendBody(req.method)) {
        if (req.body && Object.keys(req.body).length > 0) {
            const contentType = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
            if (contentType.includes('application/json')) {
                body = JSON.stringify(req.body);
            }
            else {
                body = req.body;
            }
        }
    }
    const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
    });
    const contentType = response.headers.get('content-type') || 'application/json';
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
        status: response.status,
        contentType,
        buffer,
    };
};
exports.proxyRequest = proxyRequest;

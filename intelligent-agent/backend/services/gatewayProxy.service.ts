type ProxyConfig = {
  serviceName: string;
  baseUrl: string;
};

const buildTargetUrl = (baseUrl: string, targetPath: string) => {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const normalizedPath = targetPath.replace(/^\//, '');
  if (!normalizedPath) return normalizedBase;
  return `${normalizedBase}/${normalizedPath}`;
};

const extractTargetPath = (originalUrl: string) => {
  return originalUrl.replace(/^\/api\/gateway\/[^/]+\/?/, '');
};

const shouldSendBody = (method: string) => !['GET', 'HEAD'].includes(method.toUpperCase());

export const proxyRequest = async (config: ProxyConfig, req: any) => {
  const targetPath = extractTargetPath(req.originalUrl || req.url || '');
  const targetUrl = buildTargetUrl(config.baseUrl, targetPath);

  const headers: Record<string, string> = {};
  Object.entries(req.headers || {}).forEach(([key, value]) => {
    if (!value) return;
    if (key.toLowerCase() === 'host') return;
    if (key.toLowerCase() === 'content-length') return;
    headers[key] = Array.isArray(value) ? value.join(',') : String(value);
  });

  let body: any = undefined;
  if (shouldSendBody(req.method)) {
    if (req.body && Object.keys(req.body).length > 0) {
      const contentType = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
      if (contentType.includes('application/json')) {
        body = JSON.stringify(req.body);
      } else {
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

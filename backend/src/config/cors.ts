import type { CorsOptions } from 'cors';

function normalizeOriginUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function parseFrontendUrls(): string[] {
  const raw = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000';
  return raw
    .split(',')
    .map((part) => normalizeOriginUrl(part))
    .filter((url): url is string => Boolean(url));
}

function isAllowedFrontendOrigin(origin: string): boolean {
  const normalizedOrigin = normalizeOriginUrl(origin);
  if (!normalizedOrigin) return false;

  const allowed = parseFrontendUrls();
  if (allowed.includes('*') || allowed.includes(normalizedOrigin)) return true;

  try {
    const { hostname } = new URL(normalizedOrigin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname.endsWith('.vercel.app')) return true;
    // Production custom domain (ugcflow.com.au + www + subdomains)
    if (hostname === 'ugcflow.com.au' || hostname.endsWith('.ugcflow.com.au')) return true;
  } catch {
    return false;
  }

  return false;
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Non-browser clients (curl, Postman) send no Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (isAllowedFrontendOrigin(origin)) {
      callback(null, origin);
      return;
    }

    console.warn(`CORS blocked for origin: ${origin}`);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

import crypto from 'crypto';

export interface PreviewProxyConfig {
  previewId: string;
  projectId: string;
  revisionId: string;
  capability: string;
  capabilityHash: string;
  frontendUpstream: string; // e.g. "http://frontend:3000"
  backendUpstream: string;  // e.g. "http://backend:8000"
  hasFrontend: boolean;
  hasBackend: boolean;
  cspAllowedAncestors: string[];
}

export class PreviewProxyService {
  /**
   * Generates a secure, hardened nginx configuration for the preview proxy container.
   * Strips Cookie, Set-Cookie, and Authorization headers.
   * Enforces CSP frame-ancestors for TayDau Force trusted UI embedding.
   * Routes /p/<capability>/api/* to backend, /p/<capability>/* to frontend with SPA fallback.
   */
  static generateNginxConfig(config: PreviewProxyConfig): string {
    const ancestors = config.cspAllowedAncestors.join(' ');
    const cap = config.capability;

    return `
events {
    worker_connections 512;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "frame-ancestors ${ancestors}; default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;" always;

    upstream backend_service {
        server ${config.backendUpstream.replace('http://', '')};
    }

    upstream frontend_service {
        server ${config.frontendUpstream.replace('http://', '')};
    }

    server {
        listen 80;
        server_name localhost;

        client_max_body_size 10M;

        # Block direct root access without capability
        location = / {
            return 403 "Forbidden: Preview capability required\\n";
        }

        # Capability-scoped routing
        location /p/${cap}/ {
            # Strip capability prefix before forwarding
            rewrite ^/p/${cap}/(.*)$ /$1 break;

            # Strip cookies and auth credentials
            proxy_set_header Cookie "";
            proxy_set_header Authorization "";
            proxy_set_header Proxy-Authorization "";
            proxy_hide_header Set-Cookie;

            # Proxy headers
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeout governance
            proxy_connect_timeout 15s;
            proxy_read_timeout 30s;
            proxy_send_timeout 30s;

            ${config.hasFrontend ? `
            proxy_pass ${config.frontendUpstream};
            proxy_intercept_errors on;
            error_page 404 = @spa_fallback;
            ` : `
            proxy_pass ${config.backendUpstream};
            `}
        }

        # Backend API routing under capability
        location /p/${cap}/api/ {
            # Keep /api prefix for backend
            rewrite ^/p/${cap}/api/(.*)$ /api/$1 break;

            proxy_set_header Cookie "";
            proxy_set_header Authorization "";
            proxy_set_header Proxy-Authorization "";
            proxy_hide_header Set-Cookie;

            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

            proxy_connect_timeout 15s;
            proxy_read_timeout 30s;
            proxy_send_timeout 30s;

            proxy_pass ${config.backendUpstream};
        }

        # SPA history fallback for frontend client-side routing
        location @spa_fallback {
            rewrite ^ /p/${cap}/index.html break;
            proxy_pass ${config.frontendUpstream};
        }

        # Reject any other route
        location / {
            return 403 "Forbidden: Invalid preview path\\n";
        }
    }
}
`.trim();
  }

  /**
   * Generates a cryptographically strong capability token and its SHA-256 hash.
   */
  static generateCapability(): { capability: string; capabilityHash: string } {
    const capability = `cap_${crypto.randomBytes(16).toString('hex')}`;
    const capabilityHash = crypto.createHash('sha256').update(capability).digest('hex');
    return { capability, capabilityHash };
  }
}

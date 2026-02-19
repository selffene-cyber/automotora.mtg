/**
 * MTG Automotora Worker
 * Basic static file server with D1 database access
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve static files from _next/static
    if (path.startsWith('/_next/static/')) {
      // Try to serve from the built assets
      return new Response('Static assets not available in this deployment', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Handle API routes - return message that they need full Next.js setup
    if (path.startsWith('/api/')) {
      // Check if database is available
      if (!env.DB) {
        return new Response(JSON.stringify({ 
          error: 'Database not configured',
          message: 'API requires D1 database binding'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        message: 'API endpoint working',
        path: path,
        method: request.method
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Serve the main page
    return new Response(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MTG Automotora - Coming Soon</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
      background: linear-gradient(90deg, #00d4ff, #7b2ff7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      font-size: 1.25rem;
      color: #a0a0a0;
      margin-bottom: 2rem;
    }
    .status {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid #00d4ff;
      border-radius: 4px;
      color: #00d4ff;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>MTG Automotora</h1>
    <p>Plataforma de gestión automotriz en construcción</p>
    <div class="status">✓ Worker Desplegado Exitosamente</div>
    <p style="margin-top: 2rem; font-size: 0.9rem;">
      Ambiente: ${env.ENVIRONMENT || 'development'}<br>
      Endpoint: ${path}
    </p>
  </div>
</body>
</html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};

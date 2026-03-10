// frontend/index.js - BFF (Backend for Frontend)
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Config
const PORT = process.env.PORT || 8081;
const LB_BASE_URL = process.env.LB_BASE_URL || 'http://nginx';

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'UP', service: 'frontend-bff', port: PORT, upstream: LB_BASE_URL });
});

// Servir les fichiers statiques AVANT le proxy pour éviter de proxier les fichiers HTML/CSS/JS
app.use(express.static('public'));

// Proxy API : /api/* → nginx (LB)
// Express strip le prefix '/api', donc req.url = /auth/register, /accounts, /users, etc.
// Ce sont exactement les paths attendus par nginx.
app.use(
  '/api',
  createProxyMiddleware({
    target: LB_BASE_URL,
    changeOrigin: true,
    pathRewrite: { '^/': '/' },
    onProxyReq(proxyReq, req) {
      proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
      proxyReq.setHeader('X-Frontend', 'bff');
    },
  })
);

app.listen(PORT, () => {
  console.log(`[BFF] Frontend API démarrée sur le port ${PORT}`);
  console.log(`[BFF] Proxy vers LB : ${LB_BASE_URL}`);
  console.log(`  Health     : http://localhost:${PORT}/health`);
  console.log(`  API proxy  : http://localhost:${PORT}/api/* → ${LB_BASE_URL}/*`);
});

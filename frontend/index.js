// frontend/index.js - BFF (Backend for Frontend)
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(express.json());

// Config
const PORT = process.env.PORT || 8081;
// IMPORTANT : l'URL interne du LB dans le réseau docker (le service s'appelle "nginx" dans docker-compose)
const LB_BASE_URL = process.env.LB_BASE_URL || 'http://nginx';

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'UP', service: 'frontend-bff', port: PORT, upstream: LB_BASE_URL });
});

// Proxies d'API : on expose /api/... côté frontend et on envoie vers le LB
// NOTE: adapte les chemins si ton nginx.conf route /accounts/, /users/, /transferts/, /notifications/

// Accounts
app.use(
  '/api/accounts',
  createProxyMiddleware({
    target: `${LB_BASE_URL}`,
    changeOrigin: true,
    pathRewrite: {
      '^/api/accounts': '/accounts', // /api/accounts -> /accounts
    },
    onProxyReq(proxyReq, req) {
      proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
      proxyReq.setHeader('X-Frontend', 'bff');
    },
  })
);

// Users
app.use(
  '/api/users',
  createProxyMiddleware({
    target: `${LB_BASE_URL}`,
    changeOrigin: true,
    pathRewrite: {
      '^/api/users': '/users',
    },
    onProxyReq(proxyReq, req) {
      proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
      proxyReq.setHeader('X-Frontend', 'bff');
    },
  })
);

// Notifications
app.use(
  '/api/notifications',
  createProxyMiddleware({
    target: `${LB_BASE_URL}`,
    changeOrigin: true,
    pathRewrite: {
      '^/api/notifications': '/notifications',
    },
    onProxyReq(proxyReq, req) {
      proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
      proxyReq.setHeader('X-Frontend', 'bff');
    },
  })
);

// Transferts
app.use(
  '/api/transferts',
  createProxyMiddleware({
    target: `${LB_BASE_URL}`,
    changeOrigin: true,
    pathRewrite: {
      '^/api/transferts': '/transferts',
    },
    onProxyReq(proxyReq, req) {
      proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
      proxyReq.setHeader('X-Frontend', 'bff');
    },
  })
);

// (Optionnel) servir du statique si tu le souhaites depuis ce BFF
// app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`[BFF] Frontend API démarrée sur le port ${PORT}`);
  console.log(`[BFF] Proxy vers LB : ${LB_BASE_URL}`);
  console.log(`  Health     : http://localhost:${PORT}/health`);
  console.log(`  Accounts   : http://localhost:${PORT}/api/accounts`);
  console.log(`  Users      : http://localhost:${PORT}/api/users`);
  console.log(`  Notifs     : http://localhost:${PORT}/api/notifications`);
  console.log(`  Transferts : http://localhost:${PORT}/api/transferts`);
});

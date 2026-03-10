const express = require('express');
const app = express();
app.use(express.json());

const cors = require("cors");
app.use(cors());
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).json({});
    }
    next();
});
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { PORT } = require('./config');


// ─── Swagger ──────────────────────────────────────────────────────────────────

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Service API',
      version: '1.0.0',
      description: 'Microservice de gestion des utilisateurs bancaires avec authentification JWT',
    },
    servers: [{ url: `http://localhost:${PORT}`, description: 'Serveur local' }],
    tags: [
      { name: 'Auth', description: 'Inscription, connexion et profil courant' },
      { name: 'Users', description: 'CRUD utilisateurs (token requis)' },
      { name: 'Health', description: 'Santé du service' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        UserPublic: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'usr-2' },
            firstName: { type: 'string', example: 'Jean' },
            lastName: { type: 'string', example: 'Martin' },
            email: { type: 'string', example: 'jean.martin@bank.fr' },
            role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total:      { type: 'integer', example: 42 },
            page:       { type: 'integer', example: 1 },
            limit:      { type: 'integer', example: 10 },
            totalPages: { type: 'integer', example: 5 },
            hasNext:    { type: 'boolean', example: true },
            hasPrev:    { type: 'boolean', example: false },
          },
        },
        PaginatedUsers: {
          type: 'object',
          properties: {
            data:       { type: 'array', items: { $ref: '#/components/schemas/UserPublic' } },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Token manquant ou invalide',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Forbidden: {
          description: 'Droits insuffisants',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));

app.get('/health', (req, res) => {
  console.log('serveur port : ', PORT);
  res.json({ status: 'UP', service: 'user-service', port: PORT });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n User Service démarré sur le port ${PORT}`);
  console.log(`   Swagger UI  : http://localhost:${PORT}/api-docs`);
  console.log(`   GET         : http://localhost:${PORT}/health`);
  console.log(`   POST        : http://localhost:${PORT}/auth/register`);
  console.log(`   POST        : http://localhost:${PORT}/auth/login`);
  console.log(`   GET         : http://localhost:${PORT}/auth/me`);
  console.log(`   GET         : http://localhost:${PORT}/users`);
  console.log(`   GET/PUT/DEL : http://localhost:${PORT}/users/:id\n`);
});
const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { PORT } = require('./config');

const app = express();
app.use(express.json());

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
const router = express.Router();
const db = require('../db'); // selon ton organisation
const pagination = require('../middleware/pagination');

// ─── GET /users — paginé ────────────────────────────────────────────────
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lister les utilisateurs
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0 }
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [USER, ADMIN]
 *         description: Filtrer par rôle utilisateur
 *     responses:
 *       200:
 *         description: Liste paginée des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedUsers'
 */
router.get('/', pagination(10, 100), (req, res) => {
  const { limit, page, offset } = req.pagination;
  const role = req.query.role?.toUpperCase();

  const where = role ? 'WHERE role = ?' : '';
  const params = role ? [role, limit, offset] : [limit, offset];

  const rows = db
    .prepare(`SELECT id, firstName, lastName, email, role, createdAt
              FROM users
              ${where}
              ORDER BY createdAt DESC
              LIMIT ? OFFSET ?`)
    .all(...params);

  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM users ${where}`)
    .get(...(role ? [role] : []))
    .count;

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return res.status(200).json({
    data: rows,
    pagination: { total, page, limit, totalPages, hasNext, hasPrev },
  });
});

app.get('/health', (req, res) => {
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
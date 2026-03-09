const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const accountsRouter = require('./routes/accounts');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;

// ─── Swagger ──────────────────────────────────────────────────────────────────
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Account Service API',
      version: '1.0.0',
      description: 'Microservice de gestion des comptes bancaires (soldes, débit/crédit)',
    },
    servers: [{ url: `http://localhost:${PORT}`, description: 'Serveur local' }],
    tags: [
      { name: 'Accounts', description: 'Création et opérations sur les comptes' },
      { name: 'Health', description: 'Santé du service' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Account: {
          type: 'object',
          properties: {
            id:       { type: 'string', example: 'acc-1' },
            ownerId:  { type: 'string', example: 'usr-2' },
            balance:  { type: 'number', example: 2500.5 },
            createdAt:{ type: 'string', format: 'date-time' },
          },
          
        },
        CreateAccountInput: {
          type: 'object',
          required: ['ownerId'],
          properties: {
            ownerId: { type: 'string', example: 'usr-2' },
            balance: { type: 'number', example: 1000, default: 0 },
          },
        },
        AmountInput: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: { type: 'number', minimum: 0.01, example: 150.25 },
          },
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
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
      },
      responses: {
        NotFound: {
          description: 'Ressource introuvable',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        BadRequest: {
          description: 'Requête invalide',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Unauthorized: {
          description: 'Token manquant ou invalide',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
  },
  apis: ['./routes/*.js', './index.js'], // on documente les routes via JSDoc
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/accounts', accountsRouter);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Vérifier la santé du service
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service opérationnel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: UP }
 *                 service:{ type: string, example: account-service }
 *                 port:   { type: integer, example: 3003 }
 */
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'account-service', port: PORT });
});

app.listen(PORT, () => {
  console.log(`\n Account Service démarré sur le port ${PORT}`);
  console.log(`   Swagger UI  : http://localhost:${PORT}/api-docs`);
  console.log(`   GET         : http://localhost:${PORT}/health`);
  console.log(`   POST        : http://localhost:${PORT}/accounts`);
  console.log(`   GET         : http://localhost:${PORT}/accounts/:id`);
  console.log(`   GET         : http://localhost:${PORT}/accounts?ownerId=usr-2`);
  console.log(`   PATCH       : http://localhost:${PORT}/accounts/:id/debit`);
  console.log(`   PATCH       : http://localhost:${PORT}/accounts/:id/credit\n`);
});



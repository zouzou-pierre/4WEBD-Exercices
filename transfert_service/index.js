const express = require("express");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const transfersRouter = require("./routes/transfers");
const auth = require("./middleware/auth");

const app = express();
app.use(express.json());
app.use(auth);

const PORT = process.env.PORT || 3004;

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Transfer Service API",
      version: "1.0.0",
      description: "Service des virements bancaires avec règles USER / ADMIN"
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    tags: [
      { name: "Transfers", description: "Création & historique des virements" },
      { name: "Health", description: "Santé du service" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  },
  apis: ["./routes/*.js", "./index.js"]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/transfers", transfersRouter);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Vérification état du service
 *     tags: [Health]
 */
app.get("/health", (req, res) => {
  res.json({ status: "UP", service: "transfer-service", port: PORT });
});

app.listen(PORT, () => {
  console.log(`Transfer Service running on port ${PORT}`);
  console.log(`Swagger: http://localhost:${PORT}/api-docs`);
});
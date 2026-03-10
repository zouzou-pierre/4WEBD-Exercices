const express = require("express");
const router = express.Router();
const db = require('/app/shared/db');
const pagination = require('/app/shared/middleware/pagination');
/**
 * @swagger
 * /transfers:
 *   get:
 *     summary: Lister les virements (paginé)
 *     tags: [Transfers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: Numéro de page (commence à 1)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0 }
 *         description: Décalage absolu (prioritaire sur 'page')
 *     responses:
 *       200:
 *         description: Liste paginée des virements
 *         headers:
 *           Link:
 *             description: Liens de pagination RFC 5988 (self, next, prev, last)
 *             schema: { type: string }
 *           X-Total-Count:
 *             description: Nombre total d'éléments
 *             schema: { type: integer }
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Transfer' }
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
// 👇 Ajoute le middleware ici
router.get("/", pagination(10, 100), (req, res) => {
  const { limit, page, offset } = req.pagination;

  const data = db.prepare(`
    SELECT * FROM transfers
    ORDER BY createdAt DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare(`SELECT COUNT(*) AS c FROM transfers`).get().c;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  // Link header (next/prev/last/self)
  const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
  const makeUrl = (p) => `${baseURL}?page=${p}&limit=${limit}`;
  const links = [
    `<${makeUrl(page)}>; rel="self"`,
    hasPrev ? `<${makeUrl(page - 1)}>; rel="prev"` : null,
    hasNext ? `<${makeUrl(page + 1)}>; rel="next"` : null,
    `<${makeUrl(totalPages)}>; rel="last"`,
  ].filter(Boolean).join(', ');

  res.set('Link', links);
  res.set('X-Total-Count', String(total));
  res.set('Cache-Control', 'no-store');

  res.json({
    data,
    pagination: { total, page, limit, totalPages, hasNext, hasPrev }
  });
});

/**
 * @swagger
 * /transferts:
 *   post:
 *     summary: Effectuer un virement
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromAccountId, toAccountId, amount]
 *             properties:
 *               fromAccountId:
 *                 type: string
 *                 example: acc_123
 *               toAccountId:
 *                 type: string
 *                 example: acc_456
 *               amount:
 *                 type: number
 *                 example: 100
 *               currency:
 *                 type: string
 *                 default: EUR
 *     responses:
 *       201:
 *         description: Virement effectué
 *       400:
 *         description: Paramètres invalides ou solde insuffisant
 */
router.post("/", (req, res) => {
  const { fromAccountId, toAccountId, amount, currency = "EUR" } = req.body;

  if (!fromAccountId || !toAccountId || !amount) {
    return res.status(400).json({ error: "fromAccountId, toAccountId et amount sont requis" });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: "Le montant doit être positif" });
  }

  if (fromAccountId === toAccountId) {
    return res.status(400).json({ error: "Les comptes source et destination doivent être différents" });
  }

  const fromAccount = db.prepare("SELECT * FROM accounts WHERE id = ?").get(fromAccountId);
  if (!fromAccount) {
    return res.status(404).json({ error: "Compte source introuvable" });
  }

  const toAccount = db.prepare("SELECT * FROM accounts WHERE id = ?").get(toAccountId);
  if (!toAccount) {
    return res.status(404).json({ error: "Compte destination introuvable" });
  }

  if (fromAccount.balance < amount) {
    return res.status(400).json({ error: "Solde insuffisant" });
  }

  const id = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();
  const executedBy = req.user.id;

  const runTransfer = db.transaction(() => {
    db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(amount, fromAccountId);
    db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(amount, toAccountId);
    db.prepare(
      "INSERT INTO transfers (id, fromAccountId, toAccountId, amount, currency, executedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, fromAccountId, toAccountId, amount, currency, executedBy, createdAt);
  });

  try {
    runTransfer();
    console.log(`[TRANSFER] ${id} : ${fromAccountId} → ${toAccountId} | ${amount} ${currency} par ${executedBy}`);
    res.status(201).json({ id, fromAccountId, toAccountId, amount, currency, executedBy, createdAt });
  } catch (err) {
    console.error("[TRANSFER] Erreur:", err);
    res.status(500).json({ error: "Erreur lors du virement" });
  }
});

module.exports = router;
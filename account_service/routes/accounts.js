const express = require('express');
const router = express.Router();
const { db, nextId } = require('../db');
const pagination = require('../middleware/pagination');

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Lister les comptes d'un utilisateur (paginé)
 *     tags: [Accounts]
 *     parameters:
 *       - in: query
 *         name: ownerId
 *         required: true
 *         schema: { type: string }
 *         description: ID de l'utilisateur propriétaire des comptes
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: Numéro de page (commence à 1). Ignoré si 'offset' est fourni.
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
 *         description: Liste paginée des comptes de l'utilisateur
 *         headers:
 *           Link:
 *             description: Liens de pagination RFC 5988 (self, next, prev, last)
 *             schema: { type: string }
 *           X-Total-Count:
 *             description: Nombre total d'éléments correspondant au filtre
 *             schema: { type: integer }
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Account' }
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400: { $ref: '#/components/responses/BadRequest' }
 */
router.get('/', pagination(10, 100), (req, res) => {
  const ownerId = req.query.ownerId;
  if (!ownerId) return res.status(400).json({ error: 'ownerId requis' });

  const { limit, page, offset } = req.pagination;

  const data = db.prepare(`
    SELECT * FROM accounts
    WHERE ownerId = ?
    ORDER BY createdAt DESC
    LIMIT ? OFFSET ?
  `).all(ownerId, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) AS c FROM accounts WHERE ownerId = ?
  `).get(ownerId).c;

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  // Build Link header
  const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
  const makeUrl = (p) => `${baseURL}?ownerId=${encodeURIComponent(ownerId)}&page=${p}&limit=${limit}`;
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
 * /accounts/{id}:
 *   get:
 *     summary: Récupérer un compte par ID
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Compte
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Account' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', (req, res) => {
  const acc = db.prepare(`SELECT * FROM accounts WHERE id = ?`).get(req.params.id);
  if (!acc) return res.status(404).json({ error: 'Compte introuvable' });
  res.json(acc);
});

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Lister les comptes d'un utilisateur
 *     tags: [Accounts]
 *     parameters:
 *       - in: query
 *         name: ownerId
 *         required: true
 *         schema: { type: string }
 *         description: ID de l'utilisateur propriétaire des comptes
 *     responses:
 *       200:
 *         description: Liste des comptes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Account' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 */
router.get('/', (req, res) => {
  const ownerId = req.query.ownerId;
  if (!ownerId) return res.status(400).json({ error: 'ownerId requis' });

  const list = db.prepare(`SELECT * FROM accounts WHERE ownerId = ?`).all(ownerId);
  res.json(list);
});

/**
 * @swagger
 * /accounts/{id}/debit:
 *   patch:
 *     summary: Débiter un compte
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AmountInput' }
 *     responses:
 *       200:
 *         description: Nouveau solde après débit
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { success: { type: boolean }, balance: { type: number } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch('/:id/debit', (req, res) => {
  const { amount } = req.body;
  const acc = db.prepare(`SELECT * FROM accounts WHERE id = ?`).get(req.params.id);
  if (!acc) return res.status(404).json({ error: 'Compte introuvable' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount invalide' });
  if (acc.balance < amount) return res.status(400).json({ error: 'Solde insuffisant' });

  const newBalance = acc.balance - amount;
  db.prepare(`UPDATE accounts SET balance = ? WHERE id = ?`).run(newBalance, req.params.id);
  res.json({ success: true, balance: newBalance });
});

/**
 * @swagger
 * /accounts/{id}/credit:
 *   patch:
 *     summary: Créditer un compte
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AmountInput' }
 *     responses:
 *       200:
 *         description: Nouveau solde après crédit
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { success: { type: boolean }, balance: { type: number } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch('/:id/credit', (req, res) => {
  const { amount } = req.body;
  const acc = db.prepare(`SELECT * FROM accounts WHERE id = ?`).get(req.params.id);
  if (!acc) return res.status(404).json({ error: 'Compte introuvable' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount invalide' });

  const newBalance = acc.balance + amount;
  db.prepare(`UPDATE accounts SET balance = ? WHERE id = ?`).run(newBalance, req.params.id);
  res.json({ success: true, balance: newBalance });
});

module.exports = router;
``
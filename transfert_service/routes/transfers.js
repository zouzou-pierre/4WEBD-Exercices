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

module.exports = router;
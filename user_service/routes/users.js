const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../shared/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

const findById    = (id)    => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
const findByEmail = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lister tous les utilisateurs (admin uniquement)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page (commence à 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Liste paginée des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedUsers'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', adminOnly, (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const data  = db.prepare('SELECT * FROM users ORDER BY createdAt DESC LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const users = data.map(({ password, ...u }) => u);

  console.log(`[USERS] Liste demandée par admin: ${req.user.id} — page ${page}/${totalPages}`);

  return res.status(200).json({
    data: users,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Obtenir un utilisateur par ID
 *     description: Un utilisateur peut consulter son propre profil. Un admin peut consulter n'importe quel profil.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: usr-2
 *     responses:
 *       200:
 *         description: Utilisateur trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserPublic'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Utilisateur introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;

  if (req.user.id !== id && req.user.role !== 'ADMIN') {
    console.log(`[USERS] Accès refusé — ${req.user.id} tente de lire le profil de ${id}`);
    return res.status(403).json({ error: 'Accès interdit' });
  }

  const user = findById(id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  console.log(`[USERS] Profil consulté — id: ${id}`);
  const { password, ...userPublic } = user;
  return res.status(200).json(userPublic);
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Mettre à jour un utilisateur
 *     description: Un utilisateur peut modifier son propre profil. Un admin peut modifier n'importe quel profil.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: usr-2
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Utilisateur mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserPublic'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Utilisateur introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;

  if (req.user.id !== id && req.user.role !== 'ADMIN') {
    console.log(`[USERS] Modification refusée — ${req.user.id} tente de modifier ${id}`);
    return res.status(403).json({ error: 'Accès interdit' });
  }

  if (!findById(id)) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const { firstName, lastName, email, password } = req.body;

  if (email) {
    const existing = findByEmail(email);
    if (existing && existing.id !== id) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }
  }

  const fields = {};
  if (firstName) fields.firstName = firstName;
  if (lastName)  fields.lastName  = lastName;
  if (email)     fields.email     = email;
  if (password)  fields.password  = await bcrypt.hash(password, 10);

  if (Object.keys(fields).length === 0) {
    const user = findById(id);
    const { password: _, ...userPublic } = user;
    return res.status(200).json(userPublic);
  }

  const setClauses = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(fields), id];
  db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`).run(...values);

  console.log(`[USERS] Utilisateur mis à jour — id: ${id}`);

  const updated = findById(id);
  const { password: _, ...userPublic } = updated;
  return res.status(200).json(userPublic);
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Supprimer un utilisateur (admin uniquement)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: usr-2
 *     responses:
 *       200:
 *         description: Utilisateur supprimé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Utilisateur usr-2 supprimé
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Utilisateur introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', adminOnly, (req, res) => {
  const { id } = req.params;

  if (!findById(id)) return res.status(404).json({ error: 'Utilisateur introuvable' });

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  console.log(`[USERS] Utilisateur supprimé — id: ${id} par admin: ${req.user.id}`);

  return res.status(200).json({ message: `Utilisateur ${id} supprimé` });
});

module.exports = router;

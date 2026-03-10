const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const db = require('../shared/db');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');

const router = express.Router();

const findByEmail = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email);
const findById   = (id)    => db.prepare('SELECT * FROM users WHERE id = ?').get(id);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Créer un compte utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Jean
 *               lastName:
 *                 type: string
 *                 example: Martin
 *               email:
 *                 type: string
 *                 example: jean.martin@bank.fr
 *               password:
 *                 type: string
 *                 example: motdepasse123
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN]
 *                 default: USER
 *     responses:
 *       201:
 *         description: Compte créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserPublic'
 *       400:
 *         description: Données invalides ou email déjà utilisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, role = 'USER' } = req.body;

  console.log(`[AUTH] Tentative d'inscription — email: ${email}`);

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'Tous les champs sont requis : firstName, lastName, email, password' });
  }

  if (findByEmail(email)) {
    console.log(`[AUTH] Email déjà utilisé — ${email}`);
    return res.status(400).json({ error: 'Cet email est déjà utilisé' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: 'usr-' + randomUUID(),
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role: role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER',
    createdAt: new Date().toISOString(),
  };

  db.prepare(
    'INSERT INTO users (id, firstName, lastName, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(newUser.id, newUser.firstName, newUser.lastName, newUser.email, newUser.password, newUser.role, newUser.createdAt);

  console.log(`[AUTH] Inscription réussie — id: ${newUser.id}, email: ${newUser.email}, role: ${newUser.role}`);

  const { password: _, ...userPublic } = newUser;
  return res.status(201).json(userPublic);
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Se connecter et obtenir un token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: jean.martin@bank.fr
 *               password:
 *                 type: string
 *                 example: motdepasse123
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   $ref: '#/components/schemas/UserPublic'
 *       400:
 *         description: Champs manquants
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Identifiants incorrects
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  console.log(`[AUTH] Tentative de connexion — email: ${email}`);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const user = findByEmail(email);
  if (!user) {
    console.log(`[AUTH] Utilisateur introuvable — ${email}`);
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    console.log(`[AUTH] Mot de passe incorrect — ${email}`);
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  console.log(`[AUTH] Connexion réussie — id: ${user.id}, role: ${user.role}`);

  const { password: _, ...userPublic } = user;
  return res.status(200).json({ token, user: userPublic });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obtenir son propre profil (token requis)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil de l'utilisateur connecté
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserPublic'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', require('../middleware/auth').authMiddleware, (req, res) => {
  const user = findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  console.log(`[AUTH] Profil consulté — id: ${user.id}`);

  const { password: _, ...userPublic } = user;
  return res.status(200).json(userPublic);
});

module.exports = router;

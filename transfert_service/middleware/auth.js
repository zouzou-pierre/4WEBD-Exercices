const jwt = require("jsonwebtoken");
require('dotenv').config();

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;

  // Aucun header Authorization
  if (!header) {
    return res.status(401).json({ error: "Token manquant (Authorization: Bearer <token>)" });
  }

  // Mauvais format → pas commençant par Bearer
  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Format du token invalide. Utilise: Bearer <token>" });
  }

  const token = parts[1];

  try {
    // Décoder et vérifier le token (secret = celui du user-service)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ajout des infos du user à la requête
    // exemple: { id: "usr-3", role: "USER", iat: ..., exp: ... }
    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
};
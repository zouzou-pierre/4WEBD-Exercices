// /shared/middleware/pagination.js
module.exports = function pagination(defaultLimit = 10, maxLimit = 100) {
  return (req, res, next) => {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    let limit = parseInt(req.query.limit || String(defaultLimit), 10);
    if (isNaN(limit) || limit < 1) limit = defaultLimit;
    if (limit > maxLimit) limit = maxLimit;

    const offset = req.query.offset
      ? Math.max(0, parseInt(req.query.offset, 10))
      : (page - 1) * limit;

    req.pagination = { page, limit, offset };
    next();
  };
};
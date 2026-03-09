// middleware/pagination.js
function pagination(defaultLimit = 10, maxLimit = 100) {
  return (req, _res, next) => {
    const q = req.query;

    const rawLimit  = Number(q.limit);
    const rawPage   = Number(q.page);
    const rawOffset = Number(q.offset);

    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, maxLimit)
      : defaultLimit;

    let page   = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    let offset = Number.isFinite(rawOffset) && rawOffset >= 0
      ? Math.floor(rawOffset)
      : (page - 1) * limit;

    // Si offset est fourni, on le priorise et on recalcule la page
    if (Number.isFinite(rawOffset) && rawOffset >= 0) {
      page = Math.floor(offset / limit) + 1;
    }

    req.pagination = { limit, page, offset };
    next();
  };
}

module.exports = pagination;
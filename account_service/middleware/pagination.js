// account_service/middleware/pagination.js
function pagination(defaultLimit = 10, maxLimit = 100) {
  return (req, _res, next) => {
    const rawLimit  = Number(req.query.limit);
    const rawPage   = Number(req.query.page);
    const rawOffset = Number(req.query.offset);

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
// Limitatore minimale in memoria (nessuna dipendenza) per le rotte pubbliche.
module.exports = function rateLimit({ windowMs = 60_000, max = 60 } = {}) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    let e = hits.get(key);
    if (!e || e.reset <= now) { e = { count: 0, reset: now + windowMs }; hits.set(key, e); }
    if (++e.count > max) {
      res.set('Retry-After', Math.ceil((e.reset - now) / 1000));
      return res.status(429).json({ error: 'Troppe richieste, riprova tra poco' });
    }
    next();
  };
};

export const ok = (res, data = null, meta = null, status = 200) =>
  res.status(status).json({ success: true, data, meta });

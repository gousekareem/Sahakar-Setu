import { AppError } from "../utils/AppError.js";

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return next(
      new AppError("Validation failed", 422, result.error.flatten())
    );
  }
  req.body = result.data;
  next();
};

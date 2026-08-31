import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import * as authService from "../services/auth.service.js";

export const registerCustomer = asyncHandler(async (req, res) => {
  const result = await authService.registerCustomer(req.body);
  ok(res, result, null, 201);
});

export const registerWorker = asyncHandler(async (req, res) => {
  const result = await authService.registerWorker(req.body);
  ok(res, result, null, 201);
});

export const registerInstitution = asyncHandler(async (req, res) => {
  const result = await authService.registerInstitutionUser(req.body);
  ok(res, result, null, 201);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  ok(res, result);
});

export const me = asyncHandler(async (req, res) => {
  const result = await authService.me(req.user.id);
  ok(res, result);
});

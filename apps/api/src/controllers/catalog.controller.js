import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import * as catalogService from "../services/catalog.service.js";

export const listCategories = asyncHandler(async (req, res) => {
  ok(res, await catalogService.listCategories());
});

export const listEmergencyCategories = asyncHandler(async (req, res) => {
  ok(res, await catalogService.listEmergencyCategories());
});

export const listSocieties = asyncHandler(async (req, res) => {
  ok(res, await catalogService.listSocieties());
});

export const publicStats = asyncHandler(async (req, res) => {
  ok(res, await catalogService.publicStats());
});

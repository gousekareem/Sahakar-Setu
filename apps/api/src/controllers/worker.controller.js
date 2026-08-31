import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import * as workerService from "../services/worker.service.js";

export const nearby = asyncHandler(async (req, res) => {
  const { categoryId, latitude, longitude, isEmergency } = req.query;
  ok(res, await workerService.nearbyWorkers({ categoryId, latitude, longitude, isEmergency }));
});

export const publicProfile = asyncHandler(async (req, res) => {
  ok(res, await workerService.getWorkerPublicProfile(req.params.id));
});

export const dashboard = asyncHandler(async (req, res) => {
  ok(res, await workerService.dashboard(req.user.id));
});

export const setAvailability = asyncHandler(async (req, res) => {
  ok(res, await workerService.setAvailability(req.user.id, req.body));
});

export const updateLocation = asyncHandler(async (req, res) => {
  ok(res, await workerService.updateLocation(req.user.id, req.body));
});

export const updateBankDetails = asyncHandler(async (req, res) => {
  ok(res, await workerService.updateBankDetails(req.user.id, req.body));
});

export const blockDate = asyncHandler(async (req, res) => {
  ok(res, await workerService.blockDate(req.user.id, req.body.date, req.body.reason));
});

export const myJobs = asyncHandler(async (req, res) => {
  ok(res, await workerService.myJobs(req.user.id, req.query.status));
});

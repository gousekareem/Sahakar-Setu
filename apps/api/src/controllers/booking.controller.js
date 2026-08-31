import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import * as bookingService from "../services/booking.service.js";

export const create = asyncHandler(async (req, res) => {
  const result = await bookingService.createBooking(req.user.id, req.body);
  ok(res, result, null, 201);
});

export const emergency = asyncHandler(async (req, res) => {
  const result = await bookingService.emergencyRequest(req.user.id, req.body);
  ok(res, result, null, 201);
});

export const list = asyncHandler(async (req, res) => {
  ok(res, await bookingService.myBookings(req.user.id, req.query.status));
});

export const getOne = asyncHandler(async (req, res) => {
  ok(res, await bookingService.getBooking(req.params.id));
});

export const setStatus = asyncHandler(async (req, res) => {
  const updated = await bookingService.transition(req.params.id, req.user.id, req.user.role, req.body.status, req.body);
  ok(res, updated);
});

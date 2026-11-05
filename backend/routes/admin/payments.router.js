import express from "express";
import { listPaymentRecords, listTransactions } from "../../controllers/admin/payments.controller.js";

const router = express.Router();

// GET /api/admin/payments               — payment records per booking (filters: status, method, from, to, search)
router.get("/", listPaymentRecords);
// GET /api/admin/payments/transactions  — money in/out ledger
router.get("/transactions", listTransactions);

export default router;

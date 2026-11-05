import express from "express";
import {
    listExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getReceipt,
    getExpenseSummary,
} from "../../controllers/admin/expenses.controller.js";

const router = express.Router();

router.get("/", listExpenses);
router.get("/summary", getExpenseSummary); // before /:expenseId
router.post("/", createExpense);
router.get("/:expenseId/receipt", getReceipt);
router.patch("/:expenseId", updateExpense);
router.delete("/:expenseId", deleteExpense);

export default router;

import mongoose from "mongoose";

// Receipt file for an expense (max ~2 MB, stored in MongoDB — no extra storage service needed).
const expenseReceiptSchema = new mongoose.Schema(
    {
        expense: { type: mongoose.Schema.Types.ObjectId, ref: "Expense", required: true, unique: true },
        data: { type: Buffer, required: true },
    },
    { timestamps: true }
);

const ExpenseReceipt = mongoose.model("ExpenseReceipt", expenseReceiptSchema);
export default ExpenseReceipt;

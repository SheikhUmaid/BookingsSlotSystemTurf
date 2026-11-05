import mongoose from "mongoose";

export const EXPENSE_CATEGORIES = [
    "electricity",
    "rent",
    "salaries",
    "maintenance",
    "equipment",
    "marketing",
    "other",
];

const expenseSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 120 },
        category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
        amount: { type: Number, required: true, min: 0.01 },
        // Venue-local calendar day (UTC midnight), same convention as Booking.date
        date: { type: Date, required: true },
        description: { type: String, trim: true, default: "" },
        // Receipt bytes live in ExpenseReceipt so listing expenses stays light.
        receipt: {
            filename: { type: String },
            mime_type: { type: String },
            size: { type: Number },
        },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });

const Expense = mongoose.model("Expense", expenseSchema);
export default Expense;

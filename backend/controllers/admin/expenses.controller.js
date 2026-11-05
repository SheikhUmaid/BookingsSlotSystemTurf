import mongoose from "mongoose";
import Expense, { EXPENSE_CATEGORIES } from "../../models/expense.model.js";
import ExpenseReceipt from "../../models/expense_receipt.model.js";
import { HttpError, sendError } from "../../utils/http.js";
import { addDays, parseDateOnly, round2, toDateStr, todayStr } from "../../utils/dates.js";

const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;
const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function parseExpenseBody(body, partial = false) {
    const out = {};
    const has = (k) => body[k] !== undefined;
    if (!partial || has("title")) {
        if (typeof body.title !== "string" || !body.title.trim()) throw new HttpError(400, "Title is required.");
        out.title = body.title.trim().slice(0, 120);
    }
    if (!partial || has("category")) {
        if (!EXPENSE_CATEGORIES.includes(body.category)) throw new HttpError(400, `Category must be one of: ${EXPENSE_CATEGORIES.join(", ")}.`);
        out.category = body.category;
    }
    if (!partial || has("amount")) {
        const n = round2(Number(body.amount));
        if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, "Amount must be greater than zero.");
        out.amount = n;
    }
    if (!partial || has("date")) {
        const d = parseDateOnly(body.date);
        if (!d) throw new HttpError(400, "Date is required (YYYY-MM-DD).");
        if (toDateStr(d) > todayStr()) throw new HttpError(400, "Expense date can't be in the future.");
        out.date = d;
    }
    if (has("description")) out.description = String(body.description || "").trim().slice(0, 2000);
    return out;
}

/** body.receipt = { filename, mime_type, data: base64 } → { meta, buffer } */
function parseReceipt(receipt) {
    if (!receipt) return null;
    const { filename, mime_type, data } = receipt;
    if (!RECEIPT_TYPES.includes(mime_type)) throw new HttpError(400, "Receipt must be a JPG, PNG, WEBP image or a PDF.");
    if (typeof data !== "string" || !data) throw new HttpError(400, "Receipt file is empty.");
    const buffer = Buffer.from(data.replace(/^data:[^;]+;base64,/, ""), "base64");
    if (!buffer.length) throw new HttpError(400, "Receipt file is empty.");
    if (buffer.length > MAX_RECEIPT_BYTES) throw new HttpError(400, "Receipt is larger than 2 MB.");
    return {
        meta: { filename: String(filename || "receipt").slice(0, 120), mime_type, size: buffer.length },
        buffer,
    };
}

function parseRange(query) {
    const from = query.from ? parseDateOnly(query.from) : null;
    const to = query.to ? parseDateOnly(query.to) : null;
    if ((query.from && !from) || (query.to && !to)) throw new HttpError(400, "Dates must be YYYY-MM-DD.");
    return { from, to };
}

// GET /api/admin/expenses?from=&to=&category=&page=
export const listExpenses = async (req, res) => {
    try {
        const { category = "" } = req.query;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const { from, to } = parseRange(req.query);
        const filter = {};
        if (category) {
            if (!EXPENSE_CATEGORIES.includes(category)) throw new HttpError(400, "Invalid category.");
            filter.category = category;
        }
        if (from || to) filter.date = { ...(from && { $gte: from }), ...(to && { $lt: addDays(to, 1) }) };

        const [total, expenses, sums] = await Promise.all([
            Expense.countDocuments(filter),
            Expense.find(filter).sort({ date: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("recordedBy", "name").lean(),
            Expense.aggregate([{ $match: filter }, { $group: { _id: "$category", amount: { $sum: "$amount" }, count: { $sum: 1 } } }]),
        ]);
        return res.status(200).json({
            expenses,
            total,
            page,
            pages: Math.max(1, Math.ceil(total / limit)),
            totalAmount: round2(sums.reduce((s, r) => s + r.amount, 0)),
            byCategory: sums.map((r) => ({ category: r._id, amount: round2(r.amount), count: r.count })).sort((a, b) => b.amount - a.amount),
            categories: EXPENSE_CATEGORIES,
        });
    } catch (error) {
        return sendError(res, error, "Failed to fetch expenses.", "listExpenses");
    }
};

// POST /api/admin/expenses  { title, category, amount, date, description?, receipt? }
export const createExpense = async (req, res) => {
    try {
        const data = parseExpenseBody(req.body);
        const receipt = parseReceipt(req.body.receipt);
        const expense = await Expense.create({ ...data, ...(receipt && { receipt: receipt.meta }), recordedBy: req.user._id });
        if (receipt) {
            try {
                await ExpenseReceipt.create({ expense: expense._id, data: receipt.buffer });
            } catch (err) {
                await Expense.deleteOne({ _id: expense._id });
                throw err;
            }
        }
        return res.status(201).json({ message: "Expense recorded.", expense });
    } catch (error) {
        return sendError(res, error, "Failed to record expense.", "createExpense");
    }
};

// PATCH /api/admin/expenses/:expenseId  (receipt: object to replace, null to remove)
export const updateExpense = async (req, res) => {
    try {
        const { expenseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(expenseId)) throw new HttpError(400, "Invalid expense ID.");
        const expense = await Expense.findById(expenseId);
        if (!expense) throw new HttpError(404, "Expense not found.");
        Object.assign(expense, parseExpenseBody(req.body, true));

        if (req.body.receipt === null) {
            await ExpenseReceipt.deleteOne({ expense: expense._id });
            expense.receipt = undefined;
        } else if (req.body.receipt) {
            const receipt = parseReceipt(req.body.receipt);
            await ExpenseReceipt.findOneAndUpdate({ expense: expense._id }, { $set: { data: receipt.buffer } }, { upsert: true });
            expense.receipt = receipt.meta;
        }
        await expense.save();
        return res.status(200).json({ message: "Expense updated.", expense });
    } catch (error) {
        return sendError(res, error, "Failed to update expense.", "updateExpense");
    }
};

// DELETE /api/admin/expenses/:expenseId
export const deleteExpense = async (req, res) => {
    try {
        const { expenseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(expenseId)) throw new HttpError(400, "Invalid expense ID.");
        const expense = await Expense.findByIdAndDelete(expenseId);
        if (!expense) throw new HttpError(404, "Expense not found.");
        await ExpenseReceipt.deleteOne({ expense: expense._id });
        return res.status(200).json({ message: "Expense deleted." });
    } catch (error) {
        return sendError(res, error, "Failed to delete expense.", "deleteExpense");
    }
};

// GET /api/admin/expenses/:expenseId/receipt  → the file
export const getReceipt = async (req, res) => {
    try {
        const { expenseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(expenseId)) throw new HttpError(400, "Invalid expense ID.");
        const [expense, file] = await Promise.all([Expense.findById(expenseId).lean(), ExpenseReceipt.findOne({ expense: expenseId }).lean()]);
        if (!expense?.receipt?.mime_type || !file) throw new HttpError(404, "No receipt attached.");
        res.setHeader("Content-Type", expense.receipt.mime_type);
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(expense.receipt.filename || "receipt")}"`);
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.status(200).send(Buffer.from(file.data.buffer ?? file.data));
    } catch (error) {
        return sendError(res, error, "Failed to fetch receipt.", "getReceipt");
    }
};

// GET /api/admin/expenses/summary?period=daily|weekly|monthly&from=&to=
export const getExpenseSummary = async (req, res) => {
    try {
        const period = ["daily", "weekly", "monthly"].includes(req.query.period) ? req.query.period : "monthly";
        let { from, to } = parseRange(req.query);
        const today = parseDateOnly(todayStr());
        to = to || today;
        if (!from) {
            from = period === "daily" ? addDays(to, -29) : period === "weekly" ? addDays(to, -7 * 12 + 1) : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1));
        }
        if (from > to) throw new HttpError(400, "'from' must be on or before 'to'.");

        const expenses = await Expense.find({ date: { $gte: from, $lt: addDays(to, 1) } }).select("date amount category").lean();

        // Bucket key: day / Monday-start week / month
        const keyOf = (d) => {
            if (period === "daily") return toDateStr(d);
            if (period === "monthly") return toDateStr(d).slice(0, 7);
            const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
            return toDateStr(addDays(d, -dow));
        };
        const buckets = new Map();
        for (let d = new Date(from); d <= to; d = period === "monthly" ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)) : addDays(d, period === "weekly" ? 7 : 1)) {
            const k = keyOf(d);
            if (!buckets.has(k)) buckets.set(k, { period: k, total: 0, byCategory: {} });
        }
        for (const e of expenses) {
            const k = keyOf(new Date(e.date));
            const b = buckets.get(k) || { period: k, total: 0, byCategory: {} };
            b.total = round2(b.total + e.amount);
            b.byCategory[e.category] = round2((b.byCategory[e.category] || 0) + e.amount);
            buckets.set(k, b);
        }
        const rows = [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period));
        const totalsByCategory = {};
        for (const e of expenses) totalsByCategory[e.category] = round2((totalsByCategory[e.category] || 0) + e.amount);

        return res.status(200).json({
            period,
            from: toDateStr(from),
            to: toDateStr(to),
            buckets: rows,
            total: round2(expenses.reduce((s, e) => s + e.amount, 0)),
            totalsByCategory,
            categories: EXPENSE_CATEGORIES,
        });
    } catch (error) {
        return sendError(res, error, "Failed to build expense summary.", "getExpenseSummary");
    }
};

import mongoose from "mongoose";

// Internal CRM notes about a customer. Never shown to the customer.
const customerNoteSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        body: { type: String, required: true, trim: true, maxlength: 2000 },
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

customerNoteSchema.index({ user: 1, createdAt: -1 });

const CustomerNote = mongoose.model("CustomerNote", customerNoteSchema);
export default CustomerNote;

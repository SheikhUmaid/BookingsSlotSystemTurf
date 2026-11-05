import mongoose from "mongoose";

let transactionsSupported = null; // null = not probed yet

/** Transactions need a replica set or a sharded cluster (mongos). Probed once. */
async function supportsTransactions() {
    if (transactionsSupported !== null) return transactionsSupported;
    try {
        const hello = await mongoose.connection.db.admin().command({ hello: 1 });
        transactionsSupported = Boolean(hello.setName || hello.msg === "isdbgrid");
    } catch {
        transactionsSupported = false;
    }
    if (!transactionsSupported) {
        console.warn("[db] MongoDB transactions unavailable (standalone server) — using atomic updates with compensation.");
    }
    return transactionsSupported;
}

/**
 * Run `fn(session)` inside a MongoDB transaction when the deployment supports
 * them (replica set / Atlas). On a standalone server `fn(null)` runs without one —
 * every caller relies on atomic conditional updates and undoes earlier steps if a
 * later one fails, so data stays consistent either way.
 */
export async function runInTransaction(fn) {
    if (!(await supportsTransactions())) return fn(null);

    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            result = await fn(session);
        });
        return result;
    } finally {
        await session.endSession();
    }
}

/** Options object for a query/save that may or may not run inside a session. */
export const withSession = (session, extra = {}) => (session ? { ...extra, session } : extra);

export const isDuplicateKeyError = (err) => err?.code === 11000;

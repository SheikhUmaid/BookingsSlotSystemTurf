/** Error with an HTTP status, thrown by services and turned into a response by sendError(). */
export class HttpError extends Error {
    constructor(status, message, extra = {}) {
        super(message);
        this.status = status;
        this.extra = extra;
    }
}

export function sendError(res, err, fallbackMessage, logLabel) {
    if (err instanceof HttpError) {
        return res.status(err.status).json({ message: err.message, ...err.extra });
    }
    if (err?.name === "ValidationError" || err?.name === "CastError") {
        return res.status(400).json({ message: err.message });
    }
    console.error(`${logLabel || "Request"} error:`, err);
    return res.status(500).json({ message: fallbackMessage });
}

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

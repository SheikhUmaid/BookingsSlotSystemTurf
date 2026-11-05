import express from "express";
import {
    listCustomers,
    getRetention,
    createCustomer,
    getCustomer,
    updateCustomer,
    addNote,
    deleteNote,
} from "../../controllers/admin/customers.controller.js";

const router = express.Router();

router.get("/", listCustomers);
router.get("/retention", getRetention); // before /:customerId
router.post("/", createCustomer);
router.get("/:customerId", getCustomer);
router.patch("/:customerId", updateCustomer);
router.post("/:customerId/notes", addNote);
router.delete("/:customerId/notes/:noteId", deleteNote);

export default router;

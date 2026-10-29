import Service from "../../models/service.model.js";
import Booking from "../../models/booking.model.js";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// GET /api/admin/services
// ---------------------------------------------------------------------------
/**
 * Get all services/pitches configured in the system.
 */
export const getAllServices = async (req, res) => {
    try {
        const services = await Service.find().sort({ createdAt: -1 }).lean();
        return res.status(200).json({
            services,
            total: services.length,
        });
    } catch (error) {
        console.error("Admin getAllServices error:", error);
        return res.status(500).json({ message: "Failed to fetch services." });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/services/:serviceId
// ---------------------------------------------------------------------------
/**
 * Get a single service by ID.
 */
export const getServiceById = async (req, res) => {
    try {
        const { serviceId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(serviceId)) {
            return res.status(400).json({ message: "Invalid service ID format." });
        }

        const service = await Service.findById(serviceId).lean();
        if (!service) {
            return res.status(404).json({ message: "Service not found." });
        }

        return res.status(200).json({ service });
    } catch (error) {
        console.error("Admin getServiceById error:", error);
        return res.status(500).json({ message: "Failed to fetch service." });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/services
// ---------------------------------------------------------------------------
/**
 * Create a new service/pitch.
 * Body: { name, description, icon }
 */
export const createService = async (req, res) => {
    try {
        const { name, description, icon } = req.body;

        if (!name || typeof name !== "string" || name.trim().length < 2) {
            return res.status(400).json({ message: "Service name must be at least 2 characters." });
        }

        if (!description || typeof description !== "string" || description.trim().length < 3) {
            return res.status(400).json({ message: "Description must be at least 3 characters." });
        }

        // Case-insensitive duplicate check
        const existing = await Service.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        });

        if (existing) {
            return res.status(409).json({ message: `A service named "${name.trim()}" already exists.` });
        }

        const newService = new Service({
            name: name.trim(),
            description: description.trim(),
            icon: (icon && typeof icon === "string" ? icon.trim() : "goal") || "goal",
        });

        await newService.save();

        return res.status(201).json({
            message: "Service created successfully.",
            service: newService,
        });
    } catch (error) {
        console.error("Admin createService error:", error);
        return res.status(500).json({ message: "Failed to create service." });
    }
};

// ---------------------------------------------------------------------------
// PUT / PATCH /api/admin/services/:serviceId
// ---------------------------------------------------------------------------
/**
 * Update an existing service.
 * Body: { name, description, icon }
 */
export const updateService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { name, description, icon } = req.body;

        if (!mongoose.Types.ObjectId.isValid(serviceId)) {
            return res.status(400).json({ message: "Invalid service ID format." });
        }

        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ message: "Service not found." });
        }

        if (name !== undefined) {
            if (typeof name !== "string" || name.trim().length < 2) {
                return res.status(400).json({ message: "Service name must be at least 2 characters." });
            }

            // Check if name is taken by another service
            const duplicate = await Service.findOne({
                _id: { $ne: serviceId },
                name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
            });

            if (duplicate) {
                return res.status(409).json({ message: `A service named "${name.trim()}" already exists.` });
            }

            service.name = name.trim();
        }

        if (description !== undefined) {
            if (typeof description !== "string" || description.trim().length < 3) {
                return res.status(400).json({ message: "Description must be at least 3 characters." });
            }
            service.description = description.trim();
        }

        if (icon !== undefined) {
            service.icon = (icon && typeof icon === "string" ? icon.trim() : "goal") || "goal";
        }

        await service.save();

        return res.status(200).json({
            message: "Service updated successfully.",
            service,
        });
    } catch (error) {
        console.error("Admin updateService error:", error);
        return res.status(500).json({ message: "Failed to update service." });
    }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/services/:serviceId
// ---------------------------------------------------------------------------
/**
 * Delete a service. Rejects if active bookings exist for this service.
 */
export const deleteService = async (req, res) => {
    try {
        const { serviceId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(serviceId)) {
            return res.status(400).json({ message: "Invalid service ID format." });
        }

        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ message: "Service not found." });
        }

        // Prevent deletion if active (non-cancelled) bookings exist for this service
        const activeBookingsCount = await Booking.countDocuments({
            service: serviceId,
            status: { $ne: "cancelled" },
        });

        if (activeBookingsCount > 0) {
            return res.status(400).json({
                message: `Cannot delete "${service.name}" because it is linked to ${activeBookingsCount} active booking(s). Please cancel or reassign those bookings first.`,
            });
        }

        await Service.findByIdAndDelete(serviceId);

        return res.status(200).json({
            message: `Service "${service.name}" deleted successfully.`,
        });
    } catch (error) {
        console.error("Admin deleteService error:", error);
        return res.status(500).json({ message: "Failed to delete service." });
    }
};


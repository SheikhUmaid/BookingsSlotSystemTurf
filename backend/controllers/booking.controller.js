import Booking from "../models/booking.model.js";
import Service from "../models/service.model.js";
import TimeSlot from "../models/time_slot.model.js";
import Coupon from "../models/coupon.model.js";
import mongoose from "mongoose";


export const createBooking = async (req, res) => {
    try {
        // 1. Extract booking details from the request body
        const { time_slots, date, service, coupon_code } = req.body;
        const user = req.user.id;

        // 2. Validate that at least one time slot is selected
        if (!Array.isArray(time_slots) || time_slots.length === 0) {
            return res.status(400).json({
                message: "Please select at least one time slot."
            });
        }

        // 3. Prevent duplicate slot IDs in the same request
        if (new Set(time_slots).size !== time_slots.length) {
            return res.status(400).json({
                message: "Duplicate time slots are not allowed."
            });
        }

        // 4. Validate MongoDB ObjectId formats
        if (
            !mongoose.Types.ObjectId.isValid(service) ||
            !time_slots.every(id =>
                mongoose.Types.ObjectId.isValid(id)
            )
        ) {
            return res.status(400).json({
                message: "Invalid service or time slot ID."
            });
        }

        // 5. Validate the date format (YYYY-MM-DD)
        if (
            typeof date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date)
        ) {
            return res.status(400).json({
                message: "Date must be in YYYY-MM-DD format."
            });
        }

        // Normalize the selected calendar date to midnight UTC
        const startDate = new Date(`${date}T00:00:00.000Z`);

        // Reject invalid calendar dates such as 2026-02-30
        if (
            Number.isNaN(startDate.getTime()) ||
            startDate.toISOString().slice(0, 10) !== date
        ) {
            return res.status(400).json({
                message: "Invalid calendar date."
            });
        }

        // 6. Find the selected service
        // We reuse this result to calculate the total price.
        const serviceDetails = await Service.findById(service);

        if (!serviceDetails) {
            return res.status(404).json({
                message: "Service not found."
            });
        }

        // 7. Verify that all selected time slots actually exist
        const timeSlotCount = await TimeSlot.countDocuments({
            _id: { $in: time_slots }
        });

        if (timeSlotCount !== time_slots.length) {
            return res.status(400).json({
                message: "One or more selected time slots do not exist."
            });
        }

        // 8. Define the date range for the selected calendar day.
        // This works even if existing bookings contain different times
        // on the same date.
        const endDate = new Date(startDate);
        endDate.setUTCDate(endDate.getUTCDate() + 1);

        // 9. Check whether any requested slot is already booked
        // on the selected date.
        const existingBooking = await Booking.findOne({
            date: {
                $gte: startDate,
                $lt: endDate
            },
            time_slots: { $in: time_slots },
            status: { $ne: "cancelled" }
        });

        if (existingBooking) {
            return res.status(409).json({
                message:
                    "One or more selected time slots are already booked for this date."
            });
        }

        // 10. Calculate the price on the backend.
        //TODO: Test pending.
        const slots = await TimeSlot.find({
            _id: { $in: time_slots }
        }).select("price");

        // console.log(result)
        let totalPayable = slots.reduce(
            (total, slot) => total + slot.price,
            0
        );

        if (coupon_code) {
            if (typeof coupon_code !== "string") {
                return res.status(400).json({
                    message: "Invalid coupon code."
                });
            }

            const coupon = await Coupon.findOne({ code: coupon_code });

            if (!coupon) {
                return res.status(404).json({
                    message: "Coupon not found."
                });
            }

            const currentDate = new Date();
            if (currentDate < coupon.valid_from || currentDate > coupon.valid_until) {
                return res.status(400).json({
                    message: "Coupon is not valid at this time."
                });
            }

            if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
                return res.status(400).json({
                    message: "Coupon usage limit has been reached."
                });
            }

            if (coupon.active === false) {
                return res.status(400).json({
                    message: "Coupon is not active."
                });
            }

            // Apply the discount
            const discountAmount = (totalPayable * coupon.discount_percentage) / 100;
            totalPayable -= discountAmount;

            // Increment the used count of the coupon
            coupon.used_count += 1;
            await coupon.save();

        }




        // 11. Create one booking containing multiple slots
        // All selected slots belong to the same date.

        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const newBooking = new Booking({
            user,
            service,
            time_slots,
            date: startDate,
            total_payable: totalPayable,
            amount_paid: 0,
            payment_type: "full",
            status: "pending",
            expires_at: expiresAt
        });

        // 12. Save the booking to MongoDB
        await newBooking.save();

        // 13. Return the created booking
        return res.status(201).json({
            message: "Booking created successfully.",
            booking: newBooking
        });

    } catch (error) {
        console.error("Create booking error:", error);

        return res.status(500).json({
            message: "Failed to create booking."
        });
    }
};

export const getMyBookings = async (req, res) => {
    try {
        const user = req.user.id;
        console.log(user)
        const myBookings = await Booking.find({ user ,
             status: { $in: ["pending", "partial", "paid"] },
        }).populate('time_slots service').select(`
                -user -total_payable -expires_at -payment_order_amount -createdAt -updatedAt -__v -payment_order_id
            `);

        console.log(myBookings)
        res.status(200).json(myBookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
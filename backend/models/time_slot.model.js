// class TimeSlot(models.Model):
//     start_time = models.TimeField()
//     end_time = models.TimeField()

import mongoose from "mongoose";


const timeSlotSchema = mongoose.Schema({
    start_time:{
        type: String,
        required:true
    },
    end_time:{
        type: String,
        required: true
    },
})

const TimeSlot = mongoose.model("TimeSlot", timeSlotSchema);

export default TimeSlot;
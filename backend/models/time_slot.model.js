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
    category:{
        type:String,
        enum:["Morning Sessions", "Afternoon Sessions", "Floodlit Evening", "Late Night"],
        required:true
    },
    price:{
        type:Number,
        required:true
    }
})

const TimeSlot = mongoose.model("TimeSlot", timeSlotSchema);

export default TimeSlot;
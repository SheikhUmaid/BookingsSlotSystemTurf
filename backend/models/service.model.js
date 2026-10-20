import mongoose from "mongoose";

const serviceSchema = mongoose.Schema({
    name:{
        type: String,
        required:true
    },
    description:{
        type: String,
        required: true
    }, 
    price:{
        type: Number,
        required: true
    },
    eveningPrice:{
        type: Number,
        required: true
    },
    icon:{
        type: String,
        required: true
    }
});


const Service = mongoose.model("Service", serviceSchema);
export default Service;
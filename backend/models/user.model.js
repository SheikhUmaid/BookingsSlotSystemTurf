import mongoose from "mongoose";


const userSchema = mongoose.Schema({
    name:{
        type: String,
    },
    phone:{
        type: String,
        required: true
    },
    accessToken: {
        type: String 
    },
    email:{
        type: String,
    },
    role:{
        type:String,
        enum:["user","admin","staff"],
        default:"user"
    },
    // Staff only: admin-panel areas this staff member may access
    // (see utils/permissions.js). Only honoured when the plan enables roleBasedAccess.
    permissions:{
        type:[String],
        default: undefined
    },
    password:{
        type:String,
    }
})


const User = mongoose.model("User", userSchema);

export default User;
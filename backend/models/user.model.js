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
        enum:["user","admin"],
        default:"user"
    },
    password:{
        type:String,
    }
})


const User = mongoose.model("User", userSchema);

export default User;
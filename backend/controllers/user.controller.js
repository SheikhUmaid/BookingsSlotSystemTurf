import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const adminLogin = async (req, res) => {
    try {
        const { identifier, phone, email, password } = req.body;
        const loginIdentifier = identifier || phone || email;

        if (!loginIdentifier || !password) {
            return res.status(400).json({ message: "Identifier (phone or email) and password are required" });
        }

        const user = await User.findOne({
            $or: [{ phone: loginIdentifier }, { email: loginIdentifier.toLowerCase() }],
            role: "admin",
        });

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials or not authorized as admin" });
        }

        let isMatch = false;
        if (user.password) {
            if (user.password.startsWith("$2b$") || user.password.startsWith("$2a$")) {
                isMatch = await bcrypt.compare(password, user.password);
            } else {
                isMatch = user.password === password;
            }
        }

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: "180d",
        });
        user.accessToken = accessToken;
        await user.save();

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            maxAge: 180 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            message: "Admin login successful",
            accessToken,
            user: {
                id: user._id,
                name: user.name || "Admin",
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Admin login error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

const sendOTP = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        let user = await User.findOne({ phone });
        if (!user) {
            user = new User({ phone });
            await user.save();
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const token = jwt.sign({ id: user._id, otp }, process.env.JWT_SECRET, { expiresIn: '5m' });
        console.log(`OTP for ${phone}: ${otp}`); // For testing purposes, log the OTP to the console

        // Here you would send the OTP to the user's phone number using an SMS service

        res.status(200).json({ message: "OTP sent successfully", token });
    } catch (error) {
        console.log(error.message)
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { token, otp } = req.body;
        if (!token || !otp) {
            console.log("Token or OTP missing:", { token, otp });
            return res.status(400).json({ message: "Token and OTP are required" });
            
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.otp !== otp) {
            console.log("Invalid OTP:", { expected: decoded.otp, received: otp });
            return res.status(400).json({ message: "Invalid OTP" });
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '180d' });
        user.accessToken = accessToken;
        await user.save();

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
            maxAge: 180 * 24 * 60 * 60 * 1000, // 180 days
        });
        
        res.status(200).json({ message: "OTP verified successfully", accessToken });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};



const updateUser = async (req,res)=>{
    try {
        const {name, email} = req.body;
        
        if (!name && !email){
            return res.status(400).json({"message": "name or email is required"})
        }
        const user = await User.findById(req.user.id);
        if(!user){
            return res.status(404).json("message: user not found!")
        }
        if (name){
            user.name = name;
        }
        if (email){
            user.email = email;
        }
        await user.save();
        return res.status(200).json({"message":"user updated successfully"});
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
        
    }
}



const getUser = async (req,res) =>{
    try{
        const user = await User.findById(req.user.id).select("-_id -role -accessToken -__v")
        if(!user){
            return res.status(404).json("message: user not found!")
        }
        
        return res.status(200).json(user);
    }catch(error){
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

export { adminLogin, sendOTP, verifyOTP, updateUser, getUser };

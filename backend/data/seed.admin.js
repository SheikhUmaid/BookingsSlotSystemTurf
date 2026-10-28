import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/user.model.js"


async function seedAdmin(){
    try{
        await mongoose.connect(process.env.DATABASE_URL);
        await User.create({name:"admin", phone:"9906532078", email:"admin@zinthlabs.in", role:"admin", password:"change-this" })
        console.log("admin created successfully!")
    }catch (error) {
        console.error("Error seeding amdin:", error);
        process.exitCode = 1;
      } finally {
        await mongoose.disconnect();
      }
}


await seedAdmin();
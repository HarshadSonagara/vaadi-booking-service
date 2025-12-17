import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "./models/user.model.js";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./.env",
});

const ensureSuperAdmin = async () => {
    try {
        await connectDB();
        
        const email = "harshadsonagara@gmail.com";
        const password = "Harshad@1309";
        const fullName = "Harshad Sonagara";
        const mobileNumber = "1234567890"; // Dummy
        const villageName = "AdminVillage"; // Dummy

        let user = await User.findOne({ email });
        
        if (!user) {
            console.log("User not found! Creating new user...");
            user = await User.create({
                fullName,
                email,
                password,
                mobileNumber,
                villageName,
                role: "Super Admin",
                isEmailVerified: true
            });
            console.log(`User ${email} created as Super Admin.`);
        } else {
            console.log("User found. Updating role...");
             user.role = "Super Admin";
             // If we need to update password, we can, but usually better not to blindly overwrite if user exists unless asked. 
             // But the prompt said "set ... pass : Harshad@1309". Let's update it ONLY if we are creating, 
             // OR we can explicitly set it here if we want to reset it.
             // Let's reset it since the user asked to "set pass".
             user.password = password; 
             await user.save();
             console.log(`User ${email} updated to Super Admin with new password.`);
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error("Error promoting user:", error);
        process.exit(1);
    }
}

ensureSuperAdmin();

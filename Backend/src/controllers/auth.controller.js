import cloudinary from "../lib/claudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js"
import bcrypt from "bcryptjs";
export const signup = async (req, res) => {
    const { fullName, email, password } = req.body;

    try {
        if (!fullName || !email || !password) {
            console.log(fullName,email,password);
            return res.status(400).json({
                message: "every field must be provided"
            })
            
        }
        if (password.length < 6) {
            
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        const user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: "Email already exists" })
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            fullName,
            email,
            password: hashedPassword
        });
        if (newUser) {
            generateToken(newUser._id, res);
            await newUser.save();
            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                profilepic: newUser.profilepic,

            })



        } else {
            return res.status(400).json({ message: "Invalid user data" })
        }
    } catch (error) {
        console.log("Error in signup controller", error.message);
        res.status(500).json({ message: "Internal server error" });

    }
};
export const login = async (req, res) => {
    try {
        const {email,password}=req.body;
        const user = await User.findOne({email})
        
        if(!user){
            return res.status(400).json({message:"Invalid credentials"})
        }
        console.log(user)
       const isPasswordCorrect= await bcrypt.compare(password,user.password)
       if(!isPasswordCorrect){
        return res.status(400).json({message:"Invalid credentials"})

       }
       generateToken(user._id,res)
       res.status(200).json({
        _id:user._id,
        fullName:user.fullName,
        email:user.email,
        profilepic:user.profilepic
       });
        
    } catch (error) {
        console.log("Error in login controller",error.message);
        res.status(500).json({message:"Internal server Error"})
        
    }
};
export const logout = (req, res) => {
    try {
        res.cookie("jwt","",{maxAge:0})
        res.status(200).json({message:"Logged out sucessfully"});
    } catch (error) {
        console.log("Error in logout controller",error.message);
        res.status(500).json({message:"Internal server Error"})
        
    }
};
export const update_profile=async (req,res)=>{
    try {
        const { profilePic } = req.body;
        const userId = req.user?._id; // Ensure userId exists

        if (!userId) {
            return res.status(400).json({ message: "User ID is missing" });
        }
        if (!profilePic) {
            return res.status(400).json({ message: "Profile picture is required" });
        }

        // Upload to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(profilePic, {
            folder: "profile_pictures",
            resource_type: "image",
        });

        if (!uploadResponse.secure_url) {
            return res.status(500).json({ message: "Cloudinary upload failed" });
        }

        console.log("✅ Cloudinary Upload Success:", uploadResponse.secure_url);

        // Update the user in the database
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { profilePic: uploadResponse.secure_url },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found or not updated" });
        }

        console.log("✅ Database Updated:", updatedUser);
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("❌ Error in update profile:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }

}
export const checkAuth =(req,res)=>{
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("error in checkAuth controller",error.message);
        res.status(500).json({message:"Internal server error"});
        
    }
}
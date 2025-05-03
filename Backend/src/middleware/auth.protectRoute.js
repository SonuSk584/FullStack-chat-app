
import jwt from "jsonwebtoken"
import User from "../models/user.model.js"
export const protectRoute = async (req, res, next) => {
    try {
        console.log("Cookies:", req.cookies); // Log cookies
        const token = req.cookies?.jwt;
        if (!token) {
            return res.status(400).json({ message: "Unauthorized - No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded token:", decoded); // Log decoded token

        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log("Authenticated user:", user);
        req.user = user;
        next();
    } catch (error) {
        console.error("Error in protectRoute middleware:", error.message);
        res.status(500).json({ message: "Internal Error" });
    }
};

import jwt from "jsonwebtoken"
export const generateToken =(userId,res)=>{
    const token = jwt.sign({userId},process.env.JWT_SECRET,{
        expiresIn:"7d"
    });
    res.cookie("jwt",token,{
        maxAge:7*24*60*60*1000, //7days in milisecond
        httpOnly:true, //preventXSS attacks cross-site scripting attacks
        sameSite:"strict",
        secure: process.env.NODE_ENV !== "production"
    })

}
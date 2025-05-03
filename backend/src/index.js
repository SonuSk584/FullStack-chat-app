
import express from "express";
import dotenv from "dotenv"
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js"
import messageRoutes from "./routes/message.route.js"
import cookieParser from "cookie-parser"
import cors from "cors";
import { app,server } from "./lib/socket.js";
import callRoutes from "./routes/call.routes.js";
import path from "path";


app.use(express.json({ limit: "50mb" })); 
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials:true,
}
));

dotenv.config()
const PORT =process.env.PORT
const __dirname = path.resolve();

app.use('/api/auth',authRoutes);
app.use('/api/messages',messageRoutes);
app.use('/api/calls',callRoutes); 

if(process.env.NODE_ENV ==='production'){
    app.use(express.static(path.join(__dirname,"../frontend/dist")));
    app.get("*",(req,res)=>{
        res.sendFile(path.join(__dirname,"../frontend","dist","index.html"));
    })
}

server.listen(PORT,()=>{
    console.log(`server is running on port:${PORT}`)
    connectDB()
})
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true 
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//testing
app.get("/test",(req,res) => {
    res.send("TEST ROUTE WORKING");
});




// routes import
import userRouter from "./routes/user.routes.js"

// routes decleration
app.use("/api/v1/users",userRouter);

// it will look like  http://localhost:8000/api/v1/users/register



export { app }
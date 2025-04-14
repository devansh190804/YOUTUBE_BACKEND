//require('dotenv').config({path: './env'})

import dotenv from "dotenv"
import connectDB from "./db/index.js";


dotenv.config({
    path: './.env'
})

connectDB()
.then(()=>{
        app.listen(process.env.PORT||8000,()=>{
            console.log(`app is listening at ${process.env.PORT}`);
        })
  })
.catch((error)=>{
    console.log("MONGO DB CONNECTION FAILED",error)

})










/*
import express from "express"
cosnt app = express()

( async ()=> {
    try {
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

       app.on("ERROR",(error)=>{
        console.log("ERROR",error);
        throw error
       })

       app.listen(process.env.PORT,()=>{
        console.log(`App is listening on port ${process.env.PORT}`);
       })
    } catch (error) {
        console.error('ERROR',error)
        throw err
    }
})()
        */

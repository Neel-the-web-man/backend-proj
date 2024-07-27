import 'dotenv/config';
import connectDB from "./db/index.js";
connectDB()




























/*

import express from "express";
const app=express();
(async ()=>{
    try{
        mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("ERRR : ", error);
            throw error
        })
        app.listen(process.nextTick.PORT,()=>{
            console.log(`App is listening on part ${process.env.PORT}`)
        })
    } catch(err){
        console.log(err);
        throw err
    }
})()
    
*/
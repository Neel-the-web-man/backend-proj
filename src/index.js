import 'dotenv/config';
import connectDB from "./db/index.js";
import {app} from "./app.js"
connectDB()
.then(()=>{
    app.on("error",(error)=>{
        console.log("ERRR: ",error);
        throw error;
    })
    app.listen(process.env.PORT|| 8000,()=>{
        console.log(`Sever is running at port : ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log(`Mongo db connection failed !!! sever is not running :`,err);
})



























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
        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on part ${process.env.PORT}`)
        })
    } catch(err){
        console.log(err);
        throw err
    }
})()
    
*/
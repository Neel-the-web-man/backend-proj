import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true,
}));

app.use(express.json({
    limit:"16kb",
}))//express allows us to configure json 
app.use(express.urlencoded({
    extended:true,//extended helps to put us objects in objects
    limit:"16kb",
}))//url ko encode karne ke liye express ke through use karte hai
app.use(express.static("public"))//static is a configuration of express used to store our files in database and available to public.
app.use(cookieParser())
//middleware are nothing but checkers to look out before sending website data things like is user logged in or not, if user try to log in as admin is user admin or not etc

//in api reference to express we have 4 parameters :(err,req,res,next)

export {app}
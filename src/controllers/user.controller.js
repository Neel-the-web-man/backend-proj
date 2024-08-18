import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloundinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

//generate access and refresh tokens
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}
const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //     message:"ok"
    // })
    //get user details from frontend
    //validation - not empty
    //check if user already exists : username ,email
    //check for images ,check for avatar
    //upload them on cloudinary, avatar check to be done
    //create user object -create entry in db
    //remove password and refresh token field from response
    //check for user creation 
    //return response
    const { fullName, email, username, password } = req.body;
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All Fields are required");
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username exists");
    }
    //console.log(req.files)
    //console.log(req.body)
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath=req.files?.coverImage[0]?.path
    //***the above line gives error cause it preassumes that coverImage is surely been submitted by user
    let coverImageLocalPath;
    if (req.files && req.files.coverImage && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar File is Required")
    }
    const avatar = await uploadOnCloundinary(avatarLocalPath)
    const coverImage = await uploadOnCloundinary(coverImageLocalPath)
    if (!avatar) {
        throw new ApiError(400, "Avatar File is Required");
    }
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registerted successfully")
    )


})
const loginUser = asyncHandler(async (req, res) => {
    //req body-> data
    // username or email exists
    //find the username
    //password check
    //if correct
    //access token dena hai
    //refresh token dena hai 
    //send cookies
    const { email, username, password } = req.body;
    //if you want any one param to be valid
    // if (!(username || email)) {
    //if you want both be true
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(400, "User does not exists")
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly: true,
        secure: true,
    }
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User Logged In Successfully"
            )
        )

})
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"
        ))
})
const refreshAcessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request")
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token");
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used");
        }
        const options = {
            httpOnly: true,
            secure: true,
        }
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access Token Refreshed Successfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalud refresh Token")
    }
})
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.password.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false })
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body
    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email,
            }
        },
        { new: true }
    ).select("-password")
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account Details"))
})
const updateUsedAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }
    //delete old Avatar
    const avatar = await uploadOnCloundinary(avatarLocalPath);
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")
    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar updated successfully")
        )
})
const updateUsedCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "CoverImage file is missing")
    }
    const coverImage = await uploadOnCloundinary(coverImageLocalPath);
    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on Cover Image");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")
    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "CoverImage updated successfully")
        )
})
const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        }, {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        }, {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },{
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscibers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },{
            $project:{
                fullName:1,
                username:1,
                subscribersCount,
                channelSubscribedToCount:1,
                avatar:1,
                coverImage:1,
                email:1,
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404,"channel does not exists")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")
    )  
})
const getWatchHistory =asyncHandler(async(req,res)=>{
    const user=await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },{
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1,
                                    }
                                }
                            ]
                        }
                    },{
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(200,user[0].watchHistory,"Watch History fetched successfully")
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAcessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateUsedAvatar,
    updateUsedCoverImage,
    getUserChannelProfile,
    getWatchHistory,
}
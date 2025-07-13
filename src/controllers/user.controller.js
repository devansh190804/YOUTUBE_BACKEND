import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.models.js"
import{uploadOnCloudinary} from "../utils/cloudinary.js";
import  {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async(userId) =>
{
try {
 const user = await User.findById(userId)
 const accessToken = user.generateAccessToken()
 const refreshToken = user.generateRefreshToken()

 user.refreshToken = refreshToken
 await user.save({validateBeforeSave: false})

return {accessToken, refreshToken}

} catch (error) {
  throw new ApiError(500, " something went wrong while generating access and refresh token")
}
}



const registerUser = asyncHandler( async (req, res) =>{
  // get user details from frontend 

   const{username, fullName, email, password} = req.body
  // console.log("email: ",email);
  // console.log("username ",username);
  // console.log("fullName ",fullName);
  // console.log("password ",password);


  // validation check  - not empty
  if (
    [username, fullName, email, password].some((field) =>
        field?.trim() === "")
 ) {
    throw new ApiError(400, "All fields are required")
  }

  // check if user already exit:email, username
 const existedUser= await User.findOne({
     $or:[{username},{email}]
  })
 
  if (existedUser) {
    throw new ApiError(409, "user with email or username already exits")
}
//console.log("existedUser:", existedUser);


  // check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
 
  
 //achi practice coveriMAGE ko lane ki
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;      agar coverImage ko uncheck krdenge postman se to error aayega isse isliye dusra code likha hai 
 let coverImageLocalPath;
 if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
     coverImageLocalPath = req.files.coverImage[0].path
 }
 

 //console.log("avatar Localpath exists:", Boolean(avatarLocalPath));
 //console.log("avatar file full object:", req.files.avatar[0]);
 
 
if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
}

  // upload them to cloudinary
const avatar = await uploadOnCloudinary(avatarLocalPath)
const coverImage = await uploadOnCloudinary(coverImageLocalPath)

if (!avatar) {
    throw new ApiError(400, "Avatar chahiye hi chahiye")
}


  // create user object-create entry in db
const user = await User.create({ 
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
})

  // remove password and refresh token field from response
const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)
if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user")
}

  // check for user creation    // return response
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User Registered Successfully")
  )

})




// login user controller
const loginUser = asyncHandler( async (req,res) =>{
// req.body --> data
// username or email
// find user
// check password
// generate access token and refresh token


// req.body --> data
const {email, username, password} = req.body;

// username or email
if (!(email || username)) {
 throw new ApiError(400, "user or email is required") 
}

// find user
const user = await User.findOne({
  $or:[{email} , {username}]
})
 if (!user) {
  throw new ApiError(404," user does not exist")
 }

// check password
const isPasswordValid = await user.isPasswordCorrect(password)

if (!isPasswordValid) {
  throw new ApiError(401, "Invalid user credentials")
}

// generate access token and refresh token
const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

const options ={
   httpOnly : true,
   secure : true
}

return res
.status(200)
.cookie("accessToken", accessToken, options)
.cookie( "refreshToken",refreshToken, options)

.json(
  new ApiResponse(200,
    {
      user:loggedInUser, accessToken , refreshToken
    },
    " user logged in succesfully"
     )
  )

})



//logout user
const logoutUser = asyncHandler( async (req, res) =>{
   User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken:1
            }
    },
    {
      new: true
    }
   )
   const options ={
    httpOnly : true,
    secure : true
 }

 return res
 .status(200)
 .clearCookie("accessToken",options)
 .clearCookie("refreshToken",options)
.json(new ApiResponse(200, {},
    "user logged out succesfully" ))

})


const refreshAccessToken = asyncHandler( async (req, res) => 
{
 const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

 if (!incomingRefreshToken) {
  throw new ApiError(401, " Unauthorized request")
}

try {
  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  )
  
  const user = await User.findById(decodedToken?._id)
  
  if (!user) {
    throw new ApiError(401, "Invalid refresh token")
  }
  
  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or used")
  }
  const options ={
    httpOnly : true,
    secure : true
  }
  
  const{accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
  
  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", newRefreshToken, options)
  .json(
    new ApiResponse(
      200,
      {accessToken, refreshToken: newRefreshToken},
      "Access token refreshed"
    )
   
  )
} catch (error) {
  throw new ApiError(401, error?.message || "Invalid refresh token")
}


})


const changeCurrentPassword = asyncHandler( async(req, res) =>{

  const {oldPassword, newPassword} = req.body
  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password")
  }

   user.password = newPassword
   user.save({validateBeforeSave: false})


   return res
   .status(200)
   .json(
    new ApiResponse( 200,{},"Password changed succesfully")
   )
})

const getCurrentUser = asyncHandler( async(req, res) =>{
  return res
  .status(200)
  .json(new ApiResponse(
      200,
      req.user,
      "current user fetched successfully"
    )
  )
})

const updateAccountDetails = asyncHandler( async(req, res) =>{ 
  const{fullName, email} = req.body

  if (!fullName || !email) {
    throw new ApiError(400, " All fields are required")
  }
   
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullName,
        email
      }
    },
    {new:true}
  ).select("-password")

  return res
  .status(200)
  .json( 
     new ApiResponse(200, user, "update account details succesfully")
  )
})

const updateUserAvatar = asyncHandler( async(req, res)=>
  {
 const avatarLocalPath =  req.file?.path

 if (!avatarLocalPath) {
  throw new ApiError(400, "avatar file is missing")
 }

 const avatar = await uploadOnCloudinary(avatarLocalPath)

 if (!avatar.url) {
   throw new ApiError(400, "Error while uploading on avatar")
 }

 const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set:{
          avatar:avatar.url
        }
      },
      {new:true}
 ).select("-password")

 return res
 .status(200)
 .json(
  new ApiResponse(200, user, "avatar updated successfully")
 )
})


const updateUserCoverImage = asyncHandler( async(req, res)=>
  {
 const coverImageLocalPath =  req.file?.path

 if (!coverImageLocalPath) {
  throw new ApiError(400, "cover image file is missing")
 }

 const coverImage = await uploadOnCloudinary(coverImageLocalPath)
 
 if (!coverImage.url) {
   throw new ApiError(400, "Error while uploading on cover image")
 }

 const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set:{
          coverImage:coverImage.url
        }
      },
      {new:true}
 ).select("-password")

 return res
 .status(200)
 .json(
  new ApiResponse(200, user, "coverImage updated successfully")
 )
})


const getUserChannelProfile = asyncHandler( async(req, res) =>{
 const{username} = req.params

 if (!username?.trim()) {
     throw new ApiError(400,"Username is missing")
 }

  const channel = await User.aggregate([
        {
          $match: {
               username: username?.toLowerCase()
                }
        },
        {
          $lookup: {
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
                  }
        },
        {
          $lookup:{
                  from:"subscriptions",
                  localField:"_id",
                  foreignField:"subscriber",
                  as:"subscribedTo"
                  }
        },
        {
          $addFields:{
                subscribersCount:{
                                 $size:"$subscribers"
                                 },
                channelsSubscribedToCount:{
                                 $size:"$subscribedTo"
                                  },
                isSubscribed:{
                  $cond:{
                    if:{$in:[req.user?._id, "subscribers.subscriber"]},
                    then:true,
                    else:false

                  }
                }
             }
          },
          {
            $project:{
              fullName:1,
              username:1,
              email:1,
              avatar:1,
              coverImage:1,
              subscribersCount:1,
              channelsSubscribedToCount:1,
              isSubscribed:1
            }
          }

      ])
      console.log("Aggregate channel: ",channel);

      if (!channel?.length) {
        throw new ApiError(400, "channel does not exist")
      }

      return res
      .status(200)
      .json(
         new ApiResponse(
        200,
        channel[0],
        "User channel fetched succesfully"
      )
      )
})


const getWatchHistory = asyncHandler( async(req, res) =>{
const user = await User.aggregate([
       {
        $match:{
             _id: new mongoose.Types.ObjectId(req.user._id)
                }
       },
       {
        $lookup:{     // videos to user looking up
          from:"videos",    // kha se le rhe hai
          localField:"watchHistory",  // isse look up krvana hai "another field"
          foreignField:"_id",   // kis cheez ke base pe look up krvana hai 
          as:"watchHistory",     // nick name
          pipeline:[
                    {
                       $lookup:{   // user to videos looking up
                        from:"user",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[
                                 {
                                  $project:{
                                    username:1,
                                    fullName:1,
                                    avatar:1
                                           }
                                 }
                        ]
                       }
                    },
                    {
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
   .json(
    new ApiResponse(
      200,
      user[0].watchHistory,
      "watch history fetched successfully"))

})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
}


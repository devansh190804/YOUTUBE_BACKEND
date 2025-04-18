import mongoose,{Schema} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema(
    {
    userName:{
        type:String,
        required:true,
        lowercase:true,
        unique:true,
        trim:true,
        index:true
      },
    email:{
          type:String,
          required:true,
          lowercase:true,
          unique:true,
          trim:true,
             },
    fullName:{
         type:String,
         required:true,
         trim:true,
         index:true
                   },
    email:{ 
         type:String,
         required:true,
         lowercase:true,
         unique:true,
         trim:true,
             },
    avatar:{
         type:String, //cloudinary url
         required:true, 
           },
    coverImage:{
            type:String, //cloudinary url
              },  
    watchHistory:[    
        {
            type:Schema.types.ObjectId,
            ref:"Video"
        }  
    ],
    password:{
        type:String,
        required:[true, "password is required"]
    },
    refreshToken:{
        type:String,
    } 
  },{
    timestamps:true 
  }     
)
  
export const User = mongoose.model("User",userSchema)
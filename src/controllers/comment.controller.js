import mongoose from "mongoose"
import {Comment} from "../models/comment.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { lookup } from "dns"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const commentsAggregate =  Comment.aggregate([
        {
            $match:{
                video: new mongoose.Schema.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                  from:"users",
                  localField:"owner",
                  foreignField:"_id",
                  as:"owner"
                  }
        },
        {
            $lookup: {
                  from:"likes",
                  localField:"_id",
                  foreignField:"comment",
                  as:"likes"
                  }
        },
        {
            $addFields:{
                likesCount:{
                    $size: "$likes"
                },
                $owner:{
                    $size: "$comments"
                },
                isLiked:{
                    $cond:{
                        if: {$in:[req.user?._id, "likes.likedBy"]},
                        then:true,
                        else: false
                    }
                }
            }
        },
        {
            $sort:{ 
                 createdAt: -1
                }
        },
        {
            $project:{
                content:{
                    content:1,
                    createdAt:1,
                    likesCount:1,
                    owner:{
                        username:1,
                        fullName:1,
                        "avatar.url":1
                    },
                    isLiked:1
                }
            }
        }
    ]);

      const options = {
          page: parseInt(page,10),
          limit: parseInt(limit,10)
    }

    const comments = await comments.aggregatePaginate(
        commentsAggregate,
        options
    );
    
    return res
    .status(200)
    .json( new ApiResponse(200, "comments fetched succesfully"))
});



const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params
    const {content} = req.body

    if (!content) {
        throw new ApiError(404, "content is required")
    }
   
    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "video not found")
    }

    const comment = await Comment.create({
        content,
        video:videoId,
        owner:req.user?._id
    });

    if (!comment) {
        throw new ApiError(500, "Failed to add comment please try again")
    }

    return res
    .status(201)
    .json( new ApiResponse(201, "Comment added succesfully"))
});



const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
  const {commentId} = req.params
  const {content} = req.body

  if (!content) {
    throw new ApiError(404, "content is required")
  }

   const comment = await Comment.findById(commentId)

   if (!comment) {
     throw new ApiError(404, "comment not found") 
   }

   if (comment?.owner.toString() !== req.user?._id.toString() ) {
     throw new ApiError(404, "Only owner can edit their comment")
   }

   const updateComment = await Comment.findByIdAndUpdate(
    comment?._id,
       {
        $set:{
            content
        }
       },
       {new:true}
   )

   if (!updateComment) {
       throw new ApiError(500, "Failed to edit comment please try again") 
      }

      return res
      .status(200)
      .json(new ApiResponse(201, "Comment edited succesfully"))

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
       const {commentId} = req.params

       const comment = await Comment.findById(commentId)

   if (!comment) {
     throw new ApiError(404, "comment not found") 
   }

   if (comment?.owner.toString() !== req.user?._id.toString() ) {
     throw new ApiError(404, "Only owner can delete their comment")
   }
     
   const deleteComment = await Comment.findByIdAndDelete(commentId)

   await Like.deleteMany({
    comment:commentId,
    likedBy:req.user
   })

   return res
   .status(200)
   .json(new ApiResponse(201,{commentId}, "Comment deleted succesfully"))

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
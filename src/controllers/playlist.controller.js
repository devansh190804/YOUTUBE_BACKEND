import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.models.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    //TODO: create playlist

    if (!name || !description) {
        throw new ApiError(404,"Name and Description both are required")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })
    
    if (!playlist) {
        throw new ApiError(500,playlist ,"Failed to create playlist")
    }

    return res
    .status(200)
    .json(new ApiResponse(
         200,
        "Playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if (!isValidObjectId(userId)) {
      throw new ApiError(404, "Invalid userId")   
    }

    const playlist = await Playlist.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos"
            }
        },
        {
            $addField:{
                totalVideos:{
                    $size:"$videos"
                },
                totalViews:{
                    $sum:"$videos.views"
                }
            }
        },
        {
            $project:{
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1
            }
        }
    ]);
       return res
       .status(200)
       .json(new ApiResponse(
        201,
        playlist,
        "user playlist fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(404, "Invalid playlistId")
    }
      
    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    const playlistVideos = await Playlist.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $match:{
                "videos.isPublished": true
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $addField:{
                totalVideos:{
                    $size:"$videos"
                },
                totalViews:{
                    $sum:"$videos.views"
                },
                owner:{
                    $first:"$owner"
                }
            }
        },
        {
            $project:{
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos:{
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1
                },
                owner:{
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                }
            }
        }
    ]);

    return res
    .status(200)
    .json(new ApiResponse(
         200,
         playlistVideos[0],
        "playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
     throw new ApiError(404, "Invalid playlistId or videoId")   
    }

    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)

    if (!playlist) {
        throw new ApiError(404, "playlist not found")
    }

     if (!video) {
        throw new ApiError(404, "video not found")
    }

    if (
        (playlist.owner?.toString() && video.owner?.toString()) !== req.user?._id.toString()
    ) {
        throw new ApiError(400,"only owner can add video to their playlist")
    }

     const updatePlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet:{
                video:videoId
            }
        },
         { new : true }
     );

     if (!updatePlaylist) {
        throw new ApiError(500,"failed to add video in your playlist")
     }

     return res
     .status(200)
     .json(new ApiResponse(
         201,
         updatePlaylist,
        "video added to your playlist successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
     if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
     throw new ApiError(404, "Invalid playlistId or videoId")   
    }

    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)

    if (!playlist) {
        throw new ApiError(404, "playlist not found")
    }

     if (!video) {
        throw new ApiError(404, "video not found")
    }

    if (
        (playlist.owner?.toString() && video.owner?.toString()) !== req.user?._id.toString()
    ) {
        throw new ApiError(400,"only owner can remove video to their playlist")
    }

    const removeVideo = await Video.findByIdAndUpdate(
        playlist?._id,
        {
            $pull:{
                video: videoId
            }
        },{ new : true }
    )

    if (!removeVideo) {
        throw new ApiError(500,"failed to remove video from playlist")
    }
       return res
       .status(200)
       .json(new ApiResponse(
            201,
            removeVideo,
           "successfully removed video from your playlist"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
     if (!isValidObjectId(playlistId)) {
     throw new ApiError(404, "Invalid playlistId")   
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "playlist not found")
    }

    if (
        playlist.owner?.toString()  !== req.user?._id.toString()
    ) {
        throw new ApiError(400,"only owner can delete playlist")
    }

    const deletePlaylist = await Playlist.findByIdAndDelete(playlist?._id)

    return res
    .status(200)
    .json(new ApiResponse(
         201,
        "playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
   if (!name || ! description) {
       throw new ApiError(404, "name and description is required") 
   }

    if (!isValidObjectId(playlistId)) {
     throw new ApiError(404, "Invalid playlistId")   
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "playlist not found")
    }

    if (
        playlist.owner?.toString()  !== req.user?._id.toString()
    ) {
        throw new ApiError(400,"only owner can update playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set:{
                name,
                description
            }
        },{ new: true }
    )

    return res
    .status(200)
    .json(new ApiResponse(
         201,
         updatePlaylist,
        "playlist updated successfully"))
})


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
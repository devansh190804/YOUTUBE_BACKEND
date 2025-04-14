const asyncHandler= (fn) => async(err,req,res,next) => {
try {
    await fn(err,req,res,next)
} catch (error) {
    res.status(error.code||500).json({
        success:false,
        message:err.message
    })

   }
}
export {asyncHandler}
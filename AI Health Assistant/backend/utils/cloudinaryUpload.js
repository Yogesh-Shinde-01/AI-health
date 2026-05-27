import cloudinary from '../config/cloudinary.js'
import { env } from '../config/env.js'
import { ApiError } from './apiError.js'

export const uploadImageBuffer = (buffer, folder = 'ai-health') =>
  new Promise((resolve, reject) => {
    if (!env.CLOUDINARY_CLOUD_NAME) {
      return reject(new ApiError(503, 'Image upload is not configured', 'CLOUDINARY'))
    }
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error)
        resolve(result.secure_url)
      },
    )
    stream.end(buffer)
  })

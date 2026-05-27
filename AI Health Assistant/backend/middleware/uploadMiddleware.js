import multer from 'multer'
import { ApiError } from '../utils/apiError.js'

const storage = multer.memoryStorage()

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new ApiError(400, 'Only image files are allowed', 'VALIDATION'))
    }
    cb(null, true)
  },
})

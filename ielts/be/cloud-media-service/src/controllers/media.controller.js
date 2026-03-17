const cloudinary = require('../config/cloudinary');
const { uploadToCloudinary } = require('../utils/cloudinary.util');

function inferResourceType(mimeType) {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  if (mimeType.startsWith('audio/')) {
    // Cloudinary handles audio via resource_type="video"
    return 'video';
  }

  if (mimeType === 'application/pdf') {
    return 'raw';
  }

  return 'image';
}

async function uploadMedia(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Use field name: file',
      });
    }

    const folderName =
      req.body.folderName ||
      process.env.DEFAULT_UPLOAD_FOLDER ||
      'ielts_platform/misc';

    const requestedType = req.body.resourceType;
    const resourceType = requestedType || inferResourceType(req.file.mimetype);

    const result = await uploadToCloudinary(
      req.file.buffer,
      folderName,
      resourceType
    );

    return res.status(201).json({
      success: true,
      data: {
        secure_url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteMedia(req, res, next) {
  try {
    const { public_id: publicId, resource_type: resourceType = 'image' } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'public_id is required',
      });
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function generateUploadSignature(req, res, next) {
  try {
    const folder = req.query.folderName || process.env.DEFAULT_UPLOAD_FOLDER || 'ielts_platform/misc';
    const timestamp = Math.round(Date.now() / 1000);

    const paramsToSign = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return res.status(200).json({
      success: true,
      data: {
        signature,
        timestamp,
        folder,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadMedia,
  deleteMedia,
  generateUploadSignature,
};

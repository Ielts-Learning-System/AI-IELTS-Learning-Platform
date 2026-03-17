const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');

const allowedResourceTypes = new Set(['image', 'video', 'raw']);

function uploadToCloudinary(fileBuffer, folderName, resourceType) {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) {
      return reject(new Error('No file buffer provided for upload'));
    }

    const normalizedResourceType = allowedResourceTypes.has(resourceType)
      ? resourceType
      : 'image';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: normalizedResourceType,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        return resolve(result);
      }
    );

    Readable.from(fileBuffer).pipe(uploadStream);
  });
}

module.exports = {
  uploadToCloudinary,
};

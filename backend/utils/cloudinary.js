import { v2 as cloudinary } from 'cloudinary';
import "dotenv/config";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = async (fileData, options = {}) => {
    try {
        const result = await cloudinary.uploader.upload(fileData, {
            folder: 'videodesk_logos',
            resource_type: 'auto',
            ...options
        });
        return result;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};

export default cloudinary;

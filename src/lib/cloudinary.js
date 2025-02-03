import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: import.meta.env.VITE_CLOUD_NAME,
    api_key: import.meta.env.VITE_API_KEY,
    api_secret: import.meta.env.VITE_API_SECRET,
    vite_cloudinary_upload_preset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
});

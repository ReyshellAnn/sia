import { json, type RequestHandler } from '@sveltejs/kit';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: import.meta.env.VITE_CLOUD_NAME,
    api_key: import.meta.env.VITE_API_KEY,
    api_secret: import.meta.env.VITE_API_SECRET
});

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { public_id } = await request.json();

        if (!public_id) {
            return json({ error: 'Missing public_id' }, { status: 400 });
        }

        // Delete the image from Cloudinary
        const result = await cloudinary.uploader.destroy(public_id);

        return json(result);
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        return json({ error: 'Failed to delete image' }, { status: 500 });
    }
};

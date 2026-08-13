import { CONFIG } from './config';
import { Platform } from 'react-native';

/**
 * Parses and extracts the public ID of an asset from its Cloudinary secure URL.
 * Supports folders and version prefixes.
 * Example: https://res.cloudinary.com/cloud/image/upload/v12345/folder/name.jpg -> folder/name
 */
const getCloudinaryPublicId = (url: string): string | null => {
  if (!url || !url.includes('cloudinary.com')) return null;
  
  const parts = url.split('/upload/');
  if (parts.length < 2) return null;
  
  let path = parts[1];
  
  // Remove version segment (e.g., v1718035619/) if present
  const versionRegex = /^v\d+\//;
  path = path.replace(versionRegex, '');
  
  // Remove file extension (e.g., .jpg, .png)
  const dotIndex = path.lastIndexOf('.');
  if (dotIndex !== -1) {
    path = path.substring(0, dotIndex);
  }
  return path;
};

export const cloudinaryService = {
  /**
   * Uploads an image to Cloudinary.
   * If mock is active, returns a random high-quality mock Unsplash image URL.
   * @param localUri Local file URI from image picker
   */
  uploadImage: async (localUri: string): Promise<string> => {
    const isCloudinaryConfigured = 
      CONFIG.cloudinary.cloudName &&
      CONFIG.cloudinary.cloudName !== 'your-cloud-name' && 
      CONFIG.cloudinary.uploadPreset &&
      CONFIG.cloudinary.uploadPreset !== 'your-unsigned-upload-preset' &&
      CONFIG.cloudinary.uploadPreset !== 'your-upload-preset';

    if (CONFIG.USE_MOCK_DATA || !isCloudinaryConfigured) {
      console.log('Using simulated Cloudinary upload for URI:', localUri);
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Return a nice random Unsplash image depending on context
      const placeholders = [
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600',
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600',
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600',
        'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600',
        'https://images.unsplash.com/photo-1525609004556-c46c7d6cf0a3?w=600'
      ];
      const randomIndex = Math.floor(Math.random() * placeholders.length);
      return placeholders[randomIndex];
    }

    try {
      const data = new FormData();
      const uriParts = localUri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      
      // In React Native, FormData requires an object structure for files
      data.append('file', {
        uri: localUri,
        name: `upload.${fileType}`,
        type: `image/${fileType === 'png' ? 'png' : 'jpeg'}`,
      } as any);
      
      data.append('upload_preset', CONFIG.cloudinary.uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CONFIG.cloudinary.cloudName}/image/upload`,
        {
          method: 'POST',
          body: data,
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Cloudinary upload failed: ${errText}`);
      }

      const responseData = await response.json();
      return responseData.secure_url; // Returns HTTPS URL
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  },

  /**
   * Deletes an image from Cloudinary.
   * Requires EXPO_PUBLIC_CLOUDINARY_API_KEY and EXPO_PUBLIC_CLOUDINARY_API_SECRET to be configured in .env.
   * If not configured or in mock mode, simulates the deletion.
   * @param url Cloudinary secure URL of the image
   */
  deleteImage: async (url: string): Promise<void> => {
    const isCloudinaryConfigured = 
      CONFIG.cloudinary.cloudName &&
      CONFIG.cloudinary.cloudName !== 'your-cloud-name';
      
    const apiKey = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET;
    
    const publicId = getCloudinaryPublicId(url);
    if (!publicId) {
      console.log('Skipping delete: not a valid Cloudinary URL or no publicId found:', url);
      return;
    }

    if (CONFIG.USE_MOCK_DATA || !isCloudinaryConfigured || !apiKey || !apiSecret) {
      console.log('Using simulated Cloudinary delete for public ID:', publicId);
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    }

    try {
      const timestamp = Math.round(new Date().getTime() / 1000).toString();
      
      // Compute signature: SHA-1 of "public_id=<publicId>&timestamp=<timestamp><apiSecret>"
      const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const Crypto = require('expo-crypto');
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA1,
        signatureString
      );

      const data = new FormData();
      data.append('public_id', publicId);
      data.append('timestamp', timestamp);
      data.append('api_key', apiKey);
      data.append('signature', signature);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CONFIG.cloudinary.cloudName}/image/destroy`,
        {
          method: 'POST',
          body: data,
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Cloudinary delete failed: ${errText}`);
      }

      const responseData = await response.json();
      if (responseData.result !== 'ok') {
        console.warn('Cloudinary destroy result not ok:', responseData);
      } else {
        console.log('Cloudinary image deleted successfully:', publicId);
      }
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      // We do not crash the calling thread if Cloudinary image deletion fails
    }
  }
};

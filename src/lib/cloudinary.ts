// Cloudinary configuration และ utilities
import { v2 as cloudinary } from 'cloudinary';
import { createFileUploadError, AppError } from './errorHandler';

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// File upload options
export interface UploadOptions {
  folder?: string;
  public_id?: string;
  transformation?: any;
  quality?: string | number;
  format?: string;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
}

// Default upload options
const defaultOptions: UploadOptions = {
  folder: 'ensport-alerts',
  quality: 'auto',
  format: 'auto',
  resource_type: 'auto',
};

// Allowed file types
const allowedImageTypes = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
];

const allowedVideoTypes = [
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/wmv',
  'video/webm'
];

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Validate file type
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

// Validate file size
export const validateFileSize = (file: File, maxSize: number): boolean => {
  return file.size <= maxSize;
};

// Generate unique filename
export const generateFileName = (originalName: string, userId?: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2);
  const extension = originalName.split('.').pop();
  const userPrefix = userId ? `user_${userId}_` : '';
  
  return `${userPrefix}${timestamp}_${randomString}.${extension}`;
};

// Upload file to Cloudinary
export const uploadToCloudinary = async (
  file: Buffer | string,
  options: UploadOptions = {}
): Promise<any> => {
  try {
    const uploadOptions = { ...defaultOptions, ...options };
    
    const result = await cloudinary.uploader.upload(file as string, uploadOptions);
    
    return {
      public_id: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes,
      created_at: result.created_at,
    };
  } catch (error: any) {
    throw createFileUploadError(`Cloudinary upload failed: ${error.message}`, error);
  }
};

// Upload image with validation
export const uploadImage = async (
  file: File,
  options: UploadOptions = {},
  userId?: string
): Promise<any> => {
  // Validate file type
  if (!validateFileType(file, allowedImageTypes)) {
    throw createFileUploadError('Invalid image file type. Allowed: JPEG, PNG, GIF, WebP');
  }

  // Validate file size
  if (!validateFileSize(file, MAX_IMAGE_SIZE)) {
    throw createFileUploadError(`Image file too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
  }

  // Convert file to buffer
  const buffer = await file.arrayBuffer();
  const base64 = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;

  // Set upload options
  const uploadOptions: UploadOptions = {
    ...options,
    folder: options.folder || 'ensport-alerts/images',
    public_id: options.public_id || generateFileName(file.name, userId),
    resource_type: 'image',
    transformation: options.transformation || [
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ],
  };

  return await uploadToCloudinary(base64, uploadOptions);
};

// Upload video with validation
export const uploadVideo = async (
  file: File,
  options: UploadOptions = {},
  userId?: string
): Promise<any> => {
  // Validate file type
  if (!validateFileType(file, allowedVideoTypes)) {
    throw createFileUploadError('Invalid video file type. Allowed: MP4, AVI, MOV, WMV, WebM');
  }

  // Validate file size
  if (!validateFileSize(file, MAX_VIDEO_SIZE)) {
    throw createFileUploadError(`Video file too large. Maximum size: ${MAX_VIDEO_SIZE / 1024 / 1024}MB`);
  }

  // Convert file to buffer
  const buffer = await file.arrayBuffer();
  const base64 = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;

  // Set upload options
  const uploadOptions: UploadOptions = {
    ...options,
    folder: options.folder || 'ensport-alerts/videos',
    public_id: options.public_id || generateFileName(file.name, userId),
    resource_type: 'video',
    transformation: options.transformation || [
      { quality: 'auto' },
      { format: 'mp4' }
    ],
  };

  return await uploadToCloudinary(base64, uploadOptions);
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    return result.result === 'ok';
  } catch (error: any) {
    throw createFileUploadError(`Failed to delete file: ${error.message}`, error);
  }
};

// Get file info from Cloudinary
export const getFileInfo = async (publicId: string): Promise<any> => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error: any) {
    throw createFileUploadError(`Failed to get file info: ${error.message}`, error);
  }
};

// Generate optimized URL
export const generateOptimizedUrl = (
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
  } = {}
): string => {
  return cloudinary.url(publicId, {
    ...options,
    secure: true,
    quality: options.quality || 'auto',
    fetch_format: options.format || 'auto',
  });
};

// Image transformation presets
export const imageTransformations = {
  thumbnail: { width: 150, height: 150, crop: 'fill' },
  medium: { width: 500, height: 500, crop: 'limit' },
  large: { width: 1200, height: 1200, crop: 'limit' },
  banner: { width: 1200, height: 400, crop: 'fill' },
  avatar: { width: 200, height: 200, crop: 'fill', gravity: 'face' },
};

// Generate multiple image sizes
export const generateImageSizes = (publicId: string) => {
  return {
    thumbnail: generateOptimizedUrl(publicId, imageTransformations.thumbnail),
    medium: generateOptimizedUrl(publicId, imageTransformations.medium),
    large: generateOptimizedUrl(publicId, imageTransformations.large),
    original: generateOptimizedUrl(publicId),
  };
};

// Batch upload utility
export const batchUpload = async (
  files: File[],
  options: UploadOptions = {},
  userId?: string
): Promise<any[]> => {
  const uploadPromises = files.map(file => {
    if (allowedImageTypes.includes(file.type)) {
      return uploadImage(file, options, userId);
    } else if (allowedVideoTypes.includes(file.type)) {
      return uploadVideo(file, options, userId);
    } else {
      throw createFileUploadError(`Unsupported file type: ${file.type}`);
    }
  });

  try {
    return await Promise.all(uploadPromises);
  } catch (error) {
    throw createFileUploadError('Batch upload failed', error);
  }
};

// Cleanup old files (utility for maintenance)
export const cleanupOldFiles = async (folderPath: string, daysOld: number = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: 500,
    });

    const oldFiles = result.resources.filter((resource: any) => {
      return new Date(resource.created_at) < cutoffDate;
    });

    const deletePromises = oldFiles.map((file: any) => 
      deleteFromCloudinary(file.public_id, file.resource_type)
    );

    await Promise.all(deletePromises);
    
    return oldFiles.length;
  } catch (error: any) {
    throw new AppError(`Cleanup failed: ${error.message}`, 500);
  }
};

export default cloudinary;

// API route สำหรับ upload ไฟล์ไปยัง Cloudinary
import { NextRequest } from 'next/server';
import { withErrorHandler, createSuccessResponse, createFileUploadError } from '@/lib/errorHandler';
import { withCors } from '@/lib/cors';
import { authenticateToken } from '@/lib/security';
import { uploadImage, uploadVideo, generateImageSizes } from '@/lib/cloudinary';

export const POST = withErrorHandler(
  withCors(
    authenticateToken(async (req: NextRequest) => {
      try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string; // 'image' | 'video'
        const folder = formData.get('folder') as string || 'general';
        
        if (!file) {
          throw createFileUploadError('No file provided');
        }
        
        const user = (req as any).user;
        const userId = user?.id;
        
        let uploadResult;
        
        if (type === 'video') {
          uploadResult = await uploadVideo(file, { folder: `ensport-alerts/${folder}` }, userId);
        } else {
          // Default to image upload
          uploadResult = await uploadImage(file, { folder: `ensport-alerts/${folder}` }, userId);
          
          // Generate different sizes for images
          uploadResult.sizes = generateImageSizes(uploadResult.public_id);
        }
        
        // บันทึกข้อมูล file ลงฐานข้อมูล (ถ้าต้องการ)
        // const fileRecord = await prisma.file.create({
        //   data: {
        //     publicId: uploadResult.public_id,
        //     url: uploadResult.url,
        //     format: uploadResult.format,
        //     resourceType: uploadResult.resource_type,
        //     bytes: uploadResult.bytes,
        //     userId: userId,
        //     folder: folder,
        //   },
        // });
        
        return createSuccessResponse(
          {
            file: uploadResult,
            message: 'File uploaded successfully'
          },
          'Upload successful',
          201
        );
        
      } catch (error: any) {
        if (error.message.includes('Invalid file type')) {
          throw createFileUploadError(error.message);
        } else if (error.message.includes('too large')) {
          throw createFileUploadError(error.message);
        } else {
          throw createFileUploadError('Upload failed', error);
        }
      }
    })
  )
);

// GET - ดึงรายการไฟล์ของ user
export const GET = withErrorHandler(
  withCors(
    authenticateToken(async (req: NextRequest) => {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
      const folder = searchParams.get('folder');
      
      const user = (req as any).user;
      
      // ตัวอย่างการดึงข้อมูลไฟล์
      // const files = await prisma.file.findMany({
      //   where: {
      //     userId: user.id,
      //     ...(folder && { folder }),
      //   },
      //   skip: (page - 1) * limit,
      //   take: limit,
      //   orderBy: { createdAt: 'desc' },
      // });
      
      const files: any[] = []; // placeholder
      
      return createSuccessResponse({
        files,
        pagination: {
          page,
          limit,
          total: files.length,
          totalPages: Math.ceil(files.length / limit),
        },
      });
    })
  )
);

// DELETE - ลบไฟล์
export const DELETE = withErrorHandler(
  withCors(
    authenticateToken(async (req: NextRequest) => {
      const { searchParams } = new URL(req.url);
      const fileId = searchParams.get('fileId');
      
      if (!fileId) {
        throw createFileUploadError('File ID is required');
      }
      
      const user = (req as any).user;
      
      // ดึงข้อมูลไฟล์
      // const file = await prisma.file.findFirst({
      //   where: {
      //     id: fileId,
      //     userId: user.id, // security: เฉพาะเจ้าของเท่านั้น
      //   },
      // });
      
      // if (!file) {
      //   throw createFileUploadError('File not found or access denied');
      // }
      
      // ลบจาก Cloudinary
      // await deleteFromCloudinary(file.publicId, file.resourceType);
      
      // ลบจากฐานข้อมูล
      // await prisma.file.delete({
      //   where: { id: fileId },
      // });
      
      return createSuccessResponse(
        { fileId },
        'File deleted successfully'
      );
    })
  )
);

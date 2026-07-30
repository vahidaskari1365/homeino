'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      onImageUpload(acceptedFiles[0]);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: false
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 transition-all
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <Upload size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-800">تصویر خود را اینجا رها کنید</h3>
            <p className="text-gray-500">یا برای انتخاب فایل کلیک کنید</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Camera size={16} />
            <span>پشتیبانی از JPG, PNG, WEBP</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

'use client';

import React from 'react';

export const ProductSkeleton: React.FC = () => {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-md">
      <div className="h-64 w-full animate-pulse bg-gray-200" />
      <div className="p-5 space-y-4">
        <div className="flex justify-between">
          <div className="h-6 w-1/2 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-1/4 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <div className="h-8 w-1/3 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-1/4 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
};

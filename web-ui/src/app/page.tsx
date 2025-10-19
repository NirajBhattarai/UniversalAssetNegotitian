'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to chat page
    router.push('/chat');
  }, [router]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center'>
      <div className='text-center'>
        <div className='w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6'>
          <span className='text-3xl'>🤖</span>
        </div>
        <h1 className='text-2xl font-bold text-gray-900 mb-2'>
          Redirecting to Chat...
        </h1>
        <p className='text-gray-600'>
          Taking you to the Carbon Credit Trading Platform
        </p>
      </div>
    </div>
  );
}

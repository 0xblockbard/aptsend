// NOTE: This file is NOT needed with the Telegram Widget approach!
// The widget handles the callback via JavaScript, not via a route.
// You can delete this file or keep it as a fallback.

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TelegramCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // If someone accidentally navigates here, redirect to dashboard
    console.log('TelegramCallback route accessed - redirecting to dashboard');
    navigate('/dashboard');
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function TwitterCallback() {
  const [searchParams] = useSearchParams();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return; // Prevent double execution
    hasRun.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Twitter OAuth error:', error);
      if (window.opener) {
        window.opener.postMessage(
          { type: 'TWITTER_OAUTH_ERROR', error },
          window.location.origin
        );
      }
      window.close();
      return;
    }

    if (code && state && window.opener) {
      console.log('Sending callback to parent:', { code, state });
      window.opener.postMessage(
        { type: 'TWITTER_OAUTH_CALLBACK', code, state },
        window.location.origin
      );
      
      setTimeout(() => {
        window.close();
      }, 500);
    }
  }, []); // Empty dependency array + ref prevents double run

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Connecting Twitter...</h2>
        <p className="text-gray-600">This window will close automatically.</p>
      </div>
    </div>
  );
}
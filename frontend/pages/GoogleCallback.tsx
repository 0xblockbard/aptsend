import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      if (window.opener) {
        window.opener.postMessage(
          { type: 'GOOGLE_OAUTH_ERROR', error },
          window.location.origin
        );
        setTimeout(() => window.close(), 500);
      } else {
        navigate('/dashboard', { state: { error: 'Google authentication failed' } });
      }
      return;
    }

    if (code && state) {
      if (window.opener) {
        console.log('Sending callback to parent:', { code, state });
        window.opener.postMessage(
          { type: 'GOOGLE_OAUTH_CALLBACK', code, state },
          window.location.origin
        );
        setTimeout(() => window.close(), 500);
      } else {
        console.warn('No window.opener - user may have opened callback URL directly');
        navigate('/dashboard', { state: { error: 'Please try connecting again' } });
      }
    } else {
      console.error('Missing code or state parameters');
      if (window.opener) {
        window.opener.postMessage(
          { type: 'GOOGLE_OAUTH_ERROR', error: 'missing_parameters' },
          window.location.origin
        );
        setTimeout(() => window.close(), 500);
      } else {
        navigate('/dashboard');
      }
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <div className="mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
        </div>
        <h2 className="text-xl font-semibold mb-2">Connecting Google...</h2>
        <p className="text-gray-600">This window will close automatically.</p>
      </div>
    </div>
  );
}
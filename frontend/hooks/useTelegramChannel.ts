import { useState, useCallback } from 'react';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { 
  handleTelegramCallback,
  unsyncTelegramAccount
} from '../services/telegramApi';
import { 
  TelegramIdentity, 
  SyncResult,
  UseTelegramChannelReturn
} from '../types/channelTypes';
import { TELEGRAM_BOT_USERNAME  } from '@/constants';
import { logger } from '../utils/logger';

interface UseTelegramChannelProps {
  ownerAddress: AccountAddress | undefined;
  telegramIdentities: TelegramIdentity[];
  onIdentitiesChange: () => Promise<void>;
}

export function useTelegramChannel({
  ownerAddress,
  telegramIdentities,
  onIdentitiesChange
}: UseTelegramChannelProps): UseTelegramChannelReturn {
  const [isLoading, setIsLoading] = useState(false);

  const completeAuth = useCallback(async (authData: Record<string, any>) => {
    logger.log('=== COMPLETE AUTH CALLED ===');
    logger.log('Auth Data:', authData);
    
    const timeoutId = sessionStorage.getItem('telegram_auth_timeout');
    if (timeoutId) {
      clearTimeout(Number(timeoutId));
      sessionStorage.removeItem('telegram_auth_timeout');
    }

    if (!ownerAddress) {
      console.error('No owner address available');
      setIsLoading(false);
      return;
    }

    try {
      logger.log('Calling handleTelegramCallback...');
      await handleTelegramCallback(ownerAddress, authData);
      logger.log('Callback successful, reloading identities...');
      await onIdentitiesChange();
    } catch (error) {
      console.error('Telegram callback error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [ownerAddress, onIdentitiesChange]);

  const sync = async (): Promise<SyncResult> => {
    logger.log('=== SYNC STARTED ===');
    
    if (!ownerAddress) {
      console.error('No wallet connected');
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsLoading(true);
      
      logger.log('Opening Telegram Login Widget popup...');
      const popup = window.open(
        '',
        'telegram-login',
        'width=600,height=700,left=200,top=100'
      );

      if (!popup) {
        console.error('Popup blocked by browser');
        setIsLoading(false);
        return { success: false, error: 'Popup blocked' };
      }

      // Create HTML with Telegram Login Widget
      const widgetHtml = `
        <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Telegram Login</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #2AABEE 0%, #229ED9 100%);
      padding: 20px;
    }
    
    .container {
      text-align: center;
      background: #ffffff;
      padding: 48px 40px;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      max-width: 400px;
      width: 100%;
      animation: slideUp 0.4s ease-out;
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, #2AABEE 0%, #229ED9 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(42, 171, 238, 0.3);
    }
    
    .logo svg {
      width: 48px;
      height: 48px;
      fill: white;
    }
    
    h2 {
      margin: 0 0 12px 0;
      color: #222222;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    
    p {
      color: #6D6D72;
      margin-bottom: 32px;
      font-size: 15px;
      line-height: 1.5;
    }
    
    .telegram-widget-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 24px;
    }
    
    .footer {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #E5E5EA;
    }
    
    .footer-text {
      color: #8E8E93;
      font-size: 13px;
      margin: 0;
    }
    
    .secure-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #34C759;
      font-size: 13px;
      font-weight: 500;
      margin-top: 12px;
    }
    
    .secure-badge svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
    
    @media (max-width: 480px) {
      .container {
        padding: 36px 24px;
      }
      
      h2 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <svg viewBox="0 0 1000 1000" fill="none"><defs><linearGradient x1="50%" y1="0%" x2="50%" y2="99.2583404%" id="tg-grad"><stop stop-color="#2AABEE" offset="0%"></stop><stop stop-color="#229ED9" offset="100%"></stop></linearGradient></defs><circle fill="url(#tg-grad)" cx="500" cy="500" r="500"></circle><path d="M226.328419,494.722069 C372.088573,431.216685 469.284839,389.350049 517.917216,369.122161 C656.772535,311.36743 685.625481,301.334815 704.431427,301.003532 C708.567621,300.93067 717.815839,301.955743 723.806446,306.816707 C728.864797,310.92121 730.256552,316.46581 730.922551,320.357329 C731.588551,324.248848 732.417879,333.113828 731.758626,340.040666 C724.234007,419.102486 691.675104,610.964674 675.110982,699.515267 C668.10208,736.984342 654.301336,749.547532 640.940618,750.777006 C611.904684,753.448938 589.856115,731.588035 561.733393,713.153237 C517.726886,684.306416 492.866009,666.349181 450.150074,638.200013 C400.78442,605.66878 432.786119,587.789048 460.919462,558.568563 C468.282091,550.921423 596.21508,434.556479 598.691227,424.000355 C599.00091,422.680135 599.288312,417.758981 596.36474,415.160431 C593.441168,412.561881 589.126229,413.450484 586.012448,414.157198 C581.598758,415.158943 511.297793,461.625274 375.109553,553.556189 C355.154858,567.258623 337.080515,573.934908 320.886524,573.585046 C303.033948,573.199351 268.692754,563.490928 243.163606,555.192408 C211.851067,545.013936 186.964484,539.632504 189.131547,522.346309 C190.260287,513.342589 202.659244,504.134509 226.328419,494.722069 Z" fill="#FFFFFF"></path></svg>
    </div>
    
    <h2>Connect with Telegram</h2>
    <p>Sign in securely using your Telegram account</p>
    
    <div class="telegram-widget-wrapper">
      <script async src="https://telegram.org/js/telegram-widget.js?22"
        data-telegram-login="${TELEGRAM_BOT_USERNAME}"
        data-size="large"
        data-radius="8"
        data-onauth="onTelegramAuth(user)"
        data-request-access="write">
      </script>
    </div>
    
    <div class="footer">
      <div class="secure-badge">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
        </svg>
        Secure Authentication
      </div>
      <p class="footer-text">Your data is protected and encrypted</p>
    </div>
  </div>
  
  <script>
    function onTelegramAuth(user) {
      
      if (window.opener) {
        window.opener.postMessage({
          type: 'TELEGRAM_OAUTH_CALLBACK',
          authData: user
        }, window.location.origin);
        
        setTimeout(() => window.close(), 500);
      } else {
        alert('Authentication successful! Please close this window.');
      }
    }
  </script>
</body>
</html>
      `;

      popup.document.write(widgetHtml);
      popup.document.close();

      logger.log('Telegram widget loaded in popup');

      // Wait for Telegram auth to complete
      return new Promise<SyncResult>((resolve) => {
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data.type === 'TELEGRAM_OAUTH_CALLBACK') {
            window.removeEventListener('message', handleMessage);
            clearTimeout(abandonmentTimeout);
            
            completeAuth(event.data.authData)
              .then(() => {
                setIsLoading(false);
                resolve({ success: true });
              })
              .catch((error) => {
                setIsLoading(false);
                resolve({ success: false, error: error.message });
              });
          } else if (event.data.type === 'TELEGRAM_OAUTH_ERROR') {
            window.removeEventListener('message', handleMessage);
            clearTimeout(abandonmentTimeout);
            setIsLoading(false);
            resolve({ success: false, error: event.data.error });
          }
        };

        const abandonmentTimeout = setTimeout(() => {
          window.removeEventListener('message', handleMessage);
          if (popup && !popup.closed) popup.close();
          setIsLoading(false);
          resolve({ success: false, error: 'Authentication timeout' });
        }, 5 * 60 * 1000);

        window.addEventListener('message', handleMessage);
      });

    } catch (error) {
      console.error('=== SYNC FAILED ===');
      console.error('Error details:', error);
      setIsLoading(false);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync' 
      };
    }
  };

  const unsync = async (accountId: string): Promise<void> => {
    if (!ownerAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      await unsyncTelegramAccount(ownerAddress, accountId);
      await onIdentitiesChange();
    } catch (error) {
      console.error('Failed to unsync Telegram account:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    accounts: telegramIdentities,
    isLoading,
    sync,
    unsync,
  };
}
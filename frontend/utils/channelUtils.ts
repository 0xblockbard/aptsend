import { ChannelType } from "@/types/channelTypes";
import { API_BASE_URL } from "@/constants";
import { logger } from './logger';

// Validation functions
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateEvmAddress = (address: string): boolean => {
  // EVM addresses are 42 characters long and start with 0x
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const validateSolanaAddress = (address: string): boolean => {
  // Solana addresses are base58 encoded, typically 32-44 characters
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

export const validateIdentifier = (
  channel: ChannelType,
  value: string
): { valid: boolean; error?: string } => {
  const trimmed = value.trim();
  
  switch (channel) {
    case 'google':
      if (!validateEmail(trimmed)) {
        return { valid: false, error: 'Please enter a valid email address' };
      }
      break;
    case 'evm':
      if (!validateEvmAddress(trimmed)) {
        return { valid: false, error: 'Please enter a valid EVM address (0x followed by 40 hex characters)' };
      }
      break;
    case 'sol':
      if (!validateSolanaAddress(trimmed)) {
        return { valid: false, error: 'Please enter a valid Solana address (32-44 characters)' };
      }
      break;
    case 'twitter':
    case 'telegram':
    case 'discord':
      if (trimmed.length === 0) {
        return { valid: false, error: 'Please enter a username' };
      }
      if (trimmed.startsWith('@')) {
        return { valid: false, error: 'Please enter username without @ symbol' };
      }
      break;
  }
  
  return { valid: true };
};

// Helper to determine if channel needs backend resolution
export const needsBackendResolution = (channel: ChannelType): boolean => {
  return channel !== 'evm' && channel !== 'sol' && channel !== 'google';
};

// Resolve identifier to channel_user_id
export const resolveChannelUserId = async (
  channel: ChannelType,
  identifier: string
): Promise<string> => {
  const trimmedIdentifier = identifier.trim();

  // For EVM, Solana, and Email, the identifier IS the channel_user_id
  if (!needsBackendResolution(channel)) {
    logger.log('Using identifier directly as channel_user_id:', trimmedIdentifier);
    return trimmedIdentifier;
  }

  // For social platforms, resolve via backend
  const params = new URLSearchParams({
    channel,
    identifier: trimmedIdentifier
  });

  logger.log('Resolving identifier:', { channel, identifier: trimmedIdentifier });

  const backendResponse = await fetch(
    `${API_BASE_URL}/checker/get-identity?${params}`,
    {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  );

  const backendData = await backendResponse.json();

  if (!backendResponse.ok || !backendData.success) {
    throw new Error(backendData.message || 'Failed to resolve identifier');
  }

  const channelUserId = backendData.channel_user_id;
  logger.log('Resolved channel_user_id:', channelUserId);
  
  return channelUserId;
};

// Get label for identifier input
export const getIdentifierLabel = (channel: ChannelType): string => {
  switch (channel) {
    case 'twitter':
      return 'Username';
    case 'telegram':
      return 'Handle';
    case 'discord':
      return 'Username';
    case 'google':
      return 'Email';
    case 'evm':
      return 'EVM Wallet Address';
    case 'sol':
      return 'Solana Wallet Address';
    default:
      return 'Identifier';
  }
};

// Get placeholder for identifier input
export const getIdentifierPlaceholder = (channel: ChannelType): string => {
  switch (channel) {
    case 'twitter':
      return 'e.g. aptos (no @)';
    case 'telegram':
      return 'e.g. handle';
    case 'google':
      return 'e.g. user@gmail.com';
    case 'discord':
      return 'e.g. username#1234';
    case 'evm':
      return 'e.g. 0xABC...';
    case 'sol':
      return 'e.g. 7EqQ...pump';
    default:
      return 'Enter identifier';
  }
};

// Get display name for channel
export const getChannelDisplayName = (channel: ChannelType): string => {
  switch (channel) {
    case 'twitter':
      return 'Twitter / X';
    case 'telegram':
      return 'Telegram';
    case 'google':
      return 'Email';
    case 'discord':
      return 'Discord';
    case 'evm':
      return 'Ethereum / EVM';
    case 'sol':
      return 'Solana';
    default: {
      // Exhaustive check - this should never be reached
      const exhaustiveCheck: never = channel;
      return String(exhaustiveCheck).charAt(0).toUpperCase() + String(exhaustiveCheck).slice(1);
    }
  }
};
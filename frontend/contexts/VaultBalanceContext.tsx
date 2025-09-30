import { createContext, useContext, useState, ReactNode } from 'react';

interface VaultBalances {
  apt: string;
  usdc?: string;
  usdt?: string;
}

interface CacheEntry {
  balances: VaultBalances;
  timestamp: number;
}

interface VaultBalanceContextType {
  getBalances: (address: string) => VaultBalances | null;
  setBalances: (address: string, balances: VaultBalances) => void;
  clearCache: (address?: string) => void;
  isCacheValid: (address: string, maxAge?: number) => boolean;
}

const VaultBalanceContext = createContext<VaultBalanceContextType | null>(null);

const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const STORAGE_KEY = 'vault_balance_cache';

// Load cache from sessionStorage on init
const loadCacheFromStorage = (): Record<string, CacheEntry> => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save cache to sessionStorage
const saveCacheToStorage = (cache: Record<string, CacheEntry>) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to save cache to sessionStorage:', error);
  }
};

export function VaultBalanceProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<Record<string, CacheEntry>>(loadCacheFromStorage);

  const getBalances = (address: string): VaultBalances | null => {
    return cache[address]?.balances || null;
  };

  const setBalances = (address: string, balances: VaultBalances) => {
    setCache(prev => {
      const newCache = {
        ...prev,
        [address]: {
          balances,
          timestamp: Date.now(),
        },
      };
      saveCacheToStorage(newCache);
      return newCache;
    });
  };

  const clearCache = (address?: string) => {
    if (address) {
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[address];
        saveCacheToStorage(newCache);
        return newCache;
      });
    } else {
      setCache({});
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const isCacheValid = (address: string, maxAge = DEFAULT_CACHE_DURATION): boolean => {
    const cached = cache[address];
    if (!cached) return false;
    return Date.now() - cached.timestamp < maxAge;
  };

  return (
    <VaultBalanceContext.Provider 
      value={{ getBalances, setBalances, clearCache, isCacheValid }}
    >
      {children}
    </VaultBalanceContext.Provider>
  );
}

export function useVaultBalanceCache() {
  const context = useContext(VaultBalanceContext);
  if (!context) {
    throw new Error('useVaultBalanceCache must be used within VaultBalanceProvider');
  }
  return context;
}
import { cache } from 'react';

// Interface for Room Info
export interface RoomInfo {
  roomId: string;
  isStreamActive: boolean;
  createdAt: number;
  lastActive: number;
  viewers?: number;
}

// Memory cache for faster access
const roomInfoCache = new Map<string, RoomInfo>();

// Cache expiration time (2 hours in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

/**
 * Get room information from cache, localStorage or create new
 */
export function getRoomInfo(existingRoomId?: string): RoomInfo {
  // First check if we have a room in memory cache
  if (existingRoomId && roomInfoCache.has(existingRoomId)) {
    const cachedInfo = roomInfoCache.get(existingRoomId)!;
    // Update last active timestamp
    cachedInfo.lastActive = Date.now();
    roomInfoCache.set(existingRoomId, cachedInfo);
    return cachedInfo;
  }
  
  // Check localStorage if we're in a browser context
  if (typeof window !== 'undefined') {
    // Try to get cached room info from localStorage
    const savedRoomInfo = localStorage.getItem('roomInfo');
    if (savedRoomInfo) {
      try {
        const parsedInfo = JSON.parse(savedRoomInfo) as RoomInfo;
        
        // Verify the room info is still valid and not expired
        if (
          parsedInfo.roomId && 
          (Date.now() - parsedInfo.lastActive < CACHE_EXPIRATION)
        ) {
          // Update last active timestamp
          parsedInfo.lastActive = Date.now();
          
          // Update cache
          roomInfoCache.set(parsedInfo.roomId, parsedInfo);
          localStorage.setItem('roomInfo', JSON.stringify(parsedInfo));
          
          return parsedInfo;
        }
      } catch (e) {
        console.error('Error parsing cached room info:', e);
      }
    }
    
    // If we have an existing room ID but no cache, create new info
    if (existingRoomId) {
      const wasStreamActive = localStorage.getItem('isStreamActive') === 'true';
      
      const newInfo: RoomInfo = {
        roomId: existingRoomId,
        isStreamActive: wasStreamActive,
        createdAt: Date.now(),
        lastActive: Date.now(),
        viewers: 0
      };
      
      // Save to cache
      roomInfoCache.set(existingRoomId, newInfo);
      localStorage.setItem('roomInfo', JSON.stringify(newInfo));
      
      return newInfo;
    }
  }
  
  // Default empty room info
  return {
    roomId: '',
    isStreamActive: false,
    createdAt: Date.now(),
    lastActive: Date.now(),
    viewers: 0
  };
}

/**
 * Update room info in cache and localStorage
 */
export function updateRoomInfo(info: Partial<RoomInfo>, roomId: string): RoomInfo {
  if (!roomId) return getRoomInfo();
  
  // Get existing info or create new
  const existingInfo = roomInfoCache.get(roomId) || {
    roomId,
    isStreamActive: false,
    createdAt: Date.now(),
    lastActive: Date.now(),
    viewers: 0
  };
  
  // Update with new info
  const updatedInfo: RoomInfo = {
    ...existingInfo,
    ...info,
    lastActive: Date.now(),
  };
  
  // Save to cache
  roomInfoCache.set(roomId, updatedInfo);
  
  // Save to localStorage if in browser
  if (typeof window !== 'undefined') {
    localStorage.setItem('roomInfo', JSON.stringify(updatedInfo));
    
    // Also update individual items for backward compatibility
    if ('isStreamActive' in info) {
      localStorage.setItem('isStreamActive', info.isStreamActive ? 'true' : 'false');
    }
  }
  
  return updatedInfo;
}

/**
 * Clear room info from cache and localStorage
 */
export function clearRoomInfo(roomId: string): void {
  if (roomId) {
    roomInfoCache.delete(roomId);
  }
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem('roomInfo');
    localStorage.removeItem('roomId');
    localStorage.removeItem('isStreamActive');
  }
}

/**
 * React-cached version of getRoomInfo for server components
 */
export const getCachedRoomInfo = cache((roomId?: string): RoomInfo => {
  return getRoomInfo(roomId);
});

/**
 * Initialize room connection with caching
 */
export function initializeRoomConnection(roomId: string, isHost: boolean): void {
  if (typeof window !== 'undefined') {
    // Create or update room info
    updateRoomInfo({ 
      roomId,
      lastActive: Date.now()
    }, roomId);
    
    // For backward compatibility
    localStorage.setItem('roomId', roomId);
  }
} 
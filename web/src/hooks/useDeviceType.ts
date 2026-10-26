import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isAndroid: boolean;
  isTouch: boolean;
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  if (typeof window === 'undefined' || !navigator.vibrate) return;
  try {
    switch (type) {
      case 'light':
        navigator.vibrate(15);
        break;
      case 'medium':
        navigator.vibrate(30);
        break;
      case 'heavy':
        navigator.vibrate(50);
        break;
      case 'success':
        navigator.vibrate([25, 40, 35]);
        break;
      case 'error':
        navigator.vibrate([60, 40, 60]);
        break;
    }
  } catch {
    // Ignore vibration failure on unsupported browsers
  }
}

function checkIsAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /android/i.test(ua);
}

function checkIsTouch(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isAndroid: false,
      isTouch: false,
      isLandscape: false,
      screenWidth: 1024,
      screenHeight: 768,
    };
  }

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isAndroid = checkIsAndroid();
  const isTouch = checkIsTouch();
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  
  // Aware if screen width is mobile sized or if touch mobile user agent
  const isMobile = screenWidth <= 768 || (isTouch && isMobileUA);
  const isLandscape = isMobile && screenWidth > screenHeight;

  return {
    isMobile,
    isAndroid,
    isTouch,
    isLandscape,
    screenWidth,
    screenHeight,
  };
}

export function useDeviceType(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo);

  useEffect(() => {
    let timeoutId: number | undefined;

    const handleResize = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setDeviceInfo(getDeviceInfo());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
}

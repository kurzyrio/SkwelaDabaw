/**
 * SkwelaDabaw - Device Orientation & Location Services Helper
 * Provides smoothed compass heading and Life360/Google Maps-style GPS status diagnostics.
 */

export interface LocationDiagnostic {
  isPermitted: boolean;
  isGpsEnabled: boolean;
  errorCode?: number;
  message?: string;
}

/**
 * Circular Exponential Moving Average for jitter-free heading rotation
 */
function smoothHeading(prev: number, curr: number, factor = 0.25): number {
  let diff = (curr - prev + 180) % 360 - 180;
  return (prev + diff * factor + 360) % 360;
}

/**
 * Subscribes to device orientation to deliver real-time compass heading (0° = North, 90° = East).
 * Uses WebKit compass heading on iOS and absolute orientation on Android/Standard.
 */
export function subscribeToDeviceHeading(callback: (heading: number) => void): () => void {
  let lastHeading = 0;
  let hasValidReading = false;

  const handleOrientation = (e: DeviceOrientationEvent) => {
    let heading: number | null = null;

    // 1. WebKit/iOS Compass Heading (Direct true north clockwise)
    if (typeof (e as any).webkitCompassHeading === 'number') {
      heading = (e as any).webkitCompassHeading;
    } 
    // 2. Android absolute orientation (alpha is 0-360 counterclockwise from north)
    else if (e.alpha !== null && e.alpha !== undefined) {
      heading = (360 - e.alpha) % 360;
    }

    if (heading !== null && !isNaN(heading)) {
      if (!hasValidReading) {
        lastHeading = heading;
        hasValidReading = true;
      } else {
        lastHeading = smoothHeading(lastHeading, heading);
      }
      callback(Math.round(lastHeading));
    }
  };

  // Support absolute orientation event if available
  if ('ondeviceorientationabsolute' in window) {
    (window as any).addEventListener('deviceorientationabsolute', handleOrientation as any, { passive: true });
  } else if ('DeviceOrientationEvent' in window) {
    (window as any).addEventListener('deviceorientation', handleOrientation as any, { passive: true });
  }

  return () => {
    if ('ondeviceorientationabsolute' in window) {
      (window as any).removeEventListener('deviceorientationabsolute', handleOrientation as any);
    }
    (window as any).removeEventListener('deviceorientation', handleOrientation as any);
  };
}

import { Capacitor } from '@capacitor/core';
import { WidgetBridge } from './widgetService';

/**
 * Diagnoses whether device location permissions are granted and whether phone GPS is enabled.
 */
export async function diagnoseLocationStatus(): Promise<LocationDiagnostic> {
  // 1. Direct native Android/Capacitor check via WidgetBridge if available
  if (Capacitor.isNativePlatform() && typeof WidgetBridge.checkLocationStatus === 'function') {
    try {
      const res = await WidgetBridge.checkLocationStatus();
      if (!res.isPermitted) {
        return {
          isPermitted: false,
          isGpsEnabled: false,
          errorCode: 1,
          message: 'Location permission was denied. Please allow location access in your device settings.'
        };
      }
      if (!res.isGpsEnabled) {
        return {
          isPermitted: true,
          isGpsEnabled: false,
          errorCode: 2,
          message: "Your phone's Location (GPS) is turned off. Please turn on Location in device settings."
        };
      }
      return { isPermitted: true, isGpsEnabled: true };
    } catch (_) {}
  }

  // 2. Check permission state via Permissions API if available
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (status.state === 'denied') {
        return {
          isPermitted: false,
          isGpsEnabled: false,
          errorCode: 1,
          message: 'Location permission was denied. Please allow location in your device settings.'
        };
      }
    } catch (_) {}
  }

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ isPermitted: false, isGpsEnabled: false, message: 'Geolocation is not supported on this browser.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        resolve({ isPermitted: true, isGpsEnabled: true });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({
            isPermitted: false,
            isGpsEnabled: false,
            errorCode: 1,
            message: 'Location permission was denied. Please allow location access in your device settings.'
          });
        } else if (err.code === err.POSITION_UNAVAILABLE || err.code === err.TIMEOUT) {
          resolve({
            isPermitted: true,
            isGpsEnabled: false,
            errorCode: err.code,
            message: "Your phone's Location (GPS) is turned off. Please turn on Location in your device settings."
          });
        } else {
          resolve({ isPermitted: false, isGpsEnabled: false, errorCode: err.code, message: err.message });
        }
      },
      { timeout: 3500, enableHighAccuracy: true }
    );
  });
}

/**
 * Triggers native Android system request to open the Location (GPS) toggle screen.
 */
export async function requestDeviceLocationOn(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await WidgetBridge.openLocationSettings({ type: 'location' });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Triggers native Android system request to open App Details / Permissions settings.
 */
export async function requestAppLocationPermissions(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await WidgetBridge.openLocationSettings({ type: 'permission' });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

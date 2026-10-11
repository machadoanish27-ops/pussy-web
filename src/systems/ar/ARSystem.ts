import type { ARModeState } from '../../types'

export interface ARCapabilities {
  supportsWebXR: boolean
  supportsCamera: boolean
}

/**
 * ARSystem
 *
 * Manages browser AR capability detection, camera permissions,
 * and seamless fallback between WebXR and Mobile Camera Passthrough.
 */
export class ARSystem {
  public static async checkCapabilities(): Promise<ARCapabilities> {
    let supportsWebXR = false
    let supportsCamera = false

    // 1. Check WebXR immersive-ar
    if (navigator.xr && navigator.xr.isSessionSupported) {
      try {
        supportsWebXR = await navigator.xr.isSessionSupported('immersive-ar')
      } catch {
        supportsWebXR = false
      }
    }

    // 2. Check getUserMedia camera support
    if (typeof navigator.mediaDevices?.getUserMedia === 'function') {
      supportsCamera = true
    }

    return { supportsWebXR, supportsCamera }
  }

  public static async requestCameraStream(): Promise<{
    stream: MediaStream | null
    state: ARModeState
    error?: string
  }> {
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      return {
        stream: null,
        state: 'unsupported',
        error: 'Camera streaming is not supported on this browser.',
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      return {
        stream,
        state: 'camera_fallback',
      }
    } catch (err: unknown) {
      const error = err as Error
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return {
          stream: null,
          state: 'denied',
          error: 'Camera permission was denied. Please allow camera access in browser settings.',
        }
      }

      return {
        stream: null,
        state: 'unsupported',
        error: error.message || 'Could not start camera.',
      }
    }
  }
}

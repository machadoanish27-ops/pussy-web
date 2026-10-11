import { useEffect, useRef } from 'react'

interface ARCameraBackgroundProps {
  stream: MediaStream | null
}

/**
 * ARCameraBackground
 *
 * Fullscreen video stream element mounted behind the transparent Three.js canvas.
 * Creates seamless real-world camera passthrough AR on mobile browsers.
 */
export const ARCameraBackground = ({ stream }: ARCameraBackgroundProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {
        // Handle autoplay policy
      })
    }
  }, [stream])

  if (!stream) return null

  return (
    <video
      ref={videoRef}
      playsInline
      muted
      autoPlay
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}

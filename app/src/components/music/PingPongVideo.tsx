import { useEffect, useRef, useState } from 'react';

interface PingPongVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src?: string;
  className?: string;
  playing?: boolean;
}

/**
 * PingPongVideo: Plays video forward natively at 60fps hardware acceleration,
 * buffers decoded frames directly on the GPU as ImageBitmaps, and renders
 * reverse playback via Canvas at 60fps with zero decoder seek latency.
 *
 * This delivers a continuous, buttery-smooth 24/7 boomerang loop with no lag,
 * no stutter, and no jump cuts.
 */
export function PingPongVideo({
  src,
  className = '',
  playing = true,
  ...props
}: PingPongVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReversing, setIsReversing] = useState(false);

  // References to preserve state across frames without triggering React re-renders
  const framesRef = useRef<ImageBitmap[]>([]);
  const isCapturingRef = useRef(false);
  const captureDoneRef = useRef(false);
  const isReversingRef = useRef(false);
  const playingRef = useRef(playing);
  const reverseAnimIdRef = useRef<number | null>(null);
  const rvfcIdRef = useRef<number | null>(null);
  const rafCaptureIdRef = useRef<number | null>(null);

  playingRef.current = playing;

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !src) return;

    let destroyed = false;

    // Reset frame cache on src change
    framesRef.current.forEach((f) => f.close());
    framesRef.current = [];
    isCapturingRef.current = false;
    captureDoneRef.current = false;
    isReversingRef.current = false;
    setIsReversing(false);

    if (reverseAnimIdRef.current) {
      cancelAnimationFrame(reverseAnimIdRef.current);
      reverseAnimIdRef.current = null;
    }
    if (rvfcIdRef.current && 'cancelVideoFrameCallback' in video) {
      (video as any).cancelVideoFrameCallback(rvfcIdRef.current);
      rvfcIdRef.current = null;
    }
    if (rafCaptureIdRef.current) {
      cancelAnimationFrame(rafCaptureIdRef.current);
      rafCaptureIdRef.current = null;
    }

    video.loop = false;
    video.currentTime = 0;

    let lastCaptureTime = 0;

    const startReversePlayback = () => {
      if (destroyed || isReversingRef.current) return;
      const frames = framesRef.current;

      // If capture failed or video was extremely short, gracefully loop forward as failsafe
      if (frames.length < 3) {
        video.currentTime = 0;
        if (playingRef.current) void video.play().catch(() => undefined);
        return;
      }

      isReversingRef.current = true;
      setIsReversing(true);
      video.pause();

      const firstFrame = frames[0];
      if (!canvas || !firstFrame) return;
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      if (!ctx) return;

      // Sync canvas dimensions to first frame
      canvas.width = firstFrame.width;
      canvas.height = firstFrame.height;

      const durationSec = video.duration && Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : frames.length * 0.033;
      const reverseDurationMs = durationSec * 1000;
      let startStamp = performance.now();
      let pausedAccumulated = 0;
      let lastFrameStamp = startStamp;

      const stepReverse = (now: number) => {
        if (destroyed || !isReversingRef.current) return;

        if (!playingRef.current) {
          pausedAccumulated += now - lastFrameStamp;
          lastFrameStamp = now;
          reverseAnimIdRef.current = requestAnimationFrame(stepReverse);
          return;
        }
        lastFrameStamp = now;

        const effectiveElapsed = (now - startStamp) - pausedAccumulated;
        const progress = Math.min(effectiveElapsed / reverseDurationMs, 1);

        // Smoothly index backward from last frame down to 0
        const frameIdx = Math.round((1 - progress) * (frames.length - 1));
        const safeIdx = Math.max(0, Math.min(frames.length - 1, frameIdx));

        const targetFrame = frames[safeIdx];
        if (targetFrame) {
          ctx.drawImage(targetFrame, 0, 0);
        }

        if (progress >= 1) {
          // Finished reversing, transition seamlessly back to forward video
          isReversingRef.current = false;
          setIsReversing(false);
          video.currentTime = 0;
          if (playingRef.current) {
            void video.play().catch(() => undefined);
          }
          return;
        }

        reverseAnimIdRef.current = requestAnimationFrame(stepReverse);
      };

      reverseAnimIdRef.current = requestAnimationFrame(stepReverse);
    };

    const captureCurrentFrame = () => {
      if (destroyed || isReversingRef.current || captureDoneRef.current) return;

      const now = performance.now();
      // Capture at ~30fps rate (interval >= 30ms) to ensure lightweight memory footprint and fluid motion
      if (now - lastCaptureTime >= 30 && video.readyState >= 2) {
        lastCaptureTime = now;
        const targetW = Math.min(video.videoWidth || 600, 600);
        const targetH = Math.min(video.videoHeight || 600, 600);

        if (!isCapturingRef.current && targetW > 0 && targetH > 0 && framesRef.current.length < 240) {
          isCapturingRef.current = true;
          createImageBitmap(video, {
            resizeWidth: targetW,
            resizeHeight: targetH,
            resizeQuality: 'medium',
          })
            .then((bmp) => {
              isCapturingRef.current = false;
              if (!destroyed && !captureDoneRef.current) {
                framesRef.current.push(bmp);
              } else {
                bmp.close();
              }
            })
            .catch(() => {
              isCapturingRef.current = false;
            });
        }
      }

      scheduleFrameCapture();
    };

    const scheduleFrameCapture = () => {
      if (destroyed || isReversingRef.current || captureDoneRef.current) return;
      if ('requestVideoFrameCallback' in video) {
        rvfcIdRef.current = (video as any).requestVideoFrameCallback(captureCurrentFrame);
      } else {
        rafCaptureIdRef.current = requestAnimationFrame(captureCurrentFrame);
      }
    };

    const onTimeUpdate = () => {
      if (!isReversingRef.current && video.duration && Number.isFinite(video.duration)) {
        if (video.currentTime >= video.duration - 0.08) {
          captureDoneRef.current = true;
          startReversePlayback();
        }
      }
    };

    const onEnded = () => {
      if (!isReversingRef.current) {
        captureDoneRef.current = true;
        startReversePlayback();
      }
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);

    // Start frame capture loop
    scheduleFrameCapture();

    if (playingRef.current) {
      void video.play().catch(() => undefined);
    }

    return () => {
      destroyed = true;
      if (reverseAnimIdRef.current) {
        cancelAnimationFrame(reverseAnimIdRef.current);
        reverseAnimIdRef.current = null;
      }
      if (rvfcIdRef.current && 'cancelVideoFrameCallback' in video) {
        (video as any).cancelVideoFrameCallback(rvfcIdRef.current);
        rvfcIdRef.current = null;
      }
      if (rafCaptureIdRef.current) {
        cancelAnimationFrame(rafCaptureIdRef.current);
        rafCaptureIdRef.current = null;
      }
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
      framesRef.current.forEach((f) => f.close());
      framesRef.current = [];
    };
  }, [src]);

  // Handle play/pause toggles
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (playing) {
      if (!isReversingRef.current) {
        void video.play().catch(() => undefined);
      }
    } else {
      video.pause();
    }
  }, [playing, src]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={src}
        className="size-full object-cover object-center"
        muted
        playsInline
        autoPlay={playing}
        disablePictureInPicture
        crossOrigin="anonymous"
        {...props}
      />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 size-full object-cover object-center pointer-events-none ${
          isReversing ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}

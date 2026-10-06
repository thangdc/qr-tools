import { useCallback, useEffect, useRef, useState } from 'react';
import { scanImageData, scanImageFile } from '../utils/qrDecoder';

interface UseQRScannerOptions {
  onDecoded: (raw: string) => void;
  stopAfterDecode?: boolean;
}

const SCAN_COOLDOWN_MS = 1500;

function playScanBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
    oscillator.addEventListener('ended', () => {
      void context.close();
    }, { once: true });
  } catch {
    // Audio feedback is optional; scanning must continue if the browser blocks audio.
  }
}

export function useQRScanner({ onDecoded, stopAfterDecode = true }: UseQRScannerOptions) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef(0);
  const callbackRef = useRef(onDecoded);
  callbackRef.current = onDecoded;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    setIsCameraActive(false);
  }, []);

  const requestScan = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(requestScan);
      return;
    }

    const now = Date.now();
    if (now < cooldownUntilRef.current) {
      animationFrameRef.current = requestAnimationFrame(requestScan);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const raw = scanImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (raw) {
        cooldownUntilRef.current = Date.now() + SCAN_COOLDOWN_MS;
        playScanBeep();
        callbackRef.current(raw);

        if (stopAfterDecode) {
          stopCamera();
          return;
        }

        animationFrameRef.current = requestAnimationFrame(requestScan);
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(requestScan);
  }, [stopAfterDecode, stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    cooldownUntilRef.current = 0;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('CAMERA_UNAVAILABLE');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (error) {
      console.error(error);
      setCameraError('Không thể truy cập camera. Hãy cấp quyền camera hoặc tải ảnh lên để quét.');
      setIsCameraActive(false);
    }
  }, []);

  useEffect(() => {
    if (!isCameraActive || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().then(requestScan).catch(error => {
      console.error(error);
      setCameraError('Không thể phát camera. Hãy thử cho phép camera và bấm quét lại.');
      stopCamera();
    });
  }, [isCameraActive, requestScan, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const scanFile = useCallback(async (file: File) => {
    const raw = await scanImageFile(file);
    if (raw) {
      playScanBeep();
      callbackRef.current(raw);
    }
    return raw;
  }, []);

  return { videoRef, isCameraActive, cameraError, startCamera, stopCamera, scanFile };
}

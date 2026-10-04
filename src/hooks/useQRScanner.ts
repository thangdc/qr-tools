import { useCallback, useEffect, useRef, useState } from 'react';
import { scanImageData, scanImageFile } from '../utils/qrDecoder';

interface UseQRScannerOptions {
  onDecoded: (raw: string) => void;
  stopAfterDecode?: boolean;
}

export function useQRScanner({ onDecoded, stopAfterDecode = true }: UseQRScannerOptions) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scanBusyRef = useRef(false);
  const callbackRef = useRef(onDecoded);
  callbackRef.current = onDecoded;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    scanBusyRef.current = false;
    setIsCameraActive(false);
  }, []);

  const requestScan = useCallback(() => {
    if (scanBusyRef.current) return;
    scanBusyRef.current = true;
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      scanBusyRef.current = false;
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
        callbackRef.current(raw);
        if (stopAfterDecode) stopCamera();
        scanBusyRef.current = false;
        return;
      }
    }

    scanBusyRef.current = false;
    animationFrameRef.current = requestAnimationFrame(requestScan);
  }, [stopAfterDecode, stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
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
    if (raw) callbackRef.current(raw);
    return raw;
  }, []);

  return { videoRef, isCameraActive, cameraError, startCamera, stopCamera, scanFile };
}

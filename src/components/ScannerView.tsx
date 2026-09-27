import React, { useState, useRef, useEffect } from 'react';
import { scanImageData, parseRawQRPayload } from '../utils/qrDecoder';
import { DecodedQRData } from '../types/qr';
import {
  Camera,
  Upload,
  ArrowLeft,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface ScannerViewProps {
  onBackToGenerator: () => void;
  onLoadIntoGenerator: (data: DecodedQRData) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  onBackToGenerator,
  onLoadIntoGenerator,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<DecodedQRData | null>(null);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
        requestScan();
      }
    } catch (err: any) {
      console.error(err);
      setCameraError(
        'Could not access camera. Please allow camera permissions or upload an image file instead.'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsCameraActive(false);
  };

  const requestScan = () => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(requestScan);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decodedRaw = scanImageData(imageData);
      if (decodedRaw) {
        const parsed = parseRawQRPayload(decodedRaw);
        setScanResult(parsed);
        stopCamera();
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(requestScan);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const decodedRaw = scanImageData(imageData);
        if (decodedRaw) {
          const parsed = parseRawQRPayload(decodedRaw);
          setScanResult(parsed);
        } else {
          alert('No readable QR code found in this image. Please try a clearer picture.');
        }
      }
    };
    img.src = URL.createObjectURL(file);
  };

  const handleCopyRaw = () => {
    if (!scanResult) return;
    navigator.clipboard.writeText(scanResult.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="pb-4 border-b border-neutral-200">
        <button
          type="button"
          onClick={onBackToGenerator}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 mb-2 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Generator</span>
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            QR Scanner & Inspector
          </h1>
          <span className="text-[11px] font-mono uppercase bg-neutral-100 px-2 py-0.5 rounded text-neutral-600">
            Decoder
          </span>
        </div>
        <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
          Scan with webcam or drop an image file to inspect payload, decode credentials, and import into editor.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Scanner Control Viewport (5 cols) */}
        <div className="md:col-span-6 bg-white border border-neutral-200 rounded-lg p-5 space-y-4 shadow-xs">
          <div className="relative aspect-square max-h-[340px] bg-neutral-900 rounded-md overflow-hidden flex flex-col items-center justify-center text-white">
            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Viewfinder overlay */}
                <div className="absolute inset-8 border-2 border-white/60 rounded-lg pointer-events-none animate-pulse">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                </div>
              </>
            ) : (
              <div className="text-center p-6 space-y-3">
                <Camera className="w-10 h-10 mx-auto text-neutral-500" />
                <p className="text-xs text-neutral-400 max-w-[200px]">
                  Point your camera at any QR code or upload an image file below.
                </p>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isCameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="flex-1 h-9 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Start Camera Scan</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="flex-1 h-9 px-3 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                Stop Camera
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 h-9 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Image...</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Inspection Result Box (6 cols) */}
        <div className="md:col-span-6 bg-white border border-neutral-200 rounded-lg p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <span className="text-xs font-semibold text-neutral-800 uppercase tracking-wider">
              Decoded Inspection
            </span>
            {scanResult && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold uppercase">
                {scanResult.type} Detected
              </span>
            )}
          </div>

          {!scanResult ? (
            <div className="py-12 text-center text-neutral-400">
              <p className="text-sm font-medium text-neutral-600 mb-1">
                Waiting for scan
              </p>
              <p className="text-xs">
                Position a QR code in the camera frame or choose an image file to analyze.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="block text-xs text-neutral-400 mb-0.5">Title / Subject</span>
                <span className="text-base font-semibold text-neutral-900 block">
                  {scanResult.title}
                </span>
                <span className="text-xs text-neutral-500 font-mono block mt-0.5">
                  {scanResult.subtitle}
                </span>
              </div>

              {/* Raw Payload Block */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-neutral-600">
                    Raw Payload ({new TextEncoder().encode(scanResult.raw).length} bytes)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRaw}
                    className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy string</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded font-mono text-xs text-neutral-700 max-h-36 overflow-y-auto break-all">
                  {scanResult.raw}
                </div>
              </div>

              {/* Load Into Generator Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onLoadIntoGenerator(scanResult)}
                  className="w-full h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Load into Generator & Re-style</span>
                </button>
                <p className="mt-1.5 text-center text-[11px] text-neutral-400">
                  Pre-fills all fields so you can customize colors, logos, and frame borders.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

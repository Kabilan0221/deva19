import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Check, RefreshCw, Zap, Volume2, AlertCircle } from 'lucide-react';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  productsList?: { barcode: string; code: string; name: string }[];
}

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  productsList = [],
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let scanInterval: any = null;

    if (isOpen) {
      setCameraError(null);
      setScanning(true);

      // Attempt to access user media (back camera preferred for mobile/tablets)
      navigator.mediaDevices
        ?.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        .then((s) => {
          currentStream = s;
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }

          // Check if BarcodeDetector API is natively supported in browser
          if ('BarcodeDetector' in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
            });

            scanInterval = setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                try {
                  const barcodes = await barcodeDetector.detect(videoRef.current);
                  if (barcodes.length > 0) {
                    const rawValue = barcodes[0].rawValue;
                    if (rawValue) {
                      playBeep();
                      onScan(rawValue);
                      onClose();
                    }
                  }
                } catch (e) {
                  // Ignore detection loop frames
                }
              }
            }, 300);
          }
        })
        .catch((err) => {
          console.warn('Camera access not granted or unavailable:', err);
          setCameraError('Camera access unavailable. You can use the Quick Pick or USB laser scanner below.');
        });
    }

    return () => {
      if (scanInterval) clearInterval(scanInterval);
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Audio not supported
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm font-['Outfit',sans-serif]">
                Camera & Barcode Scanner (Quagga / Browser API)
              </h3>
              <p className="text-[10px] text-gray-400">Position the firecracker box barcode in front of the lens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Viewport / Scanner Window */}
        <div className="relative bg-black h-64 flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="text-center p-6 text-gray-400 max-w-xs">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <p className="text-xs text-gray-300 font-medium mb-3">{cameraError}</p>
              <span className="inline-block bg-white/10 px-3 py-1 rounded-full text-[10px] text-gray-300">
                Tip: USB Handheld Scanners work directly on the POS screen!
              </span>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Overlay Laser Aiming Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-32 border-2 border-red-500 rounded-2xl relative shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 animate-pulse" />
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Scanning Aim Area
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Product Simulation / Manual Entry */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Fast Sample Barcode Select</span>
            <span className="text-[10px] text-gray-500">Tap to test scan</span>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
            {productsList.slice(0, 6).map((prod) => (
              <button
                key={prod.barcode}
                type="button"
                onClick={() => {
                  playBeep();
                  onScan(prod.barcode);
                  onClose();
                }}
                className="p-2 bg-white border border-gray-200 hover:border-red-500 rounded-xl text-left transition-all hover:shadow-xs group cursor-pointer"
              >
                <div className="text-[11px] font-bold text-gray-900 truncate group-hover:text-red-600">
                  {prod.name}
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500 mt-0.5">
                  <code>{prod.barcode}</code>
                  <span className="bg-gray-100 text-gray-700 font-bold px-1.5 py-0.2 rounded text-[9px]">
                    {prod.code}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Manual Input Fallback */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Or type/paste Barcode..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCode.trim()) {
                  playBeep();
                  onScan(manualCode.trim());
                  onClose();
                }
              }}
              className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              onClick={() => {
                if (manualCode.trim()) {
                  playBeep();
                  onScan(manualCode.trim());
                  onClose();
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Scan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

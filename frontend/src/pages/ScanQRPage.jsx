import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import toast from 'react-hot-toast';
import { lookupBike, fetchBikeDetails } from '../api/bikes';
import StickyHeader from '../components/StickyHeader';
import Button from '../components/Button';

const playBeep = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
};

export default function ScanQRPage() {
  const navigate = useNavigate();

  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'upload' | 'manual'

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleCodeFound = useCallback(async (scannedText) => {
    if (!scannedText || isProcessing) return;
    setIsProcessing(true);
    playBeep();

    let code = scannedText.trim();

    try {
      if (code.includes('/panel/bikes/')) {
        const match = code.match(/\/panel\/bikes\/(\d+)/);
        if (match) {
          toast.success(`Zeskanowano link do roweru #${match[1]}`);
          stopCamera();
          navigate(`/panel/bikes/${match[1]}`);
          return;
        }
      }

      if (code.includes('/panel/orders/')) {
        const match = code.match(/\/panel\/orders\/(\d+)/);
        if (match) {
          toast.success(`Zeskanowano link do zlecenia #${match[1]}`);
          stopCamera();
          navigate(`/panel/orders/${match[1]}`);
          return;
        }
      }

      if (code.includes('code=')) {
        const match = code.match(/code=([^&]+)/);
        if (match) {
          code = decodeURIComponent(match[1]);
        }
      }

      try {
        const bike = await lookupBike(code);
        if (bike && bike.id) {
          toast.success(`Rozpoznano rower: ${bike.brand} ${bike.model || ''}`);
          stopCamera();
          navigate(`/panel/bikes/${bike.id}`);
          return;
        }
      } catch (apiErr) {
        if (code.startsWith('sheriff-')) {
          const parts = code.split('-');
          if (parts[1] && !isNaN(parts[1])) {
            try {
              const bike = await fetchBikeDetails(parts[1]);
              if (bike && bike.id) {
                toast.success(`Rozpoznano rower: ${bike.brand} ${bike.model || ''}`);
                stopCamera();
                navigate(`/panel/bikes/${bike.id}`);
                return;
              }
            } catch (e) {}
          }
        } else if (!isNaN(code)) {
          try {
            const bike = await fetchBikeDetails(code);
            if (bike && bike.id) {
              toast.success(`Rozpoznano rower: ${bike.brand} ${bike.model || ''}`);
              stopCamera();
              navigate(`/panel/bikes/${bike.id}`);
              return;
            }
          } catch (e) {}
        }
        throw apiErr;
      }
    } catch (err) {
      toast.error(`Nie znaleziono roweru dla kodu: "${code}"`);
      setTimeout(() => {
        setIsProcessing(false);
      }, 1500);
    }
  }, [isProcessing, navigate, stopCamera]);

  useEffect(() => {
    let animationFrameId = null;
    let isMounted = true;

    if (activeTab !== 'camera') {
      stopCamera();
      return;
    }

    const startCamera = async () => {
      setCameraError(null);
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Twoja przeglądarka nie obsługuje bezpośredniego dostępu do aparatu.');
        setActiveTab('manual');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          requestAnimationFrame(scanFrame);
        }
      } catch (err) {
        if (!isMounted) return;
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Dostęp do aparatu został zablokowany w uprawnieniach przeglądarki.'
            : 'Nie udało się uruchomić aparatu. Użyj opcji wgrywania zdjęcia lub wpisz kod ręcznie.'
        );
      }
    };

    const scanFrame = () => {
      if (!isMounted) return;

      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (qrCode && qrCode.data) {
            handleCodeFound(qrCode.data);
            return;
          }
        }
      }

      animationFrameId = requestAnimationFrame(scanFrame);
    };

    startCamera();

    return () => {
      isMounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      stopCamera();
    };
  }, [activeTab, facingMode, stopCamera, handleCodeFound]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

        if (qrCode && qrCode.data) {
          handleCodeFound(qrCode.data);
        } else {
          toast.error('Nie znaleziono kodu QR na wybranym zdjęciu.');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeFound(manualCode.trim());
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 pb-8 relative bg-[var(--color-paper)] min-h-full">
      <StickyHeader className="bg-[var(--color-paper)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Skaner kodów QR</h1>
            <p className="text-sm text-[var(--color-ink-3)] mt-1">
              Szybka identyfikacja rowerów i zleceń serwisowych za pomocą etykiet QR
            </p>
          </div>
        </div>
      </StickyHeader>

      <div className="max-w-2xl mx-auto">
        <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-2xl shadow-sm overflow-hidden">
          {/* Zakładki */}
          <div className="flex border-b border-gray-100 bg-gray-50/50 text-sm font-semibold text-gray-600">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer ${
                activeTab === 'camera'
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-white font-bold'
                  : 'border-transparent hover:text-gray-900'
              }`}
            >
              Aparat na żywo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer ${
                activeTab === 'upload'
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-white font-bold'
                  : 'border-transparent hover:text-gray-900'
              }`}
            >
              Wgraj zdjęcie
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer ${
                activeTab === 'manual'
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-white font-bold'
                  : 'border-transparent hover:text-gray-900'
              }`}
            >
              Wpisz kod ręcznie
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'camera' && (
              <div className="space-y-4">
                <div className="relative aspect-video max-h-[400px] w-full bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                  {cameraError ? (
                    <div className="p-8 text-center text-white space-y-3">
                      <p className="text-sm font-medium">{cameraError}</p>
                      <button
                        onClick={() => setActiveTab('manual')}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Wpisz kod ręcznie →
                      </button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        muted
                        autoPlay
                        playsInline
                      />

                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-56 h-56 relative border-2 border-white/40 rounded-2xl">
                          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[var(--color-accent)] rounded-tl-lg" />
                          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[var(--color-accent)] rounded-tr-lg" />
                          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[var(--color-accent)] rounded-bl-lg" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[var(--color-accent)] rounded-br-lg" />
                          <div className="absolute inset-x-2 h-0.5 bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent)] animate-bounce top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      {isProcessing && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-base font-semibold">
                          Wyszukiwanie roweru...
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!cameraError && (
                  <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
                    <span>Skieruj aparat na etykietę SheriffBike</span>
                    <button
                      type="button"
                      onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                      className="flex items-center gap-1 text-[var(--color-accent)] font-semibold hover:underline cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Zmień aparat
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="py-8 px-4 text-center space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-[var(--color-accent)] rounded-xl p-10 cursor-pointer transition-colors group flex flex-col items-center justify-center"
                >
                  <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-orange-50 text-gray-500 group-hover:text-[var(--color-accent)] flex items-center justify-center transition-colors mb-3">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-gray-800">Wybierz zdjęcie etykiety z kodem QR</p>
                  <p className="text-xs text-gray-400 mt-1">Obsługuje formaty PNG, JPG, JPEG, WEBP</p>
                </div>
              </div>
            )}

            {activeTab === 'manual' && (
              <form onSubmit={handleManualSubmit} className="space-y-4 py-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                    Kod identyfikacyjny roweru
                  </label>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="np. sheriff-1-9c1e2f2a... lub numer ID (np. 1)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] font-mono"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Wklej kod QR, identyfikator lub bezpośredni link do roweru/zlecenia.
                  </p>
                </div>

                <Button type="submit" disabled={isProcessing || !manualCode.trim()} className="w-full justify-center py-3">
                  {isProcessing ? 'Wyszukiwanie...' : 'Wyszukaj sprzęt →'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

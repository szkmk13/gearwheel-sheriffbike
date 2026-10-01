import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import jsQR from 'jsqr';
import toast from 'react-hot-toast';
import { lookupBike } from '../api/bikes';
import StickyHeader from '../components/StickyHeader';

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
  const [searchParams] = useSearchParams();

  const [scanAction, setScanAction] = useState(
    searchParams.get('action') === 'new_order' ? 'new_order' : 'details'
  );
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const actionParam = searchParams.get('action');
    if (actionParam === 'new_order') {
      setScanAction('new_order');
    }
  }, [searchParams]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleSuccessWithBike = useCallback((bike) => {
    toast.success(`Rozpoznano rower: ${bike.brand} ${bike.model || ''}`);
    stopCamera();

    if (scanAction === 'new_order') {
      const customerId = bike.customer?.id || (typeof bike.customer === 'number' ? bike.customer : '');
      navigate(`/panel/orders?newOrder=true&bikeId=${bike.id}${customerId ? `&customerId=${customerId}` : ''}`);
    } else {
      navigate(`/panel/bikes/${bike.id}`);
    }
  }, [scanAction, stopCamera, navigate]);

  const handleCodeFound = useCallback(async (scannedText) => {
    if (!scannedText || isProcessing) return;
    setIsProcessing(true);
    playBeep();

    let code = scannedText.trim();

    try {
      if (code.includes('/panel/bikes/')) {
        const match = code.match(/\/panel\/bikes\/(\d+)/);
        if (match) {
          const bikeId = match[1];
          if (scanAction === 'new_order') {
            try {
              const bike = await fetchBikeDetails(bikeId);
              handleSuccessWithBike(bike);
              return;
            } catch (e) {
              stopCamera();
              navigate(`/panel/orders?newOrder=true&bikeId=${bikeId}`);
              return;
            }
          } else {
            toast.success(`Zeskanowano link do roweru #${bikeId}`);
            stopCamera();
            navigate(`/panel/bikes/${bikeId}`);
            return;
          }
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
          handleSuccessWithBike(bike);
          return;
        }
      } catch (apiErr) {
        if (code.startsWith('sheriff-')) {
          const parts = code.split('-');
          if (parts[1] && !isNaN(parts[1])) {
            try {
              const bike = await fetchBikeDetails(parts[1]);
              if (bike && bike.id) {
                handleSuccessWithBike(bike);
                return;
              }
            } catch (e) {}
          }
        } else if (!isNaN(code)) {
          try {
            const bike = await fetchBikeDetails(code);
            if (bike && bike.id) {
              handleSuccessWithBike(bike);
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
  }, [isProcessing, scanAction, handleSuccessWithBike, stopCamera, navigate]);

  useEffect(() => {
    let animationFrameId = null;
    let isMounted = true;

    const startCamera = async () => {
      setCameraError(null);
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Twoja przeglądarka nie obsługuje bezpośredniego dostępu do aparatu.');
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
            ? 'Dostęp do aparatu został zablokowany w uprawnieniach przeglądarki. Zezwól na dostęp do kamery, aby skanować kody QR.'
            : 'Nie udało się uruchomić aparatu. Sprawdź uprawnienia lub czy kamera nie jest zajęta.'
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
  }, [facingMode, stopCamera, handleCodeFound]);

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

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Przełącznik akcji po odczytaniu kodu */}
        <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <span className="text-sm font-semibold text-[var(--color-ink)]">Działanie po odczytaniu kodu:</span>
            <p className="text-xs text-[var(--color-ink-3)] mt-0.5">
              {scanAction === 'new_order' ? 'Automatycznie otworzy formularz przyjęcia tego roweru na serwis' : 'Otworzy kartę ze specyfikacją techniczną roweru'}
            </p>
          </div>
          <div className="inline-flex p-1 bg-[var(--color-paper)] border border-[var(--color-line)] rounded-lg text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setScanAction('details')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                scanAction === 'details'
                  ? 'bg-white text-gray-900 shadow-xs font-bold'
                  : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Karta roweru</span>
            </button>
            <button
              type="button"
              onClick={() => setScanAction('new_order')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                scanAction === 'new_order'
                  ? 'bg-[var(--color-accent)] text-white shadow-xs font-bold'
                  : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nowe zlecenie</span>
            </button>
          </div>
        </div>

        {/* Karta aparatu */}
        <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-2xl shadow-sm overflow-hidden p-6">
          <div className="space-y-4">
            <div className="relative aspect-video max-h-[400px] w-full bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
              {cameraError ? (
                <div className="p-8 text-center text-white space-y-3">
                  <svg className="w-12 h-12 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm font-medium">{cameraError}</p>
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
        </div>
      </div>
    </div>
  );
}

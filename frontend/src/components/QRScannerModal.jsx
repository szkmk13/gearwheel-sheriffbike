import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import toast from 'react-hot-toast';
import { lookupBike } from '../api/bikes';

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
  } catch (e) {
    // ignoruj brak wsparcia audio
  }
};

export default function QRScannerModal({ 
  isOpen, 
  onClose, 
  initialAction = 'details', 
  onBikeScanned = null 
}) {
  const navigate = useNavigate();

  const [scanAction, setScanAction] = useState(initialAction); // 'details' | 'new_order'
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (tył) lub 'user' (przód)
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setScanAction(initialAction);
      setIsProcessing(false);
    }
  }, [isOpen, initialAction]);

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
    onClose();

    if (scanAction === 'new_order') {
      if (onBikeScanned) {
        onBikeScanned(bike);
      } else {
        const customerId = bike.customer?.id || (typeof bike.customer === 'number' ? bike.customer : '');
        navigate(`/panel/orders?newOrder=true&bikeId=${bike.id}${customerId ? `&customerId=${customerId}` : ''}`);
      }
    } else {
      navigate(`/panel/bikes/${bike.id}`);
    }
  }, [scanAction, onBikeScanned, stopCamera, onClose, navigate]);

  const handleCodeFound = useCallback(async (scannedText) => {
    if (!scannedText || isProcessing) return;
    setIsProcessing(true);
    playBeep();

    let code = scannedText.trim();

    try {
      // 1. Sprawdź czy to bezpośredni link do roweru w aplikacji
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
              onClose();
              navigate(`/panel/orders?newOrder=true&bikeId=${bikeId}`);
              return;
            }
          } else {
            toast.success(`Zeskanowano link do roweru #${bikeId}`);
            stopCamera();
            onClose();
            navigate(`/panel/bikes/${bikeId}`);
            return;
          }
        }
      }

      // 2. Sprawdź czy to link do zlecenia
      if (code.includes('/panel/orders/')) {
        const match = code.match(/\/panel\/orders\/(\d+)/);
        if (match) {
          toast.success(`Zeskanowano link do zlecenia #${match[1]}`);
          stopCamera();
          onClose();
          navigate(`/panel/orders/${match[1]}`);
          return;
        }
      }

      // 3. Wyciągnij parametr code z URL (jeśli podano pełny adres)
      if (code.includes('code=')) {
        const match = code.match(/code=([^&]+)/);
        if (match) {
          code = decodeURIComponent(match[1]);
        }
      }

      // 4. Spróbuj wyszukać przez API lookup (sheriff-code)
      try {
        const bike = await lookupBike(code);
        if (bike && bike.id) {
          handleSuccessWithBike(bike);
          return;
        }
      } catch (apiErr) {
        // Fallback: jeśli kod to np. sheriff-<id>-<uuid>, spróbuj po samym ID
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
          // Jeśli podano sam numer ID
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
      // Krótkie opóźnienie przed ponownym skanowaniem
      setTimeout(() => {
        setIsProcessing(false);
      }, 1500);
    }
  }, [isProcessing, scanAction, handleSuccessWithBike, stopCamera, onClose, navigate]);

  // Uruchomienie strumienia z kamery
  useEffect(() => {
    let animationFrameId = null;
    let isMounted = true;

    if (!isOpen) {
      stopCamera();
      return;
    }

    const startCamera = async () => {
      setCameraError(null);
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
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
            ? 'Dostęp do aparatu został zablokowany w ustawieniach przeglądarki. Zezwól na dostęp do kamery, aby skanować kody QR.'
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
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      stopCamera();
    };
  }, [isOpen, facingMode, stopCamera, handleCodeFound]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Tło przyciemniające */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity" 
        onClick={() => {
          stopCamera();
          onClose();
        }}
      />

      {/* Kontener okna skanera */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Nagłówek */}
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Skaner SheriffBike QR</h2>
              <p className="text-xs text-gray-500">
                {scanAction === 'new_order' ? 'Zeskanuj rower, by natychmiast utworzyć zlecenie' : 'Skieruj aparat na etykietę roweru'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition-colors cursor-pointer"
            aria-label="Zamknij skaner"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Przełącznik akcji po zeskanowaniu */}
        <div className="px-4 sm:px-5 py-2.5 bg-gray-100/70 border-b border-gray-200/70 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-600 shrink-0">Cel skanowania:</span>
          <div className="inline-flex p-0.5 bg-gray-200/80 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setScanAction('details')}
              className={`px-2.5 sm:px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                scanAction === 'details'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
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
              className={`px-2.5 sm:px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                scanAction === 'new_order'
                  ? 'bg-[var(--color-accent)] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nowe zlecenie</span>
            </button>
          </div>
        </div>

        {/* Widok aparatu na żywo */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="relative aspect-square max-h-[340px] w-full bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center text-white space-y-3">
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

                {/* Celownik wizjera QR */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 relative border-2 border-white/40 rounded-2xl">
                    {/* 4 narożniki akcentujące */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[var(--color-accent)] rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[var(--color-accent)] rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[var(--color-accent)] rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[var(--color-accent)] rounded-br-lg" />

                    {/* Animowany promień lasera */}
                    <div className="absolute inset-x-2 h-0.5 bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent)] animate-bounce top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {isProcessing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-sm font-semibold">
                    Rozpoznawanie kodu...
                  </div>
                )}
              </>
            )}
          </div>

          {/* Opcje kamery (np. zmiana aparat przód/tył) */}
          {!cameraError && (
            <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
              <span>Trzymaj kod QR wewnątrz zaznaczonego obszaru</span>
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

        {/* Stopka z informacją */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
              navigate(`/panel/scan?action=${scanAction}`);
            }}
            className="text-[var(--color-accent)] hover:underline font-medium cursor-pointer"
          >
            Otwórz na pełnym ekranie ↗
          </button>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
}

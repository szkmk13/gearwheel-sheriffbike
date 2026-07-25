import React from 'react';
import jsQR from 'jsqr';

function QrScanner({ onDecode, onError }) {
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(document.createElement('canvas'));
  const frameRef = React.useRef(null);
  const streamRef = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      if (result && result.data) {
        onDecode(result.data);
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        frameRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {
        onError('Brak dostępu do kamery.');
      });

    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      style={{ width: '100%', maxWidth: 360, borderRadius: 8, background: '#000' }}
    />
  );
}

export default QrScanner;

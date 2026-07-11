import { useEffect, useRef, useState } from "react";

export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function snap() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);
    setPreview(canvas.toDataURL("image/jpeg", 0.85));
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function retake() {
    setPreview(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Erro ao reabrir câmera."));
  }

  if (error) {
    return (
      <div className="ponto-camera">
        <p className="ponto-error">{error}</p>
        <button type="button" className="button secondary" onClick={onCancel}>Voltar</button>
      </div>
    );
  }

  return (
    <div className="ponto-camera">
      {!preview ? (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="ponto-camera-video" />
          <div className="ponto-camera-actions">
            <button type="button" className="button ghost" onClick={onCancel}>Cancelar</button>
            <button type="button" className="button primary ponto-btn-large" onClick={snap}>Capturar foto do rosto</button>
          </div>
        </>
      ) : (
        <>
          <img src={preview} alt="Foto do rosto" className="ponto-camera-preview" />
          <div className="ponto-camera-actions">
            <button type="button" className="button secondary" onClick={retake}>Refazer</button>
            <button type="button" className="button primary ponto-btn-large" onClick={() => onCapture(preview)}>Confirmar</button>
          </div>
        </>
      )}
    </div>
  );
}

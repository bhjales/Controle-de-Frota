import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Check, AlertTriangle, RefreshCw, X, Image as ImageIcon } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Data: string) => void;
  title: string;
}

// Preset nice odometer / dashboard images as beautiful mock options for simulator
const MOCK_PRESET_IMAGES = [
  {
    name: 'Hodômetro Prata (45.2k km)',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%231e293b" /><circle cx="200" cy="150" r="100" fill="none" stroke="%2338bdf8" stroke-width="8" stroke-dasharray="300 100" /><path d="M 200 150 L 140 100" stroke="%23ef4444" stroke-width="6" stroke-linecap="round" /><circle cx="200" cy="150" r="12" fill="%23f8fafc" /><rect x="150" y="200" width="100" height="30" rx="4" fill="%230f172a" stroke="%23334155" stroke-width="2" /><text x="200" y="221" font-family="monospace" font-size="16" fill="%2322c55e" font-weight="bold" text-anchor="middle">045230 km</text><text x="200" y="110" font-family="sans-serif" font-size="12" fill="%2394a3b8" text-anchor="middle">HODÔMETRO</text><text x="200" y="270" font-family="sans-serif" font-size="10" fill="%2364748b" text-anchor="middle">FROTA CONTROL</text></svg>'
  },
  {
    name: 'Retorno Seguro (45.4k km)',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%230f172a" /><circle cx="200" cy="150" r="90" fill="none" stroke="%2322c55e" stroke-width="6" /><path d="M 120 150 a 80 80 0 0 1 160 0" fill="none" stroke="%23e2e8f0" stroke-width="3" stroke-dasharray="10 5" /><text x="200" y="145" font-family="sans-serif" font-size="14" fill="%23e2e8f0" text-anchor="middle" font-weight="600">CHECKOUT OK</text><rect x="130" y="170" width="140" height="40" rx="6" fill="%231e293b" /><text x="200" y="195" font-family="monospace" font-size="18" fill="%2338bdf8" font-weight="bold" text-anchor="middle">045410 km</text><path d="M 160 240 L 240 240" stroke="%2322c55e" stroke-width="4" stroke-linecap="round" /><circle cx="200" cy="80" r="10" fill="%2322c55e" /><text x="200" y="265" font-family="sans-serif" font-size="10" fill="%2364748b" text-anchor="middle">Tanque Abastecido</text></svg>'
  },
  {
    name: 'Painel Geral Neutro',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%2318181b" /><text x="200" y="140" font-family="sans-serif" font-size="16" fill="%23a1a1aa" text-anchor="middle" font-weight="bold">PAINEL DO VEÍCULO</text><rect x="120" y="170" width="160" height="36" rx="4" fill="%2327272a" stroke="%233f3f46" stroke-width="1" /><text x="200" y="193" font-family="monospace" font-size="15" fill="%23e4e4e7" text-anchor="middle">KM: REGISTRADO</text><text x="200" y="250" font-family="sans-serif" font-size="10" fill="%2352525b" text-anchor="middle">FOTO DE COMPROVAÇÃO DE VIAGEM</text></svg>'
  }
];

export function CameraModal({ isOpen, onClose, onCapture, title }: CameraModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'preset'>('preset');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    // Default to preset first because inside iframes real cameras can be locked or blocked,
    // which prevents the user from being stuck!
    setActiveTab('preset');
    setCapturedImage(null);
    setCameraError(null);
  }, [isOpen]);

  // Clean stream on close/unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    try {
      const constraints = {
        video: { facingMode: 'environment', width: 640, height: 480 }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Erro ao acessar câmera: ', err);
      setCameraError(
        'Não foi possível acessar a câmera do dispositivo. Verifique as permissões do navegador ou utilize as abas "Simulador" ou "Upload de Arquivos".'
      );
    }
  };

  useEffect(() => {
    if (activeTab === 'camera' && isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [activeTab]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add datetime watermark for auditing/purity!
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(10, canvas.height - 40, canvas.width - 20, 30);
        ctx.fillStyle = '#22c55e';
        ctx.font = '14px monospace';
        ctx.fillText(`AUDIT: ${new Date().toLocaleString('pt-BR')}`, 20, canvas.height - 20);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmSelection = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div id="camera_modal_overlay" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div id="camera_modal_content" className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <h3 className="font-semibold text-lg text-slate-100 flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-500" />
            {title}
          </h3>
          <button 
            id="close_camera_modal_btn"
            onClick={() => {
              stopCamera();
              onClose();
            }} 
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 p-2 bg-slate-950/20 gap-2">
          <button
            id="preset_tab_btn"
            onClick={() => setActiveTab('preset')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'preset'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Simulador
          </button>
          
          <button
            id="camera_tab_btn"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'camera'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
            }`}
          >
            <Camera className="w-4 h-4" />
            Câmera Real
          </button>

          <button
            id="upload_tab_btn"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Foto
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[300px]">
          {/* TAB 1: PRESETS */}
          {activeTab === 'preset' && (
            <div className="w-full flex flex-col gap-4">
              <span className="text-xs text-slate-400 text-center block max-w-sm mx-auto mb-2">
                Ideal para testar o fluxo de check-in / check-out sem precisar de uma câmera real no seu ambiente. Selecione um comprovante fictício abaixo:
              </span>
              <div className="grid grid-cols-1 gap-3 max-h-[220px] overflow-y-auto pr-1">
                {MOCK_PRESET_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCapturedImage(preset.url)}
                    className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                      capturedImage === preset.url
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1 rounded bg-slate-800">
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                      </div>
                      <span className="text-sm font-medium">{preset.name}</span>
                    </div>
                    {capturedImage === preset.url && (
                      <Check className="w-5 h-5 text-emerald-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CAMERA */}
          {activeTab === 'camera' && (
            <div className="w-full flex flex-col items-center gap-4">
              {cameraError ? (
                <div className="bg-red-950/40 border border-red-900/40 rounded-xl p-4 text-center max-w-sm">
                  <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2 animate-bounce" />
                  <p className="text-sm text-red-300 font-medium mb-1">Câmera Indisponível</p>
                  <p className="text-xs text-slate-400">{cameraError}</p>
                </div>
              ) : capturedImage ? (
                <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 max-w-xs mx-auto animate-fade-in shadow-lg">
                  <img src={capturedImage} alt="Foto obtida" className="w-full h-auto object-cover" />
                  <button
                    id="retry_camera_btn"
                    onClick={startCamera}
                    className="absolute bottom-2 right-2 bg-slate-900/95 hover:bg-slate-850 text-emerald-400 p-2 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md border border-slate-755"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Tentar Novamente
                  </button>
                </div>
              ) : (
                <div className="relative bg-black rounded-xl overflow-hidden border border-slate-800 w-full max-w-sm aspect-video flex items-center justify-center">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  ></video>
                  <div className="absolute inset-0 border border-slate-400/20 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-24 border border-dashed border-emerald-500/40 rounded-lg flex items-center justify-center">
                      <span className="text-[10px] text-emerald-400 bg-slate-900/80 px-2 py-0.5 rounded font-mono">FOTO DO PAINEL</span>
                    </div>
                  </div>
                  <button
                    id="capture_trigger_btn"
                    onClick={capturePhoto}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold p-3 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {/* TAB 3: FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="w-full flex flex-col items-center justify-center gap-4">
              {capturedImage ? (
                <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 max-w-xs mx-auto shadow-lg">
                  <img src={capturedImage} alt="Preview do arquivo" className="w-full h-auto object-cover max-h-[220px]" />
                  <button
                    id="clear_upload_btn"
                    onClick={() => setCapturedImage(null)}
                    className="absolute bottom-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg text-xs font-semibold shadow-md"
                  >
                    Limpar Imagem
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full max-w-sm aspect-video border-2 border-dashed border-slate-800 hover:border-slate-750 bg-slate-950/20 rounded-xl cursor-pointer transition-all hover:bg-slate-950/40 group p-4 text-center">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 text-slate-500 group-hover:text-emerald-400 transition-colors mb-3" />
                    <p className="mb-2 text-sm text-slate-300 font-semibold">Clique para fazer upload</p>
                    <p className="text-xs text-slate-400">PNG, JPG ou JPEG (Máx. 5MB)</p>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>
              )}
            </div>
          )}

          {/* Render Selection Preview box if some image is active */}
          {capturedImage && (
            <div className="mt-4 p-3 bg-slate-950/30 border border-slate-850 rounded-xl w-full flex items-center justify-between gap-3 animate-fade-in-up">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-10 h-10 rounded border border-emerald-500/20 shrink-0 bg-slate-900 overflow-hidden">
                  <img src={capturedImage} alt="Tiny thumb" className="w-full h-full object-cover" />
                </div>
                <div className="text-left overflow-hidden">
                  <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    FOTO SELECIONADA
                  </span>
                  <p className="text-[10px] text-slate-400 truncate font-mono">
                    {capturedImage.substring(0, 30)}...
                  </p>
                </div>
              </div>
              <button
                id="confirm_capture_btn"
                onClick={confirmSelection}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs tracking-tight shadow-md shrink-0 active:scale-95 transition-all"
              >
                Confirmar Comprovante
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { Image as ImageIcon, Loader2, Trash2, Upload, Video, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cropImageToSquare,
  getCustomCover,
  removeCustomCover,
  saveCustomCover,
  type CustomCoverData,
} from '@/lib/customCovers';
import { PingPongVideo } from '@/components/music/PingPongVideo';

interface CustomCoverModalProps {
  videoId: string;
  trackTitle: string;
  artistName: string;
  defaultArtworkUrl?: string | null;
  onClose: () => void;
  onCoverChange?: (cover: CustomCoverData | null) => void;
}

export function CustomCoverModal({
  videoId,
  trackTitle,
  artistName,
  defaultArtworkUrl,
  onClose,
  onCoverChange,
}: CustomCoverModalProps) {
  const [existingCover, setExistingCover] = useState<CustomCoverData | null>(() => getCustomCover(videoId));
  const [previewData, setPreviewData] = useState<{
    type: 'image' | 'video';
    url: string;
    name: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const processFile = useCallback(async (file: File) => {
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      if (file.type.startsWith('image/')) {
        // Automatically crop to 1:1 square aspect ratio without stretching
        const croppedSquareDataUrl = await cropImageToSquare(file, 1600);
        setPreviewData({
          type: 'image',
          url: croppedSquareDataUrl,
          name: file.name,
        });
      } else if (file.type.startsWith('video/')) {
        // Video file: create data URL / blob URL
        const videoUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Failed to read video file'));
          reader.readAsDataURL(file);
        });
        setPreviewData({
          type: 'video',
          url: videoUrl,
          name: file.name,
        });
      } else {
        setErrorMsg('Please select a valid image (JPG, PNG, WEBP) or video (MP4, WEBM).');
      }
    } catch (err) {
      console.error('Error processing cover file:', err);
      setErrorMsg('Failed to process file. Please try another image or video.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void processFile(file);
    },
    [processFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const handleApply = () => {
    if (!previewData) return;
    const newCover: CustomCoverData = {
      type: previewData.type,
      url: previewData.url,
      name: previewData.name,
      timestamp: Date.now(),
    };
    saveCustomCover(videoId, newCover);
    setExistingCover(newCover);
    onCoverChange?.(newCover);
    onClose();
  };

  const handleRemove = () => {
    removeCustomCover(videoId);
    setExistingCover(null);
    setPreviewData(null);
    onCoverChange?.(null);
    onClose();
  };

  const activeDisplayUrl = previewData?.url ?? existingCover?.url ?? defaultArtworkUrl;
  const isVideo = previewData?.type === 'video' || (!previewData && existingCover?.type === 'video');

  return (
    <div
      className="fixed inset-0 z-[calc(var(--z-contextual-menus)+30)] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-enter pointer-events-auto select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-cover-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-[14px] bg-neutral-950/95 border border-white/20 p-6 md:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.2)] ring-1 ring-white/10 text-white flex flex-col gap-5 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-[8px] bg-white/10 border border-white/15 text-white">
              <ImageIcon size={20} />
            </div>
            <div>
              <h2 id="custom-cover-title" className="text-lg md:text-xl font-bold tracking-tight text-white">
                Add Custom Album Cover
              </h2>
              <p className="text-xs md:text-sm text-white/60 truncate max-w-[280px] sm:max-w-[360px]">
                {trackTitle} · {artistName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-white/70 hover:text-white hover:bg-white/15 transition active:scale-95"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Informational Subtitle */}
        <p className="text-xs text-white/65 leading-relaxed">
          Upload an image or animated video. Images are <span className="text-white font-medium">automatically 1:1 center-cropped</span> without stretching.
        </p>

        {/* Drag and Drop Zone & 1:1 Preview Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group cursor-pointer rounded-[10px] border-2 border-dashed transition-all duration-300 p-4 flex flex-col items-center justify-center gap-4 ${
            isDragging
              ? 'border-white bg-white/15 ring-2 ring-white/40 scale-[1.01]'
              : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* 1:1 Square Container (Guaranteed 1:1 Aspect Ratio with standard artwork radius) */}
          <div className="relative aspect-square w-48 sm:w-56 rounded-[10px] overflow-hidden bg-black/60 ring-1 ring-white/20 shadow-2xl flex items-center justify-center">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center gap-2.5 p-4 text-center">
                <Loader2 size={32} className="animate-spin text-white" />
                <span className="text-xs font-medium text-white/80">Cropping to 1:1 Square...</span>
              </div>
            ) : activeDisplayUrl ? (
              <>
                {isVideo ? (
                  <PingPongVideo
                    src={activeDisplayUrl}
                    className="size-full object-cover object-center rounded-[inherit]"
                  />
                ) : (
                  <img
                    src={activeDisplayUrl}
                    alt="Cover preview"
                    className="size-full object-cover object-center rounded-[inherit]"
                  />
                )}
                {/* 1:1 Square Auto-Cropped Badge */}
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[10px] font-semibold tracking-wider text-white uppercase shadow-md flex items-center gap-1">
                  {isVideo ? <Video size={10} /> : <ImageIcon size={10} />}
                  <span>{previewData ? '1:1 Cropped' : existingCover ? 'Custom Cover' : 'Default'}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-4 text-center text-white/50">
                <Upload size={32} />
                <span className="text-xs">No artwork</span>
              </div>
            )}
          </div>

          {/* Prompt text */}
          <div className="text-center">
            <p className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
              {isDragging ? 'Drop file to upload' : 'Click to browse or drag & drop'}
            </p>
            <p className="text-[11px] text-white/50 mt-0.5">Supports JPG, PNG, WEBP, MP4, WebM</p>
          </div>
        </div>

        {/* Error message if any */}
        {errorMsg && (
          <div className="rounded-[8px] bg-red-500/15 border border-red-500/30 px-3.5 py-2 text-xs text-red-200">
            {errorMsg}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {existingCover ? (
            <button
              onClick={handleRemove}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] bg-white/10 hover:bg-red-500/20 hover:text-red-300 text-white/80 border border-white/15 text-xs font-semibold transition active:scale-95"
              title="Remove custom cover and restore default artwork"
            >
              <Trash2 size={15} />
              <span>Restore Default</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-[8px] text-white/70 hover:text-white hover:bg-white/10 text-xs font-semibold transition active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!previewData || isProcessing}
              className={`px-5 py-2 rounded-[8px] text-xs font-bold transition active:scale-95 shadow-lg ${
                previewData && !isProcessing
                  ? 'bg-white text-black hover:bg-white/90 shadow-white/20'
                  : 'bg-white/20 text-white/40 cursor-not-allowed'
              }`}
            >
              Apply Cover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

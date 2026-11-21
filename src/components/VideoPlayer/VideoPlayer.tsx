import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';

interface VideoPlayerProps {
  thumbnailUrl: string;
  videoUrl: string;
  title: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  initialProgress?: number;
}

function getEmbedUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();

  // YouTube match
  const ytMatch = cleanUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  }

  // Vimeo match
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  }

  // Google Drive match
  const gDriveMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://drive.google.com/file/d/${gDriveMatch[1]}/preview`;
  }

  return null;
}

const VideoPlayer = ({ 
  thumbnailUrl, 
  videoUrl, 
  title, 
  onProgress, 
  onComplete,
  initialProgress = 0 
}: VideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(initialProgress);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const embedUrl = useMemo(() => getEmbedUrl(videoUrl), [videoUrl]);
  const hasValidVideo = Boolean(videoUrl && videoUrl.trim());

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
      onProgress?.(currentProgress);

      if (currentProgress >= 95 || (videoRef.current.ended && currentProgress > 90)) {
        onComplete?.();
      }
    }
  };

  const handleThumbnailClick = () => {
    setVideoError(false);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (videoRef.current && initialProgress > 0) {
      videoRef.current.currentTime = (initialProgress / 100) * videoRef.current.duration;
    }
  }, [initialProgress]);

  // Reset states when videoUrl changes
  useEffect(() => {
    setVideoError(false);
    setIsPlaying(false);
  }, [videoUrl]);

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-black/90">
      {!isPlaying ? (
        <div 
          className="relative cursor-pointer group aspect-video flex items-center justify-center bg-gray-900"
          onClick={handleThumbnailClick}
        >
          <Image
            src={thumbnailUrl || "/images/blog/blog-details-01.jpg"}
            alt={title}
            width={800}
            height={500}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center transform transition-transform group-hover:scale-110 shadow-lg">
              <svg 
                className="w-8 h-8 text-white ml-1" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </div>
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200">
              <div 
                className="h-full bg-blue-600 transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      ) : embedUrl ? (
        <div className="aspect-video relative w-full">
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : !hasValidVideo || videoError ? (
        <div className="aspect-video relative w-full flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
          <div className="w-12 h-12 mb-3 rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-semibold text-lg">Preview Video Not Available</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm">
            {videoError
              ? "Unable to load the video from the provided link."
              : "No introduction video has been uploaded for this course yet."}
          </p>
          <button
            onClick={() => setIsPlaying(false)}
            className="mt-4 px-4 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors text-gray-300"
          >
            Back to Thumbnail
          </button>
        </div>
      ) : (
        <div className="aspect-video relative">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full"
            controls
            autoPlay
            onError={() => setVideoError(true)}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => onComplete?.()}
          />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200">
            <div 
              className="h-full bg-blue-600 transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;

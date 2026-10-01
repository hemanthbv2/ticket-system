"use client";

import { useState, useRef, useCallback } from "react";
import { CameraIcon, UploadIcon, XIcon, ImageIcon } from "lucide-react";

interface ImageUploaderProps {
  onFilesSelected: (files: { url: string; name: string; mime: string; size: number }[]) => void;
  existingFiles?: { url: string; name: string; mime: string; size: number }[];
}

export default function ImageUploader({ onFilesSelected, existingFiles = [] }: ImageUploaderProps) {
  const [files, setFiles] = useState<{ url: string; name: string; mime: string; size: number; preview?: string }[]>(
    existingFiles.map((f) => ({ ...f, preview: f.url }))
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File): Promise<File> => {
    // Dynamic import for client-side only
    const { default: imageCompression } = await import("browser-image-compression");
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      return new File([compressed], file.name, { type: compressed.type });
    } catch {
      return file;
    }
  };

  const uploadFiles = async (selectedFiles: FileList | File[]) => {
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      const filesToUpload = Array.from(selectedFiles);

      // Validate
      for (const f of filesToUpload) {
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "application/pdf"];
        if (!allowedTypes.includes(f.type)) {
          setError(`Invalid file type: ${f.type}`);
          setUploading(false);
          return;
        }
        if (f.size > 10 * 1024 * 1024) {
          setError(`File too large: ${f.name}`);
          setUploading(false);
          return;
        }
      }

      // Compress images
      const compressed = await Promise.all(filesToUpload.map(compressImage));

      for (const f of compressed) {
        formData.append("files", f);
      }

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      const newFiles = data.files.map((f: any) => ({
        ...f,
        preview: f.mime.startsWith("image/") ? f.url : undefined,
      }));

      const allFiles = [...files, ...newFiles];
      setFiles(allFiles);
      onFilesSelected(allFiles.map(({ preview, ...rest }) => rest));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFilesSelected(updated.map(({ preview, ...rest }) => rest));
  };

  // Handle paste (Ctrl+V)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter((item) => item.type.startsWith("image/"));
      if (imageItems.length > 0) {
        e.preventDefault();
        const pastedFiles = imageItems
          .map((item) => item.getAsFile())
          .filter((f): f is File => f !== null);
        if (pastedFiles.length > 0) {
          uploadFiles(pastedFiles);
        }
      }
    },
    [files]
  );

  return (
    <div className="space-y-3" onPaste={handlePaste} tabIndex={0}>
      {/* Upload buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Take Photo (mobile camera) */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="btn-secondary flex items-center gap-2 text-sm"
          disabled={uploading}
        >
          <CameraIcon className="w-4 h-4 text-cyan-400" />
          <span>Take Photo</span>
        </button>

        {/* Upload file */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-secondary flex items-center gap-2 text-sm"
          disabled={uploading}
        >
          <UploadIcon className="w-4 h-4 text-indigo-400" />
          <span>Upload</span>
        </button>

        {/* Paste hint */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 px-2">
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] border border-slate-700">Ctrl+V</kbd>
          <span>to paste screenshot</span>
        </div>
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />

      {/* Upload progress */}
      {uploading && (
        <div className="flex items-center gap-3 p-3 glass-card rounded-xl">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-300">Uploading & compressing...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="relative group aspect-square rounded-xl overflow-hidden border border-white/10 bg-slate-800"
            >
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-500">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-[10px] truncate max-w-full px-1">{file.name}</span>
                </div>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
              >
                <XIcon className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone (when no files) */}
      {files.length === 0 && !uploading && (
        <div
          className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <CameraIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            Take a photo, upload images, or paste a screenshot
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Supports: JPG, PNG, GIF, WebP, PDF · Max 10 MB each
          </p>
        </div>
      )}
    </div>
  );
}

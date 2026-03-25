/**
 * SmartStartPM - Image Upload Component
 * Reusable component for uploading images with drag & drop support
 */

"use client";

import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  X,
  Eye,
} from "lucide-react";
import { showSimpleError, showSimpleSuccess } from "@/lib/toast-notifications";
import { useLocalization } from "@/hooks/use-localization";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

interface ImageUploadProps {
  onImagesUploaded: (images: UploadedImage[]) => void;
  onImagesRemoved?: (images: UploadedImage[]) => void;
  existingImages?: UploadedImage[];
  maxFiles?: number;
  folder?: string;
  quality?: string;
  maxWidth?: number;
  maxHeight?: number;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  label?: string;
}

export function ImageUpload({
  onImagesUploaded,
  onImagesRemoved,
  existingImages = [],
  maxFiles = 10,
  folder = "SmartStartPM/properties",
  quality = "auto",
  maxWidth,
  maxHeight,
  disabled = false,
  className = "",
  compact = false,
  label,
}: ImageUploadProps) {
  const { t } = useLocalization();
  const [images, setImages] = useState<UploadedImage[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || disabled) return;

      const fileArray = Array.from(files);
      const remainingSlots = maxFiles - images.length;

      if (fileArray.length > remainingSlots) {
        showSimpleError("Upload Limit", `You can only upload ${remainingSlots} more image(s)`);
        return;
      }

      // Validate files
      const validFiles = fileArray.filter((file) => {
        if (!file.type.startsWith("image/")) {
          showSimpleError("Invalid File", `${file.name} is not an image file`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          showSimpleError("File Too Large", `${file.name} is too large (max 10MB)`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      setUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        validFiles.forEach((file) => formData.append("files", file));
        formData.append("folder", folder);
        formData.append("quality", quality);
        if (maxWidth) formData.append("maxWidth", maxWidth.toString());
        if (maxHeight) formData.append("maxHeight", maxHeight.toString());

        const response = await fetch("/api/upload/images", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Upload failed");
        }

        const newImages = result.images as UploadedImage[];
        const updatedImages = [...images, ...newImages];

        setImages(updatedImages);
        onImagesUploaded(newImages);

        showSimpleSuccess("Upload Complete", `Successfully uploaded ${newImages.length} image(s)`);
      } catch (error) {
        console.error("Upload error:", error);
        showSimpleError("Upload Failed", error instanceof Error ? error.message : "Upload failed");
      } finally {
        setUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [
      images,
      maxFiles,
      folder,
      quality,
      maxWidth,
      maxHeight,
      disabled,
      onImagesUploaded,
    ]
  );

  const removeImage = useCallback(
    (index: number) => {
      const newImages = images.filter((_, i) => i !== index);
      const removedImage = images[index];

      setImages(newImages);
      if (onImagesRemoved) {
        onImagesRemoved([removedImage]);
      }
    },
    [images, onImagesRemoved]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      handleFiles(files);
    },
    [handleFiles, disabled]
  );

  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Upload Area */}
      <div className="relative">
        <div
          className={cn(
            "rounded-xl border-2 border-dashed text-center transition-colors duration-200",
            compact ? "p-4" : "p-7 sm:p-8",
            disabled
              ? "cursor-not-allowed border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]"
              : dragActive
                ? "cursor-pointer border-slate-500 bg-slate-100/70 dark:border-white/40 dark:bg-white/[0.06]"
                : "cursor-pointer border-slate-200/90 bg-white hover:border-slate-400 hover:bg-slate-50/80 dark:border-white/12 dark:bg-transparent dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          {uploading ? (
            <div className={compact ? "space-y-2" : "space-y-4"}>
              <div className="relative">
                <div
                  className={cn(
                    "mx-auto flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10",
                    compact ? "h-10 w-10" : "h-16 w-16"
                  )}
                >
                  <Loader2
                    className={cn(
                      "animate-spin text-slate-600 dark:text-gray-300",
                      compact ? "h-5 w-5" : "h-8 w-8"
                    )}
                  />
                </div>
              </div>
              <div className={compact ? "space-y-1" : "space-y-2"}>
                <p
                  className={cn(
                    "font-semibold text-black dark:text-white",
                    compact ? "text-sm" : "text-lg"
                  )}
                >
                  {t("common.upload.uploading")}
                </p>
                {!compact && (
                  <p className="text-sm text-black/65 dark:text-gray-400">
                    {t("common.upload.uploadingDescription")}
                  </p>
                )}
              </div>
              <div className="w-full max-w-sm mx-auto">
                <Progress value={uploadProgress} className="h-2" />
                <p className="mt-1 text-xs text-black/55 dark:text-gray-500">
                  {t("common.upload.progress", {
                    values: { progress: uploadProgress },
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div className={compact ? "space-y-2" : "space-y-4"}>
              <div className="relative">
                <div
                  className={cn(
                    "mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200/90 dark:from-white/10 dark:to-white/5",
                    compact ? "h-10 w-10" : "h-16 w-16"
                  )}
                >
                  <Upload
                    className={cn(
                      "text-slate-700 dark:text-gray-200",
                      compact ? "h-5 w-5" : "h-8 w-8"
                    )}
                  />
                </div>
                {dragActive && (
                  <div
                    className={cn(
                      "absolute inset-0 mx-auto animate-ping rounded-full bg-slate-300/60 opacity-60 dark:bg-white/20",
                      compact ? "h-10 w-10" : "h-16 w-16"
                    )}
                  />
                )}
              </div>
              <div className={compact ? "space-y-1" : "space-y-2"}>
                <p
                  className={cn(
                    "font-semibold text-black dark:text-white",
                    compact ? "text-sm" : "text-lg"
                  )}
                >
                  {disabled
                    ? t("common.upload.titleDisabled")
                    : dragActive
                    ? t("common.upload.titleDragActive")
                    : label || t("common.upload.title")}
                </p>
                {!compact && (
                  <p className="text-sm text-black/65 dark:text-gray-400">
                    {disabled
                      ? t("common.upload.descriptionDisabled")
                      : t("common.upload.description")}
                  </p>
                )}
              </div>
              <div
                className={cn(
                  "flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-black/55 dark:text-gray-500",
                  compact && "gap-x-3"
                )}
              >
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  {t("common.upload.formats")}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  {t("common.upload.maxSize")}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  {t("common.upload.uploaded", {
                    values: { current: images.length, max: maxFiles },
                  })}
                </span>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="outline"
                  size={compact ? "sm" : "default"}
                  className="border-slate-200 bg-white text-black hover:border-slate-300 hover:bg-slate-50 dark:border-white/15 dark:bg-white/[0.04] dark:text-gray-100 dark:hover:border-white/25 dark:hover:bg-white/10"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  {t("common.upload.chooseFiles")}
                </Button>
              )}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center text-sm font-semibold text-black dark:text-white">
              <ImageIcon className="mr-2 h-4 w-4 text-slate-600 dark:text-gray-400" />
              {t("common.upload.uploadedImages", {
                values: { count: images.length },
              })}
            </h4>
            {!disabled && images.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setImages([])}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <X className="h-3 w-3 mr-1" />
                {t("common.upload.clearAll")}
              </Button>
            )}
          </div>

          <div
            className={`grid ${
              compact
                ? "gap-1.5 grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
                : "gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            }`}
          >
            {images.map((image, index) => (
              <div key={image.publicId || index} className="relative group">
                <div
                  className={cn(
                    "relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200/90 bg-slate-50 transition-colors hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20",
                    compact ? "h-20" : "h-32"
                  )}
                >
                  <img
                    src={image.url}
                    alt={`Upload ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />

                  {/* Success indicator */}
                  <div className={`absolute ${compact ? "top-1 left-1" : "top-2 left-2"}`}>
                    <div
                      className={`bg-green-500 rounded-full flex items-center justify-center shadow-lg ${
                        compact ? "w-4 h-4" : "w-6 h-6"
                      }`}
                    >
                      <CheckCircle className={compact ? "h-3 w-3 text-white" : "h-4 w-4 text-white"} />
                    </div>
                  </div>

                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-white/90 hover:bg-white text-gray-900 shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(image.url, "_blank");
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!disabled && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="bg-red-500/90 hover:bg-red-600 text-white shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(index);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Image info - hide in compact mode */}
                {!compact && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        {t("common.upload.imageNumber", {
                          values: { number: index + 1 },
                        })}
                      </span>
                      {image.bytes && (
                        <span className="text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                          {(image.bytes / 1024 / 1024).toFixed(1)} MB
                        </span>
                      )}
                    </div>
                    {image.width && image.height && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {image.width} × {image.height} px
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Upload Summary */}
          <div
            className={cn(
              "rounded-lg border border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-950/25",
              compact ? "p-2" : "p-3"
            )}
          >
            <div
              className={cn(
                "flex items-center text-emerald-900 dark:text-emerald-200/95",
                compact ? "text-xs" : "text-sm"
              )}
            >
              <CheckCircle
                className={cn(
                  "mr-2 text-emerald-600 dark:text-emerald-400",
                  compact ? "h-3 w-3" : "h-4 w-4"
                )}
              />
              <span className="font-medium">
                {t("common.upload.readyToUpload", {
                  values: {
                    count: images.length,
                    plural: images.length > 1 ? "s" : "",
                  },
                })}
              </span>
            </div>
            <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-300/80">
              {t("common.upload.reviewDescription")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

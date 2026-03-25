"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Eye,
  ExternalLink,
  ImageIcon,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { propertyService } from "@/lib/services/property.service";
import { ImageUpload, UploadedImage } from "@/components/ui/image-upload";
import { ImageErrorBoundary } from "@/components/ui/error-boundary";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import { cn } from "@/lib/utils";

interface PropertyImageGalleryProps {
  images: string[];
  propertyName: string;
  canEdit: boolean;
  onImagesUpdate: (newImages: string[]) => void;
  propertyId: string;
}

const PropertyImageGallery: React.FC<PropertyImageGalleryProps> = ({
  images: imagesProp,
  propertyName,
  canEdit,
  onImagesUpdate,
  propertyId,
}) => {
  const images = imagesProp ?? [];
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [imageToReplace, setImageToReplace] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useLocalizationContext();
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;
  const txHead = "text-foreground";
  const txSub = "text-muted-foreground";
  const thumbBg = "bg-muted/50";
  const galleryCardClass = cn(
    "overflow-hidden py-0 border shadow-sm hover:shadow-md transition-all duration-300 ease-out [transform:translateZ(0)]",
    !isLight && "border-white/14"
  );

  const handleImagesUploaded = async (uploadedImages: UploadedImage[]) => {
    try {
      setLoading(true);
      const imageUrls = uploadedImages.map((img) => img.url);
      const updatedProperty = await propertyService.addPropertyImages(
        propertyId,
        imageUrls
      );

      const newImages = updatedProperty?.images || [];

      onImagesUpdate(newImages);
      toast.success(
        t("properties.images.toasts.addSuccess", {
          values: { count: uploadedImages.length.toString() },
        })
      );
    } catch (error: any) {
      toast.error(error.message || t("properties.images.toasts.addError"));
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceUploaded = async (uploadedImages: UploadedImage[]) => {
    if (!imageToReplace) return;
    const newUrl = uploadedImages[0]?.url;
    if (!newUrl) {
      toast.error(t("properties.images.toasts.replaceError"));
      return;
    }
    try {
      setLoading(true);
      const updatedProperty = await propertyService.replacePropertyImage(
        propertyId,
        imageToReplace,
        newUrl
      );
      const newImages = updatedProperty?.images || [];
      onImagesUpdate(newImages);
      setShowReplaceDialog(false);
      setImageToReplace(null);
      toast.success(t("properties.images.toasts.replaceSuccess"));
    } catch (error: any) {
      toast.error(
        error.message || t("properties.images.toasts.replaceError")
      );
    } finally {
      setLoading(false);
    }
  };

  const openReplaceDialog = (imageUrl: string) => {
    setImageToReplace(imageUrl);
    setShowReplaceDialog(true);
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete) return;

    try {
      setLoading(true);
      const updatedProperty = await propertyService.removePropertyImages(
        propertyId,
        [imageToDelete]
      );

      const newImages = updatedProperty?.images || [];

      onImagesUpdate(newImages);
      setImageToDelete(null);
      setShowDeleteDialog(false);
      toast.success(t("properties.images.toasts.deleteSuccess"));
    } catch (error: any) {
      toast.error(
        error.message || t("properties.images.toasts.deleteError")
      );
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (imageUrl: string) => {
    setImageToDelete(imageUrl);
    setShowDeleteDialog(true);
  };

  const moveImage = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const next = [...images];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    try {
      setLoading(true);
      const updatedProperty = await propertyService.reorderPropertyImages(
        propertyId,
        next
      );
      onImagesUpdate(updatedProperty?.images || next);
      toast.success(t("properties.images.toasts.reorderSuccess"));
    } catch (error: any) {
      toast.error(
        error.message || t("properties.images.toasts.reorderError")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className={cn("text-lg font-semibold", txHead)}>
              {t("properties.images.header.title")}
            </h3>
            <p className={cn("text-sm", txSub)}>
              {images?.length > 0
                ? t("properties.images.header.summary", {
                    values: { count: images.length.toString() },
                  })
                : t("properties.images.empty.description")}
            </p>
          </div>
          {canEdit && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("properties.images.actions.add")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/30 rounded-full flex items-center justify-center">
                      <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <DialogTitle className={cn("text-xl font-semibold", txHead)}>
                        {t("properties.images.dialog.addTitle")}
                      </DialogTitle>
                      <DialogDescription className={cn("text-sm", txSub)}>
                        {t("properties.images.dialog.addDescription")}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="py-4">
                  <ImageUpload
                    onImagesUploaded={handleImagesUploaded}
                    maxFiles={10}
                    folder="SmartStartPM/properties"
                    quality="auto"
                    disabled={loading}
                  />
                </div>

                <DialogFooter className="flex items-center justify-between pt-4 border-t">
                  <div className={cn("flex items-center text-sm", txSub)}>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span>{t("properties.images.dialog.helper")}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                      disabled={loading}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      onClick={() => setShowAddDialog(false)}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t("properties.images.dialog.processing")}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {t("properties.images.dialog.done")}
                        </>
                      )}
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((imageUrl, index) => (
              <Card key={`${imageUrl}::${index}`} className={galleryCardClass}>
                <div className="relative group">
                  <div className={cn("relative w-full h-58", thumbBg)}>
                    <img
                      src={imageUrl}
                      alt={t("properties.images.alt.thumbnail", {
                        values: {
                          index: (index + 1).toString(),
                          name: propertyName,
                        },
                      })}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <Badge className="absolute top-2 left-2 bg-black bg-opacity-70 text-white">
                    {index + 1}
                  </Badge>

                  <div className="pointer-events-none absolute inset-0 flex flex-wrap content-center items-center justify-center gap-1 px-2 py-2 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 sm:gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedImage(imageUrl)}
                      className="pointer-events-auto bg-white/95 text-slate-900 shadow-sm ring-1 ring-black/10 hover:bg-white [&_svg]:text-slate-900"
                    >
                      <Eye className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">
                        {t("properties.images.actions.view")}
                      </span>
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => moveImage(index, -1)}
                          disabled={loading || index === 0}
                          className="pointer-events-auto bg-white/95 text-slate-900 shadow-sm ring-1 ring-black/10 hover:bg-white [&_svg]:text-slate-900"
                          title={t("properties.images.actions.moveEarlier")}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => moveImage(index, 1)}
                          disabled={loading || index === images.length - 1}
                          className="pointer-events-auto bg-white/95 text-slate-900 shadow-sm ring-1 ring-black/10 hover:bg-white [&_svg]:text-slate-900"
                          title={t("properties.images.actions.moveLater")}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openReplaceDialog(imageUrl)}
                          disabled={loading}
                          className="pointer-events-auto bg-white/95 text-slate-900 shadow-sm ring-1 ring-black/10 hover:bg-white [&_svg]:text-slate-900"
                        >
                          <RefreshCw className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">
                            {t("properties.images.actions.replace")}
                          </span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteDialog(imageUrl)}
                          disabled={loading}
                          className="pointer-events-auto shadow-sm"
                        >
                          <Trash2 className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">
                            {t("properties.images.actions.delete")}
                          </span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card
            className={cn(
              "border shadow-sm transition-all duration-300",
              !isLight && "border-white/14"
            )}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="h-12 w-12 mb-4 text-muted-foreground" />
              <h3 className={cn("text-lg font-semibold mb-2", txHead)}>
                {t("properties.images.empty.title")}
              </h3>
              <p className={cn("text-center mb-4", txSub)}>
                {t("properties.images.empty.description")}
              </p>
              {canEdit && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("properties.images.empty.addFirst")}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {selectedImage && (
          <Dialog
            open={!!selectedImage}
            onOpenChange={() => setSelectedImage(null)}
          >
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{t("properties.images.viewer.title")}</DialogTitle>
              </DialogHeader>
              <div className="relative w-full h-96">
                <img
                  src={selectedImage}
                  alt={t("properties.images.alt.main", {
                    values: { name: propertyName },
                  })}
                  className="absolute inset-0 w-full h-full object-contain"
                  loading="eager"
                  decoding="async"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedImage(null)}
                >
                  {t("properties.images.viewer.close")}
                </Button>
                <Button onClick={() => window.open(selectedImage, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t("properties.images.viewer.openInNewTab")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Dialog
          open={showReplaceDialog}
          onOpenChange={(open) => {
            setShowReplaceDialog(open);
            if (!open) setImageToReplace(null);
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("properties.images.dialog.replaceTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("properties.images.dialog.replaceDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <ImageUpload
                onImagesUploaded={handleReplaceUploaded}
                maxFiles={1}
                folder="SmartStartPM/properties"
                quality="auto"
                disabled={loading}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReplaceDialog(false);
                  setImageToReplace(null);
                }}
                disabled={loading}
              >
                {t("common.cancel")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("properties.images.dialog.deleteTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("properties.images.dialog.deleteDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setImageToDelete(null)}
                disabled={loading}
              >
                {t("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void handleDeleteImage();
                }}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                    {t("properties.images.dialog.deleteProcessing")}
                  </>
                ) : (
                  t("properties.images.dialog.deleteConfirm")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ImageErrorBoundary>
  );
};

export default PropertyImageGallery;

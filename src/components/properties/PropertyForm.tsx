"use client";

import { z } from "zod";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { LucideIcon } from "lucide-react";
import {
  AirVent,
  ArrowUpDown,
  Building2,
  Car,
  DoorOpen,
  Dumbbell,
  Flame,
  Home,
  ImageIcon,
  LayoutGrid,
  Loader2,
  MapPin,
  Package,
  PawPrint,
  Plus,
  Save,
  Shirt,
  Sofa,
  Sparkles,
  Star,
  Trash2,
  ThermometerSun,
  Utensils,
  WashingMachine,
  Waves,
  Wifi,
  X,
} from "lucide-react";
import { PropertyType, PropertyStatus } from "@/types";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import { cn } from "@/lib/utils";

// Enhanced form schema
const enhancedPropertySchema = (t: (key: string, options?: any) => string) =>
  z.object({
    // Basic Information
    name: z
      .string()
      .min(1, t("properties.form.validation.nameRequired"))
      .max(200),
    description: z.string().max(2000).optional(),
    virtualTourUrl: z.string().url().optional().or(z.literal("")),
    neighborhood: z.string().max(100).optional(),
    type: z.nativeEnum(PropertyType),
    status: z.nativeEnum(PropertyStatus),

    // Address
    address: z.object({
      street: z
        .string()
        .min(1, t("properties.form.validation.streetRequired"))
        .max(200),
      city: z
        .string()
        .min(1, t("properties.form.validation.cityRequired"))
        .max(100),
      state: z
        .string()
        .min(1, t("properties.form.validation.stateRequired"))
        .max(50),
      zipCode: z
        .string()
        .min(1, t("properties.form.validation.zipRequired"))
        .max(20, t("properties.form.validation.zipTooLong")),
      country: z.string().optional().default("United States"),
    }),

    // Property-level details removed - units are now required to be configured explicitly

    // Property Type Configuration (auto-calculated based on units)
    // isMultiUnit and totalUnits will be calculated automatically
    // Unit details are now managed through the inline unit management component
    yearBuilt: z
      .number()
      .min(1800, t("properties.form.validation.yearBuiltMin"))
      .max(
        new Date().getFullYear() + 5,
        t("properties.form.validation.yearBuiltMax")
      )
      .optional(),

    // Note: Property features have been consolidated into amenities

    // Property Amenities
    amenities: z
      .array(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          category: z.string(),
        })
      )
      .default([]),

    // Images and Attachments
    images: z.array(z.string()).default([]),
    attachments: z
      .array(
        z.object({
          fileName: z.string(),
          fileUrl: z.string(),
          fileSize: z.number(),
          fileType: z.string(),
        })
      )
      .default([]),

    hoaCustomFields: z
      .array(
        z.object({
          key: z.string().max(120),
          value: z.string().max(2000),
        })
      )
      .max(40)
      .optional()
      .default([]),
  });

type EnhancedPropertyFormData = z.infer<
  ReturnType<typeof enhancedPropertySchema>
>;

// Extended initial data type to include units
interface ExtendedPropertyFormData extends Partial<EnhancedPropertyFormData> {
  units?: Array<{
    _id?: string;
    id?: string;
    unitNumber?: string;
    unitType?: "apartment" | "studio" | "penthouse" | "loft" | "room";
    floor?: number;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    rentAmount?: number;
    securityDeposit?: number;
    status?: PropertyStatus;
    images?: string[];
  }>;
}

interface EnhancedPropertyFormProps {
  initialData?: ExtendedPropertyFormData;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
  mode?: "create" | "edit";
  propertyId?: string; // For edit mode to enable unit CRUD operations
}

// Essential amenities and features (curated list of most common items)
const ESSENTIAL_AMENITIES_AND_FEATURES = [
  "Parking",
  "In-Unit Laundry",
  "Central AC",
  "Central Heating",
  "Internet",
  "Furnished",
  "Hardwood Floors",
  "Dishwasher",
  "Balcony/Patio",
  "Walk-in Closets",
  "Pets Allowed",
  "Pool",
  "Fitness Center",
  "Elevator",
  "Storage",
  "Fireplace",
];

/** Pastel icon tile per amenity (light + dark) */
const AMENITY_ICON_STYLE: Record<
  string,
  { Icon: LucideIcon; shell: string }
> = {
  Parking: {
    Icon: Car,
    shell:
      "border-sky-200/80 bg-sky-100/70 text-sky-600 dark:border-sky-400/25 dark:bg-sky-500/20 dark:text-sky-300",
  },
  "In-Unit Laundry": {
    Icon: WashingMachine,
    shell:
      "border-cyan-200/80 bg-cyan-100/70 text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-500/20 dark:text-cyan-200",
  },
  "Central AC": {
    Icon: AirVent,
    shell:
      "border-blue-200/80 bg-blue-100/70 text-blue-600 dark:border-blue-400/25 dark:bg-blue-500/20 dark:text-blue-300",
  },
  "Central Heating": {
    Icon: ThermometerSun,
    shell:
      "border-amber-200/80 bg-amber-100/70 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/20 dark:text-amber-200",
  },
  Internet: {
    Icon: Wifi,
    shell:
      "border-violet-200/80 bg-violet-100/70 text-violet-600 dark:border-violet-400/25 dark:bg-violet-500/20 dark:text-violet-300",
  },
  Furnished: {
    Icon: Sofa,
    shell:
      "border-rose-200/80 bg-rose-100/70 text-rose-600 dark:border-rose-400/25 dark:bg-rose-500/20 dark:text-rose-300",
  },
  "Hardwood Floors": {
    Icon: LayoutGrid,
    shell:
      "border-orange-200/80 bg-orange-100/70 text-orange-700 dark:border-orange-400/25 dark:bg-orange-500/20 dark:text-orange-200",
  },
  Dishwasher: {
    Icon: Utensils,
    shell:
      "border-teal-200/80 bg-teal-100/70 text-teal-700 dark:border-teal-400/25 dark:bg-teal-500/20 dark:text-teal-200",
  },
  "Balcony/Patio": {
    Icon: DoorOpen,
    shell:
      "border-lime-200/80 bg-lime-100/70 text-lime-800 dark:border-lime-400/25 dark:bg-lime-500/20 dark:text-lime-200",
  },
  "Walk-in Closets": {
    Icon: Shirt,
    shell:
      "border-fuchsia-200/80 bg-fuchsia-100/70 text-fuchsia-700 dark:border-fuchsia-400/25 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
  },
  "Pets Allowed": {
    Icon: PawPrint,
    shell:
      "border-pink-200/80 bg-pink-100/70 text-pink-600 dark:border-pink-400/25 dark:bg-pink-500/20 dark:text-pink-300",
  },
  Pool: {
    Icon: Waves,
    shell:
      "border-cyan-200/80 bg-cyan-100/70 text-cyan-600 dark:border-cyan-400/25 dark:bg-cyan-500/25 dark:text-cyan-200",
  },
  "Fitness Center": {
    Icon: Dumbbell,
    shell:
      "border-emerald-200/80 bg-emerald-100/70 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/20 dark:text-emerald-200",
  },
  Elevator: {
    Icon: ArrowUpDown,
    shell:
      "border-slate-200/90 bg-slate-100/80 text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-gray-300",
  },
  Storage: {
    Icon: Package,
    shell:
      "border-stone-200/80 bg-stone-100/70 text-stone-700 dark:border-stone-400/25 dark:bg-stone-500/20 dark:text-stone-300",
  },
  Fireplace: {
    Icon: Flame,
    shell:
      "border-red-200/80 bg-red-100/70 text-red-600 dark:border-red-400/25 dark:bg-red-500/20 dark:text-red-300",
  },
};

const defaultAmenityVisual = {
  Icon: Sparkles,
  shell:
    "border-slate-200/80 bg-slate-100/70 text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-gray-300",
} as const;

function getAmenityVisual(name: string) {
  return AMENITY_ICON_STYLE[name] ?? defaultAmenityVisual;
}

// Map amenity names to translation keys
const getAmenityTranslationKey = (amenityName: string): string => {
  const keyMap: Record<string, string> = {
    Parking: "parking",
    "In-Unit Laundry": "laundry",
    "Central AC": "airConditioning",
    "Central Heating": "heating",
    Internet: "wifi",
    Furnished: "furnished",
    "Hardwood Floors": "hardwoodFloors",
    Dishwasher: "dishwasher",
    "Balcony/Patio": "balcony",
    "Walk-in Closets": "walkInClosets",
    "Pets Allowed": "petFriendly",
    Pool: "pool",
    "Fitness Center": "fitnessCenter",
    Elevator: "elevator",
    Storage: "storage",
    Fireplace: "fireplace",
  };

  return keyMap[amenityName] || amenityName.toLowerCase().replace(/\s+/g, "");
};

// Function to map amenity names to appropriate categories
const getAmenityCategory = (amenityName: string): string => {
  const name = amenityName.toLowerCase();

  // Kitchen amenities
  if (
    name.includes("dishwasher") ||
    name.includes("kitchen") ||
    name.includes("granite") ||
    name.includes("stainless") ||
    name.includes("microwave") ||
    name.includes("refrigerator")
  ) {
    return "Kitchen";
  }

  // Bathroom amenities
  if (
    name.includes("bathroom") ||
    name.includes("jacuzzi") ||
    name.includes("tub")
  ) {
    return "Bathroom";
  }

  // Living amenities
  if (
    name.includes("hardwood") ||
    name.includes("fireplace") ||
    name.includes("furnished") ||
    name.includes("living") ||
    name.includes("carpet")
  ) {
    return "Living";
  }

  // Bedroom amenities
  if (
    name.includes("walk-in") ||
    name.includes("closet") ||
    name.includes("bedroom")
  ) {
    return "Bedroom";
  }

  // Outdoor amenities
  if (
    name.includes("balcony") ||
    name.includes("patio") ||
    name.includes("garden") ||
    name.includes("pool") ||
    name.includes("outdoor") ||
    name.includes("deck")
  ) {
    return "Outdoor";
  }

  // Parking amenities
  if (
    name.includes("parking") ||
    name.includes("garage") ||
    name.includes("carport")
  ) {
    return "Parking";
  }

  // Security amenities
  if (
    name.includes("security") ||
    name.includes("doorman") ||
    name.includes("concierge") ||
    name.includes("alarm") ||
    name.includes("camera")
  ) {
    return "Security";
  }

  // Utilities amenities
  if (
    name.includes("internet") ||
    name.includes("wifi") ||
    name.includes("cable") ||
    name.includes("utilities") ||
    name.includes("electric")
  ) {
    return "Utilities";
  }

  // Recreation amenities
  if (
    name.includes("fitness") ||
    name.includes("gym") ||
    name.includes("tennis") ||
    name.includes("basketball") ||
    name.includes("playground") ||
    name.includes("clubhouse")
  ) {
    return "Recreation";
  }

  // Laundry amenities
  if (
    name.includes("laundry") ||
    name.includes("washer") ||
    name.includes("dryer")
  ) {
    return "Laundry";
  }

  // Climate amenities
  if (
    name.includes("ac") ||
    name.includes("air") ||
    name.includes("heating") ||
    name.includes("hvac") ||
    name.includes("central")
  ) {
    return "Climate";
  }

  // Default to Other
  return "Other";
};

export function EnhancedPropertyForm({
  initialData,
  onSubmit,
  isLoading = false,
  mode = "create",
  propertyId,
}: EnhancedPropertyFormProps) {
  // Alert dialog state
  const [showAlert, setShowAlert] = useState(false);

  // Manage amenities state (features are now consolidated into amenities)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(() => {
    const amenities =
      initialData?.amenities?.map((a) =>
        typeof a === "string" ? a : a.name
      ) || [];
    return amenities;
  });
  const [customAmenity, setCustomAmenity] = useState("");

  // Image upload state
  const [propertyImages, setPropertyImages] = useState<UploadedImage[]>(() => {
    return (initialData?.images || []).map((url, index) => ({
      url,
      publicId: `existing-${index}`,
    }));
  });

  // Units state for both create and edit mode
  const [units, setUnits] = useState<
    Array<{
      id: string;
      unitNumber: string;
      unitType: "apartment" | "studio" | "penthouse" | "loft" | "room";
      floor?: number;
      bedrooms: number;
      bathrooms: number;
      squareFootage: number;
      rentAmount: number;
      securityDeposit: number;
      status: PropertyStatus;
      images: UploadedImage[];
    }>
  >(() => {
    // Initialize with units from initialData if in edit mode
    if (mode === "edit" && initialData?.units) {
      const mappedUnits = initialData.units.map((unit: any, index: number) => ({
        id: unit._id || unit.id || `unit-${index}`,
        unitNumber: unit.unitNumber || `Unit ${index + 1}`,
        unitType: unit.unitType || "apartment",
        floor: unit.floor,
        bedrooms: unit.bedrooms || 1,
        bathrooms: unit.bathrooms || 1,
        squareFootage: unit.squareFootage || 500,
        rentAmount: unit.rentAmount || 1000,
        securityDeposit: unit.securityDeposit || 1000,
        status: unit.status || PropertyStatus.AVAILABLE,
        images: (unit.images || []).map((url: string, imgIndex: number) => ({
          url,
          publicId: `existing-unit-${index}-${imgIndex}`,
        })),
      }));
      return mappedUnits;
    }
    // In create mode, initialize with one default unit
    return [
      {
        id: `unit-${Date.now()}`,
        unitNumber: "Unit 1",
        unitType: "apartment" as const,
        floor: 1,
        bedrooms: 1,
        bathrooms: 1,
        squareFootage: 500,
        rentAmount: 1000,
        securityDeposit: 1000,
        status: PropertyStatus.AVAILABLE,
        images: [],
      },
    ];
  });

  const { t } = useLocalizationContext();
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;

  const sectionCardClass = cn(
    "gap-0 overflow-hidden rounded-2xl py-0 shadow-sm transition-shadow duration-300 ease-out [transform:translateZ(0)]"
  );
  const sectionHeaderClass = cn(
    "space-y-1 border-b px-4 py-4 backdrop-blur-md sm:px-5 sm:py-4",
    isLight
      ? "border-slate-200/55 bg-slate-50/30"
      : "border-white/10 bg-white/[0.05]"
  );
  const sectionTitleClass =
    "flex items-center gap-3 text-base font-semibold tracking-tight text-foreground sm:text-lg";
  const sectionDescClass =
    "text-xs font-normal leading-snug text-muted-foreground sm:text-sm";
  const cardBodyClass = cn(
    "space-y-4 px-4 pb-6 pt-4 text-foreground sm:px-5 sm:pb-6 sm:pt-5"
  );
  const nestedUnitClass = cn(
    "gap-0 overflow-hidden rounded-xl !px-4 !py-4 shadow-none ring-1 ring-inset backdrop-blur-md",
    isLight ? "ring-slate-900/[0.06]" : "ring-white/[0.09]"
  );
  const insetCalloutClass = cn(
    "rounded-xl border p-4 text-sm text-foreground backdrop-blur-md",
    isLight
      ? "border-slate-200/65 bg-white/45"
      : "border-white/12 bg-white/[0.04]"
  );
  const insetSubtleClass = cn(
    "rounded-xl border p-3 backdrop-blur-md sm:p-4",
    isLight
      ? "border-slate-200/65 bg-white/40"
      : "border-white/12 bg-white/[0.04]"
  );

  const form = useForm({
    resolver: zodResolver(enhancedPropertySchema(t)),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      virtualTourUrl: initialData?.virtualTourUrl || "",
      neighborhood: initialData?.neighborhood || "",
      type: initialData?.type || PropertyType.APARTMENT,
      status: initialData?.status || PropertyStatus.AVAILABLE,
      address: {
        street: initialData?.address?.street || "",
        city: initialData?.address?.city || "",
        state: initialData?.address?.state || "",
        zipCode: initialData?.address?.zipCode || "",
        country: initialData?.address?.country || "United States",
      },
      yearBuilt: initialData?.yearBuilt,
      amenities: initialData?.amenities || [],
      images: initialData?.images || [],
      attachments: initialData?.attachments || [],
      hoaCustomFields:
        Array.isArray(initialData?.hoaCustomFields) && initialData.hoaCustomFields.length > 0
          ? initialData.hoaCustomFields
          : [],
    },
  });

  const { fields: hoaFieldRows, append: appendHoaRow, remove: removeHoaRow } = useFieldArray({
    control: form.control,
    name: "hoaCustomFields",
  });

  const { watch, setValue } = form;
  const watchedValues = watch();

  // Note: Unit management is now handled separately

  // Handle amenity selection
  const handleAmenityToggle = (item: string) => {
    const newItems = selectedAmenities.includes(item)
      ? selectedAmenities.filter((i) => i !== item)
      : [...selectedAmenities, item];

    setSelectedAmenities(newItems);

    // Update amenities in the form
    const amenityObjects = newItems.map((name) => ({
      name,
      category: getAmenityCategory(name),
    }));
    setValue("amenities", amenityObjects);
  };

  const handleAddCustomAmenity = () => {
    if (
      customAmenity.trim() &&
      !selectedAmenities.includes(customAmenity.trim())
    ) {
      const newItems = [...selectedAmenities, customAmenity.trim()];
      setSelectedAmenities(newItems);

      const amenityObjects = newItems.map((name) => ({
        name,
        category: getAmenityCategory(name),
      }));
      setValue("amenities", amenityObjects);
      setCustomAmenity("");
    }
  };

  const handleRemoveAmenity = (item: string) => {
    const newItems = selectedAmenities.filter((i) => i !== item);
    setSelectedAmenities(newItems);

    const amenityObjects = newItems.map((name) => ({
      name,
      category: getAmenityCategory(name),
    }));
    setValue("amenities", amenityObjects);
  };

  // Image upload handlers
  const handleImagesUploaded = (newImages: UploadedImage[]) => {
    const updatedImages = [...propertyImages, ...newImages];
    setPropertyImages(updatedImages);
    setValue(
      "images",
      updatedImages.map((img) => img.url)
    );
  };

  // DISABLED: Delete functionality temporarily disabled
  const handleImageRemove = (imageToRemove: UploadedImage) => {
    const updatedImages = propertyImages.filter(
      (img) => img.publicId !== imageToRemove.publicId
    );
    setPropertyImages(updatedImages);
    setValue(
      "images",
      updatedImages.map((img) => img.url)
    );
  };

  const handleFormSubmit = async (data: EnhancedPropertyFormData) => {
    try {
      // Check if there are any units configured
      if (units.length === 0) {
        // Show a user-friendly error message using AlertDialog
        setShowAlert(true);
        return; // Don't proceed with submission
      }

      // Automatically determine if this is a multi-unit property based on units
      const isMultiUnit = units.length > 1;
      const totalUnits = Math.max(units.length, 1);

      // Transform units data for API submission (remove id field and convert images to URLs)
      const apiUnits = units.map(({ id: _id, images, ...unit }) => ({
        ...unit,
        images: images.map((img) => img.url), // Convert UploadedImage[] to string[]
      }));

      // Include units data and auto-calculated multi-unit status
      // For unified architecture, always include units array
      const submissionData = {
        ...data,
        isMultiUnit,
        totalUnits,
        units: apiUnits, // Always include units array for unified architecture
        hoaCustomFields: (data.hoaCustomFields || [])
          .filter((r) => r.key && r.key.trim().length > 0)
          .map((r) => ({ key: r.key.trim(), value: (r.value || "").trim() })),
      };

      await onSubmit(submissionData);
    } catch (error) {
      throw error; // Re-throw to show user the error
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* General Information */}
      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={sectionTitleClass}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-200/70 bg-violet-50/90 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
              <Building2 className="h-[18px] w-[18px]" />
            </div>
            {t("properties.form.general.title")}
          </CardTitle>
          <CardDescription className={sectionDescClass}>
            {t("properties.form.general.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className={cardBodyClass}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {t("properties.form.fields.name.label")}
              </Label>
              <Input
                id="name"
                placeholder={t("properties.form.fields.name.placeholder")}
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                {t("properties.form.fields.type.label")}
              </Label>
              <Select
                value={watchedValues.type}
                onValueChange={(value) =>
                  setValue("type", value as PropertyType)
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("properties.form.fields.type.placeholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PropertyType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`properties.type.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                {t("properties.form.fields.status.label")}
              </Label>
              <Select
                value={watchedValues.status}
                onValueChange={(value) =>
                  setValue("status", value as PropertyStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("properties.form.fields.status.placeholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PropertyStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.status && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.status.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearBuilt">
                {t("properties.form.fields.yearBuilt.label")}
              </Label>
              <Input
                className="w-full"
                id="yearBuilt"
                type="number"
                min="1800"
                max={new Date().getFullYear() + 5}
                placeholder={t("properties.form.fields.yearBuilt.placeholder")}
                {...form.register("yearBuilt", {
                  valueAsNumber: true,
                  setValueAs: (value) =>
                    value === "" ? undefined : Number(value),
                })}
              />
              {form.formState.errors.yearBuilt && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.yearBuilt.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {t("properties.form.fields.description.label")}
            </Label>
            <Textarea
              id="description"
              placeholder={t("properties.form.fields.description.placeholder")}
              rows={3}
              {...form.register("description")}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Neighborhood / Area</Label>
              <Input
                id="neighborhood"
                placeholder="e.g. Falling Waters, Naples"
                {...form.register("neighborhood")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="virtualTourUrl">Virtual Tour URL</Label>
              <Input
                id="virtualTourUrl"
                type="url"
                placeholder="https://youtube.com/watch?v=... or Matterport link"
                {...form.register("virtualTourUrl")}
              />
              {form.formState.errors.virtualTourUrl && (
                <p className="text-sm text-red-600">{form.formState.errors.virtualTourUrl.message as string}</p>
              )}
              <p className="text-xs text-muted-foreground">YouTube or Matterport links will be embedded automatically</p>
            </div>
          </div>

          <div className={insetCalloutClass}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">HOA / association custom fields</p>
                <p className="text-xs text-muted-foreground">
                  Optional key–value pairs (e.g. registration portal, gate rules). Empty rows are ignored on save.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1"
                onClick={() => appendHoaRow({ key: "", value: "" })}
              >
                <Plus className="h-3.5 w-3.5" />
                Add field
              </Button>
            </div>
            <div className="space-y-2">
              {hoaFieldRows.length === 0 && (
                <p className="text-xs text-muted-foreground">No custom fields yet. Use “Add field” to add HOA metadata.</p>
              )}
              {hoaFieldRows.map((row, index) => (
                <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Label (e.g. HOA registration URL)"
                      {...form.register(`hoaCustomFields.${index}.key` as const)}
                    />
                    <Textarea
                      placeholder="Value"
                      rows={2}
                      className="min-h-[40px] resize-y"
                      {...form.register(`hoaCustomFields.${index}.value` as const)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeHoaRow(index)}
                    aria-label="Remove HOA field"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold text-foreground">
                {t("properties.form.address.title")}
              </Label>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="street">
                  {t("properties.form.fields.street.label")}
                </Label>
                <Input
                  id="street"
                  placeholder={t("properties.form.fields.street.placeholder")}
                  {...form.register("address.street")}
                />
                {form.formState.errors.address?.street && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.address.street.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">
                  {t("properties.form.fields.city.label")}
                </Label>
                <Input
                  id="city"
                  placeholder={t("properties.form.fields.city.placeholder")}
                  {...form.register("address.city")}
                />
                {form.formState.errors.address?.city && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.address.city.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">
                  {t("properties.form.fields.state.label")}
                </Label>
                <Input
                  id="state"
                  placeholder={t("properties.form.fields.state.placeholder")}
                  {...form.register("address.state")}
                />
                {form.formState.errors.address?.state && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.address.state.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">
                  {t("properties.form.fields.zipCode.label")}
                </Label>
                <Input
                  id="zipCode"
                  placeholder={t("properties.form.fields.zipCode.placeholder")}
                  {...form.register("address.zipCode")}
                />
                {form.formState.errors.address?.zipCode && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.address.zipCode.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">
                  {t("properties.form.fields.country.label")}
                </Label>
                <Input id="country" {...form.register("address.country")} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Units */}
      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={sectionTitleClass}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-200/70 bg-sky-50/90 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
              <Home className="h-[18px] w-[18px]" />
            </div>
            {t("properties.form.units.title")}
          </CardTitle>
          <CardDescription className={sectionDescClass}>
            {t("properties.form.units.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className={cn(cardBodyClass, "space-y-4")}>
          {/* Smart Unit Management Info */}
          <div className={insetCalloutClass}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Smart Unit Management
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Your property will automatically be configured as single or
              multi-unit based on the number of units you add. Start with one
              unit and add more using the &quot;Add New Unit&quot; button.
            </p>
          </div>
          {units.map((unit, index) => (
            <Card key={unit.id} className={nestedUnitClass}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">
                    {t("properties.form.units.unitTitle", {
                      values: { index: index + 1 },
                    })}
                  </h3>
                  {units.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUnits(units.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {t("properties.form.units.fields.unitNumber")}
                    </Label>
                    <Input
                      value={unit.unitNumber}
                      onChange={(e) => {
                        const newUnits = [...units];
                        newUnits[index].unitNumber = e.target.value;
                        setUnits(newUnits);
                      }}
                      placeholder="Unit 101"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("properties.form.units.fields.unitType")}</Label>
                    <Select
                      value={unit.unitType}
                      onValueChange={(value: any) => {
                        const newUnits = [...units];
                        newUnits[index].unitType = value;
                        setUnits(newUnits);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apartment">
                          {t("properties.unitType.apartment")}
                        </SelectItem>
                        <SelectItem value="studio">
                          {t("properties.unitType.studio")}
                        </SelectItem>
                        <SelectItem value="penthouse">
                          {t("properties.unitType.penthouse")}
                        </SelectItem>
                        <SelectItem value="loft">
                          {t("properties.unitType.loft")}
                        </SelectItem>
                        <SelectItem value="room">
                          {t("properties.unitType.room")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("properties.form.units.fields.floor")}</Label>
                    <Input
                      type="number"
                      value={unit.floor || ""}
                      onChange={(e) => {
                        const newUnits = [...units];
                        newUnits[index].floor =
                          parseInt(e.target.value) || undefined;
                        setUnits(newUnits);
                      }}
                      placeholder={t(
                        "properties.form.units.placeholders.floor"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("properties.form.units.fields.bedrooms")}</Label>
                    <Input
                      type="number"
                      value={unit.bedrooms}
                      onChange={(e) => {
                        const newUnits = [...units];
                        newUnits[index].bedrooms =
                          parseInt(e.target.value) || 0;
                        setUnits(newUnits);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("properties.form.units.fields.bathrooms")}</Label>
                    <Input
                      type="number"
                      value={unit.bathrooms}
                      onChange={(e) => {
                        const newUnits = [...units];
                        newUnits[index].bathrooms =
                          parseInt(e.target.value) || 0;
                        setUnits(newUnits);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {t("properties.form.units.fields.squareFootage")}
                    </Label>
                    <Input
                      type="number"
                      value={unit.squareFootage}
                      onChange={(e) => {
                        const newUnits = [...units];
                        newUnits[index].squareFootage =
                          parseInt(e.target.value) || 0;
                        setUnits(newUnits);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {t("properties.form.units.fields.rentAmount")}
                    </Label>
                    <Input
                      type="number"
                      value={unit.rentAmount}
                      onChange={(e) => {
                        const newUnits = [...units];
                        newUnits[index].rentAmount =
                          parseInt(e.target.value) || 0;
                        setUnits(newUnits);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {t("properties.form.units.fields.securityDeposit")}
                    </Label>
                    <Input
                      type="number"
                      value={unit.securityDeposit}
                      onChange={(e) => {
                        const newUnits = [...units];
                        newUnits[index].securityDeposit =
                          parseInt(e.target.value) || 0;
                        setUnits(newUnits);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("properties.form.units.fields.status")}</Label>
                    <Select
                      value={unit.status}
                      onValueChange={(value: PropertyStatus) => {
                        const newUnits = [...units];
                        newUnits[index].status = value;
                        setUnits(newUnits);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(PropertyStatus).map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`properties.status.${status}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Unit Images */}
                <div
                  className={cn(
                    "space-y-2 border-t pt-3",
                    isLight ? "border-slate-200/70" : "border-white/10"
                  )}
                >
                  <Label className="flex items-center gap-2 text-sm text-foreground">
                    <ImageIcon className="h-4 w-4" />
                    {t("properties.form.units.fields.images")}
                  </Label>
                  <ImageUpload
                    onImagesUploaded={(newImages) => {
                      const newUnits = [...units];
                      newUnits[index].images = [
                        ...newUnits[index].images,
                        ...newImages,
                      ];
                      setUnits(newUnits);
                    }}
                    onImagesRemoved={(imagesToRemove) => {
                      const newUnits = [...units];
                      newUnits[index].images = newUnits[index].images.filter(
                        (img) =>
                          !imagesToRemove.some(
                            (remove) => remove.publicId === img.publicId
                          )
                      );
                      setUnits(newUnits);
                    }}
                    existingImages={unit.images}
                    maxFiles={15}
                    folder="SmartStartPM/units"
                    quality="auto"
                    disabled={isLoading}
                    className="w-full"
                    compact
                    label={t("properties.form.units.uploadImages")}
                  />
                  {unit.images.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {unit.images.length}{" "}
                      {unit.images.length === 1 ? "image" : "images"} uploaded
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const newUnit = {
                id: `unit-${Date.now()}`,
                unitNumber: `Unit ${units.length + 1}`,
                unitType: "apartment" as const,
                bedrooms: 1,
                bathrooms: 1,
                squareFootage: 500,
                rentAmount: 1000,
                securityDeposit: 1000,
                status: PropertyStatus.AVAILABLE,
                images: [],
              };
              setUnits([...units, newUnit]);
            }}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Unit
          </Button>
        </CardContent>
      </Card>

      {/* Note: Unit information is now handled by IntegratedUnitManagement component above */}

      {/* Amenities & Features */}
      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={sectionTitleClass}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200/70 bg-amber-50/90 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <Star className="h-[18px] w-[18px]" />
            </div>
            {t("properties.form.amenities.title")}
          </CardTitle>
          <CardDescription className={sectionDescClass}>
            {t("properties.form.amenities.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className={cn(cardBodyClass, "space-y-4")}>
          {/* Essential Amenities — compact tiles with pastel icons */}
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {ESSENTIAL_AMENITIES_AND_FEATURES.map((item) => {
              const translationKey = getAmenityTranslationKey(item);
              const labelKey = `properties.amenities.items.${translationKey}`;
              const { Icon, shell } = getAmenityVisual(item);
              const selected = selectedAmenities.includes(item);
              return (
                <div
                  key={item}
                  className={cn(
                    "grid min-h-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 rounded-md border px-1.5 py-1 backdrop-blur-sm transition-colors duration-150",
                    "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
                    isLight
                      ? "hover:border-slate-300/90 hover:bg-white/70"
                      : "hover:border-white/22 hover:bg-white/[0.07]",
                    selected
                      ? isLight
                        ? "border-slate-500/50 bg-slate-200/55 shadow-sm"
                        : "border-white/45 bg-white/14 shadow-sm"
                      : isLight
                        ? "border-slate-200/75 bg-white/55"
                        : "border-white/12 bg-white/[0.04]"
                  )}
                  onClick={() => handleAmenityToggle(item)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      handleAmenityToggle(item);
                    }
                  }}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border sm:h-7 sm:w-7",
                      shell,
                      selected && "ring-1 ring-slate-900/15 dark:ring-white/25"
                    )}
                    aria-hidden
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </div>
                  <span className="min-w-0 text-left text-[10px] font-medium leading-tight text-foreground line-clamp-2 sm:text-[11px]">
                    {t(labelKey)}
                  </span>
                  <Checkbox
                    checked={selected}
                    onChange={() => {}} // Handled by parent click
                    className={cn(
                      "pointer-events-none shrink-0 scale-[0.82] border-slate-300 transition-colors sm:scale-90",
                      selected &&
                        "!border-slate-900 !bg-slate-900 text-white dark:!border-white dark:!bg-white"
                    )}
                  />
                </div>
              );
            })}
          </div>

          {/* Custom Amenity Input - Modern Design */}
          <div className={insetSubtleClass}>
            <Label className="mb-2 block text-xs font-semibold text-foreground sm:text-sm">
              {t("properties.form.amenities.custom.label")}
            </Label>
            <div className="flex gap-3">
              <Input
                placeholder={t("properties.form.amenities.custom.placeholder")}
                value={customAmenity}
                onChange={(e) => setCustomAmenity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomAmenity();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCustomAmenity}
                disabled={!customAmenity.trim()}
                className="shrink-0 px-4 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Selected Items Display - Enhanced */}
          {selectedAmenities.length > 0 && (
            <div className={insetSubtleClass}>
              <Label className="mb-2 block text-xs font-semibold text-foreground sm:text-sm">
                {t("properties.form.amenities.selected.label", {
                  values: { count: selectedAmenities.length },
                })}
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedAmenities.map((item) => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className={cn(
                      "flex items-center gap-2 border px-3 py-1.5 font-medium backdrop-blur-sm transition-colors",
                      isLight
                        ? "border-slate-200/80 bg-white/70 text-foreground hover:bg-white/90"
                        : "border-white/15 bg-white/10 text-foreground hover:bg-white/14"
                    )}
                  >
                    <span className="font-medium">{item}</span>
                    <button
                      type="button"
                      className={cn(
                        "ml-1 rounded-full p-0.5 transition-colors",
                        isLight ? "hover:bg-slate-200/80" : "hover:bg-white/15"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveAmenity(item);
                      }}
                      aria-label={t(
                        "properties.form.amenities.selected.remove",
                        {
                          values: { name: item },
                        }
                      )}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Images */}
      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={sectionTitleClass}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200/70 bg-emerald-50/90 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <ImageIcon className="h-[18px] w-[18px]" />
            </div>
            {t("properties.form.images.title")}
          </CardTitle>
          <CardDescription className={sectionDescClass}>
            {t("properties.form.images.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className={cn(cardBodyClass, "space-y-5")}>
          <ImageUpload
            onImagesUploaded={handleImagesUploaded}
            // DISABLED: Delete functionality temporarily disabled
            onImagesRemoved={(images) => {
              // Handle batch removal if needed
              images.forEach(handleImageRemove);
            }}
            existingImages={propertyImages}
            maxFiles={20}
            folder="SmartStartPM/properties"
            quality="auto"
            disabled={isLoading}
            className="w-full"
          />

          {/* Image count display */}
          {propertyImages.length > 0 && (
            <div
              className={cn(
                insetCalloutClass,
                "p-3 text-sm text-muted-foreground"
              )}
            >
              <span className="font-semibold text-foreground">
                {propertyImages.length}
              </span>{" "}
              {t("properties.form.images.count", {
                values: { count: propertyImages.length },
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div
        className={cn(
          "flex flex-col-reverse gap-2 rounded-xl border p-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:p-4",
          isLight
            ? "border-slate-200/55 bg-white/50 shadow-[0_8px_32px_rgba(15,23,42,0.06)]"
            : "border-white/12 bg-white/[0.06]"
        )}
      >
        <Button type="button" variant="outline" className="w-full sm:w-auto">
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-base font-medium text-primary-foreground shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:shadow-none sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.saving")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {mode === "create"
                ? t("properties.form.actions.create")
                : t("properties.form.actions.update")}
            </>
          )}
        </Button>
      </div>

      {/* Enhanced Alert Dialog for Missing Units - Red Error Theme */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent className="max-w-md border-red-200 dark:border-red-800">
          <AlertDialogHeader className="space-y-4">
            <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 ring-4 ring-red-50 dark:ring-red-900/20">
              <Building2 className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-semibold text-red-900 dark:text-red-100">
              {t("properties.form.alert.unitRequired.title")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-center text-base space-y-3 text-muted-foreground">
                <p className="text-gray-700 dark:text-gray-200 font-medium">
                  {t("properties.form.alert.unitRequired.summary")}
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-left">
                  <p className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                    <span className="text-lg">⚠️</span>{" "}
                    {t("properties.form.alert.unitRequired.callout")}
                  </p>
                  <p className="text-red-800 dark:text-red-200 leading-relaxed">
                    {t("properties.form.alert.unitRequired.instructions")}
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              onClick={() => setShowAlert(false)}
              className="bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 shadow-lg hover:shadow-xl transition-all"
            >
              {t("properties.form.alert.unitRequired.cta")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

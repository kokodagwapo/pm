import { PropertyStatus } from "@/types";

type LeanProperty = {
  isMultiUnit?: boolean;
  units?: Array<{ status?: PropertyStatus }>;
  status?: PropertyStatus;
};

/**
 * Unit-level "available" counts and properties where every unit is available
 * (useful for leasing + home-watch style ops).
 */
export function computeOperationsPropertyMetrics(
  properties: LeanProperty[]
): {
  availableUnits: number;
  fullyVacantProperties: number;
} {
  let availableUnits = 0;
  let fullyVacantProperties = 0;

  for (const property of properties) {
    if (property?.isMultiUnit && property.units?.length) {
      for (const unit of property.units) {
        if (unit?.status === PropertyStatus.AVAILABLE) {
          availableUnits += 1;
        }
      }
      const allAvailable = property.units.every(
        (u) => u?.status === PropertyStatus.AVAILABLE
      );
      if (allAvailable) fullyVacantProperties += 1;
    } else {
      if (property.status === PropertyStatus.AVAILABLE) {
        availableUnits += 1;
        fullyVacantProperties += 1;
      }
    }
  }

  return { availableUnits, fullyVacantProperties };
}

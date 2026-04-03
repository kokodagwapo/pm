import type { VacationStayCardProperty } from "@/components/landing/VacationStayCard";

export type StayAvailableUnit = {
  unitId: string;
  unitNumber?: string;
};

/** Suggested stay window when exact search has no results */
export type StayZeroResultHint = {
  suggestedCheckIn: string;
  suggestedCheckOut: string;
  label?: string;
};

/** Property returned from availability search, with optional unit detail */
export type StayResultProperty = VacationStayCardProperty & {
  availableUnits?: StayAvailableUnit[];
};

export type StayAvailabilityApiPayload = {
  properties: StayResultProperty[];
  checkIn: string;
  checkOut: string;
  count: number;
  zeroResultHints?: StayZeroResultHint[];
};

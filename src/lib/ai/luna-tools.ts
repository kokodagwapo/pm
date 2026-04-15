import { UserRole } from "@/types";

export type HeidiAccessRole = UserRole | "guest";

export interface LunaToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  allowedRoles: HeidiAccessRole[];
}

export const LUNA_TOOLS: LunaToolDefinition[] = [
  {
    name: "get_available_properties",
    description: "Search for available vacation rentals in Naples, FL for a specific date range.",
    parameters: {
      type: "object",
      properties: {
        checkIn: { type: "string", description: "Start date in YYYY-MM-DD format" },
        checkOut: { type: "string", description: "End date in YYYY-MM-DD format" },
        bedrooms: { type: "number", description: "Minimum number of bedrooms" },
        neighborhood: { type: "string", description: "Naples neighborhood (e.g., Vanderbilt Beach, Old Naples)" },
      },
      required: ["checkIn", "checkOut"],
    },
    allowedRoles: ["guest", UserRole.TENANT, UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN],
  },
  {
    name: "calculate_total_pricing",
    description: "Calculate the exact total price including rent, taxes, and cleaning fees for a stay.",
    parameters: {
      type: "object",
      properties: {
        propertyId: { type: "string", description: "The ID of the property" },
        unitId: { type: "string", description: "The ID of the specific unit" },
        checkIn: { type: "string", description: "Start date YYYY-MM-DD" },
        checkOut: { type: "string", description: "End date YYYY-MM-DD" },
        couponCode: { type: "string", description: "Optional promo code" },
      },
      required: ["propertyId", "unitId", "checkIn", "checkOut"],
    },
    allowedRoles: ["guest", UserRole.TENANT, UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN],
  },
  {
    name: "create_maintenance_ticket",
    description: "Submit a new maintenance request for a tenant's current property.",
    parameters: {
      type: "object",
      properties: {
        propertyId: { type: "string", description: "The ID of the property" },
        unitId: { type: "string", description: "The ID of the unit" },
        title: { type: "string", description: "Brief title of the issue" },
        description: { type: "string", description: "Detailed description of what's wrong" },
        category: { type: "string", description: "e.g., plumbing, electrical, HVAC" },
        priority: { type: "string", enum: ["low", "medium", "high", "emergency"] },
      },
      required: ["propertyId", "title", "description"],
    },
    allowedRoles: [UserRole.TENANT],
  },
  {
    name: "search_knowledge_base",
    description: "Search the VMS Florida knowledge base for detailed property features, amenities, local area info, and company policies.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Semantic search query" },
      },
      required: ["query"],
    },
    allowedRoles: ["guest", UserRole.TENANT, UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN],
  },
  {
    name: "get_property_insights",
    description: "Fetch deep details about a specific property to provide friendly insights and recommendations. Includes amenities, specific rules, local highlights, and detailed descriptions.",
    parameters: {
      type: "object",
      properties: {
        propertyId: { type: "string", description: "The ID of the property to research" },
      },
      required: ["propertyId"],
    },
    allowedRoles: ["guest", UserRole.TENANT, UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN],
  },
  {
    name: "search_all_listings",
    description: "Search across EVERY property in the entire database, including unavailable, private, or off-market listings. Use this to find properties by name (e.g., 'Woodland'), address, or specific features when they don't show up in public searches.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The name, address, or keyword to search for (e.g., 'Woodland')" },
      },
      required: ["query"],
    },
    allowedRoles: [UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN],
  },
  {
    name: "get_user_profile",
    description: "Fetch the current user's profile information including name, email, and roles.",
    parameters: {
      type: "object",
      properties: {},
    },
    allowedRoles: [UserRole.TENANT, UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN],
  },
  {
    name: "book_property",
    description: "Submit a booking request for a property. This creates a rental request that the property manager will review.",
    parameters: {
      type: "object",
      properties: {
        propertyId: { type: "string", description: "The ID of the property" },
        unitId: { type: "string", description: "The ID of the unit" },
        checkIn: { type: "string", description: "Start date YYYY-MM-DD" },
        checkOut: { type: "string", description: "End date YYYY-MM-DD" },
        message: { type: "string", description: "Optional message for the property manager" },
      },
      required: ["propertyId", "unitId", "checkIn", "checkOut"],
    },
    allowedRoles: [UserRole.TENANT],
  },
  {
    name: "get_calendar_events",
    description: "Read calendar events, appointments, and schedules the current authenticated user is allowed to access.",
    parameters: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date ISO string or YYYY-MM-DD" },
        endDate: { type: "string", description: "End date ISO string or YYYY-MM-DD" },
        propertyId: { type: "string", description: "Optional property ID filter" },
        search: { type: "string", description: "Optional search phrase for event titles or notes" },
      },
    },
    allowedRoles: [UserRole.TENANT, UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN],
  },
  {
    name: "search_faqs",
    description: "Search published FAQs, policies, and operational answers in the app knowledge base.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Question or keyword to search" },
        category: {
          type: "string",
          description: "Optional FAQ category such as payments, maintenance, leasing, owner, tenant, emergency, or policies",
        },
      },
      required: ["search"],
    },
    allowedRoles: ["guest", UserRole.TENANT, UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN],
  },
];

export function getLunaToolsForRole(role: HeidiAccessRole): LunaToolDefinition[] {
  return LUNA_TOOLS.filter((tool) => tool.allowedRoles.includes(role));
}

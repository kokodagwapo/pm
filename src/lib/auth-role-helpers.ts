/**
 * Pure role checks — safe for client bundles. Do not import NextAuth or MongoDB here.
 */
import { UserRole } from "@/types";

export function hasRole(
  userRole: UserRole,
  requiredRoles: UserRole[]
): boolean {
  return requiredRoles.includes(userRole);
}

export function isAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN;
}

export function isOwner(userRole: UserRole): boolean {
  return userRole === UserRole.OWNER;
}

export function canManageProperties(userRole: UserRole): boolean {
  return [UserRole.ADMIN, UserRole.MANAGER].includes(userRole);
}

export function canManageOwnProperties(userRole: UserRole): boolean {
  return [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER].includes(userRole);
}

export function canAccessTenantFeatures(userRole: UserRole): boolean {
  return [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OWNER,
    UserRole.TENANT,
  ].includes(userRole);
}

export function hasCompanyAccess(userRole: UserRole): boolean {
  return [UserRole.ADMIN, UserRole.MANAGER].includes(userRole);
}

export function canManageUsers(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN;
}

export function canViewAllData(userRole: UserRole): boolean {
  return [UserRole.ADMIN, UserRole.MANAGER].includes(userRole);
}

export function canViewPropertyData(userRole: UserRole): boolean {
  return [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER].includes(userRole);
}

export function canManageCalendarEvents(userRole: UserRole): boolean {
  return [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER].includes(userRole);
}

export function canBlockDates(userRole: UserRole): boolean {
  return [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER].includes(userRole);
}

/**
 * SmartStartPM - Property Owner Detail API
 * Get, update, or delete a specific property owner
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withRoleAndDB } from "@/lib/api-utils";
import { User, Property } from "@/models";
import { UserRole } from "@/types";
import bcrypt from "bcryptjs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/owners/[id] - Get a specific property owner
 */
export const GET = withRoleAndDB(
  [UserRole.ADMIN, UserRole.MANAGER]
)(
  async (user: any, request: NextRequest, context: RouteContext) => {
    try {
      const { id } = await context.params;

      const owner = await User.findOne({
        _id: id,
        role: UserRole.OWNER,
      })
        .select("-password")
        .lean();

      if (!owner) {
        return NextResponse.json(
          { success: false, error: "Owner not found" },
          { status: 404 }
        );
      }

      const properties = await Property.find({ ownerId: id })
        .select("name address type units")
        .lean();

      return NextResponse.json({
        success: true,
        data: {
          ...owner,
          properties,
          propertyCount: properties.length,
        },
      });
    } catch (error) {
      console.error("Error fetching owner:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch owner" },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/owners/[id] - Update a property owner
 */
export const PATCH = withRoleAndDB(
  [UserRole.ADMIN]
)(
  async (user: any, request: NextRequest, context: RouteContext) => {
    try {
      const { id } = await context.params;
      const body = await request.json();
      const { firstName, lastName, phone, address, isActive, password } = body;

      const owner = await User.findOne({
        _id: id,
        role: UserRole.OWNER,
      });

      if (!owner) {
        return NextResponse.json(
          { success: false, error: "Owner not found" },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {};

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (isActive !== undefined) updateData.isActive = isActive;

      if (password) {
        updateData.password = await bcrypt.hash(password, 12);
      }

      const updatedOwner = await User.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      )
        .select("-password")
        .lean();

      return NextResponse.json({
        success: true,
        data: updatedOwner,
        message: "Owner updated successfully",
      });
    } catch (error) {
      console.error("Error updating owner:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update owner" },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/owners/[id] - Delete a property owner
 */
export const DELETE = withRoleAndDB(
  [UserRole.ADMIN]
)(
  async (user: any, request: NextRequest, context: RouteContext) => {
    try {
      const { id } = await context.params;

      const owner = await User.findOne({
        _id: id,
        role: UserRole.OWNER,
      });

      if (!owner) {
        return NextResponse.json(
          { success: false, error: "Owner not found" },
          { status: 404 }
        );
      }

      const propertyCount = await Property.countDocuments({ ownerId: id });
      if (propertyCount > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot delete owner with ${propertyCount} assigned properties. Reassign properties first.`,
          },
          { status: 400 }
        );
      }

      await User.findByIdAndDelete(id);

      return NextResponse.json({
        success: true,
        message: "Owner deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting owner:", error);
      return NextResponse.json(
        { success: false, error: "Failed to delete owner" },
        { status: 500 }
      );
    }
  }
);

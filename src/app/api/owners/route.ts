/**
 * SmartStartPM - Property Owners API
 * Manages property owner users
 */

import { NextRequest, NextResponse } from "next/server";
import { withRoleAndDB } from "@/lib/api-utils";
import { User, Property } from "@/models";
import { UserRole } from "@/types";
import bcrypt from "bcryptjs";

/**
 * GET /api/owners - Get all property owners
 */
export const GET = withRoleAndDB(
  [UserRole.ADMIN, UserRole.MANAGER]
)(
  async (user: any, request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "10");
      const search = searchParams.get("search") || "";
      const status = searchParams.get("status");

      const skip = (page - 1) * limit;

      const query: Record<string, unknown> = {
        role: UserRole.OWNER,
        isSystemUser: { $ne: true },
      };

      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ];
      }

      if (status === "active") {
        query.isActive = true;
      } else if (status === "inactive") {
        query.isActive = false;
      }

      const [owners, total] = await Promise.all([
        User.find(query)
          .select("-password")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query),
      ]);

      const ownersWithPropertyCount = await Promise.all(
        owners.map(async (owner) => {
          const propertyCount = await Property.countDocuments({
            ownerId: owner._id,
          });
          return {
            ...owner,
            propertyCount,
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: {
          owners: ownersWithPropertyCount,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching owners:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch owners" },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/owners - Create a new property owner
 */
export const POST = withRoleAndDB(
  [UserRole.ADMIN]
)(
  async (user: any, request: NextRequest) => {
    try {
      const body = await request.json();
      const { email, password, firstName, lastName, phone, address } = body;

      if (!email || !password || !firstName || !lastName) {
        return NextResponse.json(
          { success: false, error: "Missing required fields" },
          { status: 400 }
        );
      }

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: "Email already registered" },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const owner = await User.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        address,
        role: UserRole.OWNER,
        isActive: true,
        emailVerified: new Date(),
      });

      const ownerResponse = owner.toObject();
      delete ownerResponse.password;

      return NextResponse.json({
        success: true,
        data: ownerResponse,
        message: "Property owner created successfully",
      });
    } catch (error) {
      console.error("Error creating owner:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create owner" },
        { status: 500 }
      );
    }
  }
);

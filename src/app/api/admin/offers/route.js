import { NextResponse } from "next/server";
import { authMiddleware } from "../../../../../middlewares/auth";
import _db from "../../../../../utils/db";
import OfferModel from "../../../../../models/Offers/Offer.model";
import notificationHelper from "../../../../../utils/notificationHelper";

// Add Offer
export const POST = authMiddleware(
  async (request) => {
    try {
      await _db();
      const { user } = request;
      const {
        code,
        discountPercentage,
        validFrom,
        validUntil,
        applicableTo,
        courses,
        users,
      } = await request.json();

      // Validate required fields
      if (
        !code ||
        !discountPercentage ||
        !validFrom ||
        !validUntil ||
        !applicableTo
      ) {
        return NextResponse.json(
          { success: false, error: "All required fields must be provided" },
          { status: 400 },
        );
      }

      // Create new offer
      const newOffer = await OfferModel.create({
        code,
        discountPercentage,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        isActive: true,
        applicableTo,
        courses: courses || [],
        users: users || [],
      });

      try {
        await notificationHelper.notifyNewOffer({
          offerCode: code,
          discountPercentage,
          validUntil,
          applicableTo,
        });
      } catch (notifErr) {
        console.error("Notification error:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message: "Offer created successfully",
        data: newOffer,
      });
    } catch (error) {
      console.error("Error creating offer:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["admin"],
);

// Get All Offers
export const GET = authMiddleware(
  async () => {
    try {
      await _db();
      const offers = await OfferModel.find()
        .populate("courses", "courseName")
        .populate("users", "name email");

      return NextResponse.json({
        success: true,
        data: offers,
      });
    } catch (error) {
      console.error("Error fetching offers:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["admin"],
);

// Update Offer
export const PUT = authMiddleware(
  async (request) => {
    try {
      await _db();
      const { id, ...formData } = await request.json();

      if (!id) {
        return NextResponse.json(
          { success: false, error: "Offer ID is required" },
          { status: 400 },
        );
      }

      const updatedOffer = await OfferModel.findByIdAndUpdate(
        id,
        {
          ...formData,
          validFrom: new Date(formData.validFrom),
          validUntil: new Date(formData.validUntil),
        },
        { new: true, runValidators: true },
      );

      if (!updatedOffer) {
        return NextResponse.json(
          { success: false, error: "Offer not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Offer updated successfully",
        data: updatedOffer,
      });
    } catch (error) {
      console.error("Error updating offer:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["admin"],
);

// Delete Offer
export const DELETE = authMiddleware(
  async (request) => {
    try {
      await _db();
      const { id } = await request.json();

      if (!id) {
        return NextResponse.json(
          { success: false, error: "Offer ID is required" },
          { status: 400 },
        );
      }

      const deletedOffer = await OfferModel.findByIdAndDelete(id);

      if (!deletedOffer) {
        return NextResponse.json(
          { success: false, error: "Offer not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Offer deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting offer:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Internal server error" },
        { status: 500 },
      );
    }
  },
  ["admin"],
);

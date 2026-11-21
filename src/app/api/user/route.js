import { NextResponse } from "next/server";
import _db from "../../../../utils/db";
import { authMiddleware } from "../../../../middlewares/auth";
import UserModel from "../../../../models/User.model";
import bcrypt from "bcryptjs";

export const GET = authMiddleware(async (req) => {
  try {
    await _db();
    const { user } = req;

    if (!user) {
      return NextResponse.json(
        { error: "User is not authenticated" },
        { status: 401 },
      );
    }

    let userData = user;
    if (user.role === "user" && user._id) {
      const dbUser = await UserModel.findById(user._id).lean();
      if (dbUser) {
        const { password, ...safeUser } = dbUser;
        userData = { ...safeUser, role: user.role };
      }
    }

    return NextResponse.json({ success: true, data: userData });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}, ["user", "admin"]);

export const PUT = authMiddleware(async (req) => {
  try {
    await _db();
    const { user } = req;
    const { id, name, email, mobile } = await req.json();

    // Convert both IDs to strings for comparison
    const requestedUserId = id?.toString();
    const loggedInUserId = user?._id?.toString();

    // If the request is from a normal user, they can only update their own profile
    if (!user.isAdmin && loggedInUserId !== requestedUserId) {
      return NextResponse.json(
        { error: "Unauthorized to update this user", success: false },
        { status: 403 }
      );
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { name, email, mobile, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found", success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error", success: false },
      { status: 500 }
    );
  }
}, ["user"]);

export const DELETE = authMiddleware(async (req) => {
  try {
    await _db();
    const { user } = req;
    const { email, password } = await req.json();

    // Find the user by email
    const foundUser = await UserModel.findOne({ email });

    if (!foundUser) {
      return NextResponse.json(
        { error: "User not found", success: false },
        { status: 404 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, foundUser.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Incorrect password",
        },
        { status: 400 }
      );
    }

    // Check if the user is trying to delete their own account
    if (user._id.toString() !== foundUser._id.toString()) {
      return NextResponse.json(
        { error: "Unauthorized to delete this user", success: false },
        { status: 403 }
      );
    }

    // Delete the user
    const deletedUser = await UserModel.findByIdAndDelete(foundUser._id);

    if (!deletedUser) {
      return NextResponse.json(
        { error: "User not found", success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error", success: false },
      { status: 500 }
    );
  }
}, ["user"]);

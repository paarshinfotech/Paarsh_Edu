import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import generateTokens from "../../../../../utils/generateTokens";
import AdminModel from "../../../../../models/Admin.model";
import AgentModel from "../../../../../models/Agent.model";
import validator from "validator";
import _db from "../../../../../utils/db";

export async function POST(request) {
  try {
    await _db();
    const { email, password } = await request.json();

    if (!validator.isEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 },
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 },
      );
    }

    // First try to find Admin
    let user = await AdminModel.findOne({ email });
    let role = "admin";
    let redirectTo = "/admin";

    if (!user) {
      // Try to find Agent
      user = await AgentModel.findOne({ email });
      role = "agent";
      redirectTo = "/agent";
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({
        success: false,
        error: "Invalid credentials",
      }, { status: 401 });
    }

    const { accessToken, refreshToken } = generateTokens(user._id, role);

    const { password: _, ...userData } = user.toObject();

    return NextResponse.json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        refreshToken,
        role,
        user: userData,
        redirectTo,
      },
    });
  } catch (error) {
    console.error("Error in login:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}

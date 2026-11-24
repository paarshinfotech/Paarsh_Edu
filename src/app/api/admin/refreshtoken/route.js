import { NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { JWT_REFRESH_SECRET } from "../../../../../config/config";
import AdminModel from "../../../../../models/Admin.model";
import AgentModel from "../../../../../models/Agent.model";
import generateTokens from "../../../../../utils/generateTokens";
import _db from "../../../../../utils/db";

export async function POST(request) {
  try {
    await _db();
    const { refreshToken } = await request.json();

    if (!refreshToken || refreshToken === "undefined" || refreshToken === "null") {
      return NextResponse.json(
        { success: false, error: "Refresh token required", forceLogout: true },
        { status: 401 }
      );
    }

    try {
      const decoded = verify(refreshToken, JWT_REFRESH_SECRET);

      let user = await AdminModel.findById(decoded.userId);
      let role = "admin";

      if (!user) {
        user = await AgentModel.findById(decoded.userId);
        role = "agent";
      }

      if (!user) {
        return NextResponse.json(
          { success: false, error: "Admin/Agent not found", forceLogout: true },
          { status: 404 }
        );
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(
        user._id,
        role
      );

      return NextResponse.json({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken,
          admin_access_token: accessToken,
          admin_refresh_token: newRefreshToken,
        },
      });
    } catch (jwtError) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired refresh token", forceLogout: true },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error refreshing admin token:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", forceLogout: true },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import _db from "../../../../utils/db";
import VisitorModel from "../../../../models/Visitor.model";

export async function POST(request) {
  try {
    await _db();
    const body = await request.json();
    const { sessionId, userId, deviceId, ipAddress, pageUrl, duration, userAgent, referrer } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "Session ID is required" },
        { status: 400 }
      );
    }

    const validUserId = userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null;
    const clientIp = ipAddress || request.headers.get("x-forwarded-for") || "unknown";

    const visitor = await VisitorModel.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          userId: validUserId,
          deviceId: deviceId || null,
          ipAddress: clientIp,
          pageUrl: pageUrl || "/",
          duration: Number(duration) || 0,
          userAgent: userAgent || "",
          referrer: referrer || "Direct",
          visitTime: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return NextResponse.json({
      success: true,
      data: visitor,
    });
  } catch (error) {
    console.error("Error in /api/visitors POST:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await _db();
    const visitors = await VisitorModel.find()
      .populate("userId", "name email")
      .sort({ visitTime: -1 });

    return NextResponse.json({
      success: true,
      data: visitors,
    });
  } catch (error) {
    console.error("Error in /api/visitors GET:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}

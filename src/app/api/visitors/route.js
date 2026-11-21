import { NextResponse } from "next/server";
import VisitorModel from "../../../../models/Visitor.model";
import _db from "../../../../utils/db";
import mongoose from "mongoose";

export async function POST(request) {
  try {
    await _db();
    const body = await request.json();
    const { sessionId, userId, deviceId, ipAddress, pageUrl, duration, userAgent, referrer } = body;

    const validUserId = (userId && mongoose.Types.ObjectId.isValid(userId)) ? userId : null;

    const visitor = await VisitorModel.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          userId: validUserId,
          deviceId: deviceId || null,
          ipAddress,
          pageUrl,
          duration: duration || 0,
          userAgent,
          referrer,
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
    return NextResponse.json({
      success: false,
      message: error.message,
    }, { status: 500 });
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
    return NextResponse.json({
      success: false,
      message: error.message,
    }, { status: 500 });
  }
}

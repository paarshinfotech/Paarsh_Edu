import { NextResponse } from "next/server";
import JobApplicationModel from "../../../../models/JobApplication/JobApplication.model";
import _db from "../../../../utils/db";
import notificationHelper from "../../../../utils/notificationHelper";

export async function POST(req) {
  try {
    await _db();
    const { fullName, email, phoneNumber, desiredRole, portfolioUrl, resume, coverLetter } = await req.json();

    try {
      const application = new JobApplicationModel({
        fullName,
        email,
        phoneNumber,
        desiredRole,
        portfolioUrl,
        resume,
        coverLetter,
      });

      await application.save();

      // Trigger admin notification
      try {
        await notificationHelper.notifyJobApplication({
          userId: null,
          userName: fullName,
          position: desiredRole,
          applicationId: application._id,
        });
      } catch (notifErr) {
        console.error("Notification error:", notifErr);
      }

      return NextResponse.json({ message: "Application submitted successfully" }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { error: "Error submitting application", details: error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error submitting Application:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// Get All Job Applications
export async function GET() {
  try {
    await _db();
    const applications = await JobApplicationModel.find();
    return NextResponse.json({ success: true, data: applications });
  } catch (error) {
    console.error("Error fetching job applications:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}

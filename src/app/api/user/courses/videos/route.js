import { NextResponse } from "next/server";
import { authMiddleware } from "../../../../../../middlewares/auth";
import _db from "../../../../../../utils/db";
import mongoose from "mongoose";
import UserModel from "models/User.model";
import CourseModel from "models/Courses/Course.model";
import CourseVideoModel from "models/Courses/CouresVideo.model";

export const GET = authMiddleware(async (req) => {
  try {
    await _db();

    const { user } = req;

    if (!user) {
      return NextResponse.json(
        { error: "User is not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    const isAdmin = user.role === "admin";

    if (!isAdmin) {
      // Await user data from DB
      const userData = await UserModel.findById(user._id).select("purchasedCourses");

      if (!userData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const purchasedCourses = userData.purchasedCourses || [];
      const purchasedEntry = purchasedCourses.find((entry) => {
        if (!entry) return false;
        const c = entry.course;
        if (!c) return false;
        const idStr = c._id ? c._id.toString() : c.toString ? c.toString() : String(c);
        return idStr === courseId;
      });

      if (!purchasedEntry) {
        return NextResponse.json(
          { error: "You have not purchased this course" },
          { status: 403 }
        );
      }

      if (purchasedEntry.isExpired) {
        return NextResponse.json(
          { error: "Course access has expired" },
          { status: 403 }
        );
      }
    }

    // Fetch course videos
    let courseVideos = await CourseVideoModel.findOne({ courseId }).populate("courseId");
    if (!courseVideos && mongoose.Types.ObjectId.isValid(courseId)) {
      courseVideos = await CourseVideoModel.findOne({
        courseId: new mongoose.Types.ObjectId(courseId),
      }).populate("courseId");
    }

    if (!courseVideos) {
      return NextResponse.json({ success: false, data: null }, { status: 200 });
    }

    return NextResponse.json(
      { success: true, data: courseVideos },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching course videos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, ["user", "admin"]);

import { NextResponse } from "next/server";
import UserModel from "../../../../../models/User.model";
import CourseVideoModel from "../../../../../models/Courses/CouresVideo.model";
import { authMiddleware } from "../../../../../middlewares/auth";
import _db from "../../../../../utils/db";
import CourseModel from "../../../../../models/Courses/Course.model";
import mongoose from "mongoose";

// Helper function to convert buffer to ObjectId
function bufferToObjectId(buffer) {
  if (!buffer || !buffer.data) return null;
  try {
    const bufferObj = Buffer.from(buffer.data || buffer);
    return new mongoose.Types.ObjectId(bufferObj);
  } catch (error) {
    console.error("Error converting buffer to ObjectId:", error);
    return null;
  }
}

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

    // Fetch user details without population first
    const existingUser = await UserModel.findById(user._id);
    
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Extract course IDs from the user's purchasedCourses
    const courseIds = [];
    const purchasedCoursesWithIds = [];

    (existingUser.purchasedCourses || []).forEach((course) => {
      let courseId = null;
      const rawCourse = course.course;
      
      // Check if course field exists and is valid
      if (rawCourse) {
        if (typeof rawCourse === 'object' && rawCourse.data) {
          courseId = bufferToObjectId(rawCourse);
        } else if (rawCourse._id) {
          courseId = new mongoose.Types.ObjectId(rawCourse._id.toString());
        } else if (mongoose.Types.ObjectId.isValid(rawCourse.toString())) {
          courseId = new mongoose.Types.ObjectId(rawCourse.toString());
        }
      }

      if (courseId) {
        courseIds.push(courseId);
        const courseObj = typeof course.toObject === 'function' ? course.toObject() : course;
        purchasedCoursesWithIds.push({
          ...courseObj,
          courseId: courseId
        });
      }
    });

    // Fetch the actual courses using the extracted IDs
    const courses = await CourseModel.find({
      _id: { $in: courseIds }
    }).lean();

    // Create a map for quick lookup
    const courseMap = {};
    courses.forEach(course => {
      courseMap[course._id.toString()] = course;
    });

    // Reconstruct the user object with populated courses
    const populatedUser = typeof existingUser.toObject === 'function' ? existingUser.toObject() : { ...existingUser };
    populatedUser.purchasedCourses = purchasedCoursesWithIds.map(purchasedCourse => {
      const courseDetails = courseMap[purchasedCourse.courseId.toString()] || 
        (purchasedCourse.course && purchasedCourse.course.courseName ? purchasedCourse.course : null);
      return {
        ...purchasedCourse,
        course: courseDetails || null
      };
    }).filter(item => item.course !== null);

    return NextResponse.json({ 
      success: true, 
      data: populatedUser 
    });
  } catch (error) {
    console.error("Error fetching user courses:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}, ["user"]);

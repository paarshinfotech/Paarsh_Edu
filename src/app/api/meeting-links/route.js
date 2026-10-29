import { NextResponse } from "next/server";
import _db from "../../../../utils/db";
import MeetingLink from "../../../../models/MeetingLink.model";
import { authMiddleware } from "../../../../middlewares/auth";

// GET all meeting links
export const GET = authMiddleware(async (req) => {
  try {
    await _db();
    
    // Extract query parameters for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const sortField = searchParams.get("sortField");
    const sortOrder = searchParams.get("sortOrder") || "asc";
    
    // Build query
    const query = { isDeleted: false };
    
    // Add status filter if provided
    if (status && ["upcoming", "past", "cancelled"].includes(status)) {
      query.status = status;
    }
    
    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { instructor: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort options
    const sortOptions = {};
    if (sortField) {
      sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;
    } else {
      sortOptions["status"] = 1;
      sortOptions["date"] = 1;
    }
    
    // Fetch meeting links with pagination
    const meetingLinks = await MeetingLink.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    // Count total documents for pagination
    const totalItems = await MeetingLink.countDocuments(query);
    
    // Get statistics for dashboard
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const upcomingCount = await MeetingLink.countDocuments({
      isDeleted: false,
      status: "upcoming",
    });
    
    const recordingsCount = await MeetingLink.countDocuments({
      isDeleted: false,
      status: "past",
      recording: { $exists: true, $ne: null, $ne: "" },
    });
    
    const newMeetingsLastWeek = await MeetingLink.countDocuments({
      isDeleted: false,
      createdAt: { $gte: lastWeek },
    });
    
    const twoWeeksAgo = new Date(lastWeek);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);
    const prevWeekMeetings = await MeetingLink.countDocuments({
      isDeleted: false,
      createdAt: { $gte: twoWeeksAgo, $lt: lastWeek },
    });
    
    const newUpcomingLastWeek = await MeetingLink.countDocuments({
      isDeleted: false,
      status: "upcoming",
      createdAt: { $gte: lastWeek },
    });
    
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const newRecordingsLastMonth = await MeetingLink.countDocuments({
      isDeleted: false,
      status: "past",
      recording: { $exists: true, $ne: null, $ne: "" },
      "recording.createdAt": { $gte: lastMonth },
    });
    
    // Update status based on date automatically before sending response
    const updatedLinks = await Promise.all(meetingLinks.map(async link => {
      const meetingDate = new Date(link.date);
      const now = new Date();
      
      if (link.status !== "cancelled" && meetingDate < now && link.status !== "past") {
        link.status = "past";
        await link.save();
      }
      
      return link;
    }));
    
    return NextResponse.json({
      success: true,
      message: "Meeting links fetched successfully",
      data: {
        meetings: updatedLinks,
        pagination: {
          totalItems,
          page,
          limit,
          totalPages: Math.ceil(totalItems / limit)
        },
        stats: {
          total: totalItems,
          upcoming: upcomingCount,
          recordings: recordingsCount,
          growth: {
            total: newMeetingsLastWeek - prevWeekMeetings,
            upcoming: newUpcomingLastWeek,
            recordings: newRecordingsLastMonth
          }
        }
      }
    });
  } catch (error) {
    console.error("Error fetching meeting links:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}, ["admin", "user"]);

// POST create a new meeting link (admin only)
export const POST = authMiddleware(async (req) => {
  try {
    await _db();
    const { user } = req;
    
    if (!user.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    
    const requiredFields = ["title", "description", "date", "time", "link", "platform", "instructor"];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }
    
    const meetingLink = new MeetingLink({
      ...body,
      createdBy: user._id,
    });
    
    await meetingLink.save();
    
    return NextResponse.json({
      success: true,
      message: "Meeting link created successfully",
      data: meetingLink
    });
  } catch (error) {
    console.error("Error creating meeting link:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}, ["admin"]);

// DELETE all meeting links (admin only)
export const DELETE = authMiddleware(async (req) => {
  try {
    await _db();
    const { user } = req;
    
    if (!user.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const confirmation = searchParams.get("confirm");
    
    if (confirmation !== "CONFIRM_DELETE_ALL") {
      return NextResponse.json(
        { success: false, error: "This operation requires explicit confirmation" },
        { status: 400 }
      );
    }
    
    await MeetingLink.updateMany({}, { isDeleted: true });
    
    return NextResponse.json({
      success: true,
      message: "All meeting links have been soft-deleted",
      data: null
    });
  } catch (error) {
    console.error("Error deleting all meeting links:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}, ["admin"]);

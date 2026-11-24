import { NextResponse } from "next/server";
import CollegeModel from "../../../../../../../models/AptitudeTest/College.model";
import TestModel from "../../../../../../../models/AptitudeTest/Test.model";
import _db from "../../../../../../../utils/db";
import { authMiddleware } from "../../../../../../../middlewares/auth";
import { generateTestLink } from "../../../../../../../utils/AptitudeTest/generateTestLink";
import { BASE_URL } from "config/config";
import TestSessionModel from "../../../../../../../models/AptitudeTest/TestSession.model";

export const POST = authMiddleware(
  async function (request) {
    try {
      await _db();
      const { collegeId, batchName, testDuration, testSettings, hasExpiry, startTime, endTime } = await request.json();

      if (
        !testDuration ||
        !batchName ||
        !testSettings.questionsPerTest ||
        !testSettings.passingScore
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Test duration, questions per test, and passing score are required",
          },
          { status: 400 },
        );
      }

      // If hasExpiry is true, validate startTime and endTime
      let parsedStartTime = null;
      let parsedEndTime = null;
      if (hasExpiry) {
        if (!startTime || !endTime) {
          return NextResponse.json(
            {
              success: false,
              message: "Start time and end time are required when test expiry is enabled",
            },
            { status: 400 },
          );
        }

        parsedStartTime = new Date(startTime);
        parsedEndTime = new Date(endTime);

        if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
          return NextResponse.json(
            { success: false, message: "Invalid start time or end time format" },
            { status: 400 },
          );
        }

        if (parsedEndTime <= parsedStartTime) {
          return NextResponse.json(
            { success: false, message: "End time must be after start time" },
            { status: 400 },
          );
        }

        const durationMs = parseInt(testDuration) * 60 * 1000;
        if (parsedEndTime.getTime() - parsedStartTime.getTime() < durationMs) {
          return NextResponse.json(
            {
              success: false,
              message: `End time must allow at least ${testDuration} minutes duration from start time`,
            },
            { status: 400 },
          );
        }
      }

      const college = await CollegeModel.findById(collegeId);
      if (!college) {
        return NextResponse.json(
          { success: false, message: "College not found" },
          { status: 404 },
        );
      }

      const testId = generateTestLink();
      const test = new TestModel({
        testId,
        batchName,
        college: collegeId,
        testDuration,
        testSettings,
        hasExpiry: Boolean(hasExpiry),
        startTime: parsedStartTime,
        endTime: parsedEndTime,
      });
      await test.save();

      college.testIds.push(testId);
      college.testLink = `${BASE_URL}/aptitude-test?testId=${testId}&collegeId=${collegeId}&batchName=${batchName}`;
      await college.save();

      return NextResponse.json({
        success: true,
        message: "Test created successfully",
        data: {
          testId,
          testLink: `/aptitude-test?testId=${testId}&collegeId=${collegeId}&batchName=${batchName}`,
        },
      });
    } catch (error) {
      console.error("Test creation error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }
  },
  ["admin"],
);

export const GET = authMiddleware(
  async function (request) {
    try {
      await _db();
      const { searchParams } = new URL(request.url);
      const collegeId = searchParams.get("collegeId");
      const tests = await TestModel.find().lean().exec();
      return NextResponse.json({
        success: true,
        message: "Tests fetched successfully",
        data: tests.map((test) => ({
          ...test,
          testLink: `${BASE_URL}/aptitude-test?testId=${test.testId}&collegeId=${test.college}&batchName=${test.batchName}`,
        })),
      });
    } catch (error) {
      console.error("Fetch tests error:", error);
      return NextResponse.json(
        { success: false, message: "Something went wrong" },
        { status: 500 },
      );
    }
  },
  ["admin"],
);

export const DELETE = authMiddleware(
  async function (request) {
    try {
      await _db();
      const { searchParams } = new URL(request.url);
      const testId = searchParams.get("testId");
      const collegeId = searchParams.get("collegeId");

      if (!testId || !collegeId) {
        return NextResponse.json(
          { success: false, message: "Test ID and college ID are required" },
          { status: 400 }
        );
      }

      // Find and delete the test
      const test = await TestModel.findOneAndDelete({ testId, college: collegeId });
      if (!test) {
        return NextResponse.json(
          { success: false, message: "Test not found" },
          { status: 404 }
        );
      }

      // Remove test ID from college
      await CollegeModel.findByIdAndUpdate(
        collegeId,
        { $pull: { testIds: testId } }
      );

      // Delete associated test sessions
      await TestSessionModel.deleteMany({ testId, college: collegeId });

      return NextResponse.json({
        success: true,
        message: "Test and associated sessions deleted successfully"
      });
    } catch (error) {
      console.error("Delete test error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
  },
  ["admin"]
);

export const PUT = authMiddleware(
  async function (request) {
    try {
      await _db();
      const {
        testId,
        collegeId,
        batchName,
        testDuration,
        testSettings,
        hasExpiry,
        startTime,
        endTime,
      } = await request.json();

      if (!testId || !collegeId) {
        return NextResponse.json(
          { success: false, message: "Test ID and College ID are required" },
          { status: 400 }
        );
      }

      const test = await TestModel.findOne({ testId, college: collegeId });
      if (!test) {
        return NextResponse.json(
          { success: false, message: "Test not found" },
          { status: 404 }
        );
      }

      if (batchName) test.batchName = batchName;
      if (testDuration) test.testDuration = parseInt(testDuration);

      if (testSettings) {
        if (!test.testSettings) test.testSettings = {};
        if (testSettings.questionsPerTest !== undefined) {
          test.testSettings.questionsPerTest = parseInt(testSettings.questionsPerTest);
        }
        if (testSettings.passingScore !== undefined) {
          test.testSettings.passingScore = parseInt(testSettings.passingScore);
        }
        if (testSettings.allowRetake !== undefined) {
          test.testSettings.allowRetake = Boolean(testSettings.allowRetake);
        }
      }

      if (hasExpiry !== undefined) {
        test.hasExpiry = Boolean(hasExpiry);
        if (test.hasExpiry) {
          if (!startTime || !endTime) {
            return NextResponse.json(
              { success: false, message: "Start time and end time are required when test expiry is enabled" },
              { status: 400 }
            );
          }
          const parsedStart = new Date(startTime);
          const parsedEnd = new Date(endTime);
          if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
            return NextResponse.json(
              { success: false, message: "Invalid start time or end time format" },
              { status: 400 }
            );
          }
          if (parsedEnd <= parsedStart) {
            return NextResponse.json(
              { success: false, message: "End time must be after start time" },
              { status: 400 }
            );
          }
          const durationMinutes = test.testDuration || parseInt(testDuration) || 0;
          if (parsedEnd.getTime() - parsedStart.getTime() < durationMinutes * 60 * 1000) {
            return NextResponse.json(
              { success: false, message: `End time must allow at least ${durationMinutes} minutes duration from start time` },
              { status: 400 }
            );
          }
          test.startTime = parsedStart;
          test.endTime = parsedEnd;
        } else {
          test.startTime = null;
          test.endTime = null;
        }
      }

      await test.save();

      return NextResponse.json({
        success: true,
        message: "Test updated successfully",
        data: test,
      });
    } catch (error) {
      console.error("Update test error:", error);
      return NextResponse.json(
        { success: false, message: error.message || "Failed to update test" },
        { status: 500 }
      );
    }
  },
  ["admin"]
);

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import UserModel from "../../../../../models/User.model";
import _db from "../../../../../utils/db";
import validator from "validator";
import generateTokens from "../../../../../utils/generateTokens";
import notificationHelper from '../../../../../utils/notificationHelper';

// Function to generate a unique referral code
const generateReferralCode = async (name) => {
  const initials = name.slice(0, 3).toUpperCase();
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  let referralCode = `${initials}${randomNumber}`;

  // Ensure the referral code is unique
  while (await UserModel.findOne({ refferalCode: referralCode })) {
    referralCode = `${initials}${Math.floor(1000 + Math.random() * 9000)}`;
  }

  return referralCode;
};

export async function POST(request) {
  try {
    await _db();
    const { name, email, password, mobile, refferalCode, acceptTerms } =
      await request.json();

    // Validate input
    if (!name || !email || !mobile || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "name, Email, Phone and password are required",
        },
        { status: 400 },
      );
    }

    if (!validator.isEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email address",
        },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({
      $or: [{ email }, { mobile }],
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User with this email or mobile already exists",
        },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate referral code
    const newReferralCode = await generateReferralCode(name);

    let referredByUser = null;

    if (refferalCode) {
      referredByUser = await UserModel.findOne({
        refferalCode: refferalCode.toUpperCase(),
      });
    }

    // Create user
    const newUser = new UserModel({
      name,
      email,
      password: hashedPassword,
      mobile,
      refferalCode: newReferralCode,
      referredBy: referredByUser ? referredByUser._id : null,
      acceptTerms,
    });

    await newUser.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser._id, "user");

    // Send notification
    try {
      await notificationHelper.notifyUserRegistration({
        userName: newUser.name,
        userId: newUser._id,
        userEmail: newUser.email,
      });
    } catch (notifErr) {
      console.error("Notification error:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: "User registered successfully",
      data: {
        accessToken,
        refreshToken,
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          mobile: newUser.mobile,
          refferalCode: newUser.refferalCode,
        },
      },
    });
  } catch (error) {
    console.error("Error in registration:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}

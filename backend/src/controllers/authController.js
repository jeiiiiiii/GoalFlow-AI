import User from "../models/User.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendPasswordResetEmail } from "../config/email.js";
import { validatePassword } from "../utils/validatePassword.js";

//Get
export async function registerUser(req, res) {
    try {
        const {name, email, password} = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({email});
        if (existingUser) {
            return res.status(400).json({message: "User already exists"});
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                message: "Password does not meet requirements",
                errors: passwordValidation.errors
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const newUser = new User({
        name,
        email,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationTokenExpires,
        isEmailVerified: false,
        });
        const savedUser = await newUser.save();

        res.status(201).json({message: "User registered successfully", userId: savedUser._id, verificationToken: verificationToken});
    } catch (error) {
        console.error("Error in registerUser controller", error);
        res.status(500).json({message: "Internal server error"});
    }
}

//Post
//Post
export async function loginUser(req, res) {
    try {
        const {email, password} = req.body;

        const user = await User.findOne({email});
        if (!user) {
            return res.status(400).json({message: "Invalid email or password"});
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({message: "Invalid email or password"});
        }

        // Check if email is verified
        if (!user.isVerified) {
            return res.status(403).json({message: "Please verify your email first"});
        }

        // Generate JWT token
        const token = jwt.sign(
            {userId: user._id},
            process.env.JWT_SECRET,
            {expiresIn: "7d"}
        );

        res.status(200).json({
            message: "Login successful",
            token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Error in loginUser controller", error);
        res.status(500).json({message: "Internal server error"});
    }
}

//Get
export async function verifyEmail (req, res) {
    try {
        const {token} = req.params;

        // Find user by verification token
        const user = await User.findOne({
            emailVerificationToken: token, 
            emailVerificationExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({message: "Invalid or expired verification link"});
        }

        // Mark as verified and clear the token
        user.isVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.status(200).json({message: "Email verified successfully"});
    } catch (error) {
        console.error("Error in verifyEmail controller", error);
        res.status(500).json({message: "Internal server error"});
    }
}

//Post

export async function forgotPassword(req, res) {
    try {
        const {email} = req.body;

        const user = await User.findOne({email});
        if (!user) {
            return res.status(400).json({message: "User with this email does not exist"});
        }

        const resetToken = crypto.randomBytes(32).toString("hex");

        const hashedResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        // Token expires in 1 hour
        user.resetPasswordToken = hashedResetToken;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;

        await user.save();

        // Send reset email (send RAW token)
        await sendPasswordResetEmail(user.email, resetToken);

        res.status(200).json
        ({message: "Password reset link has been sent to your email", resetToken: resetToken });
        } catch (error) {
            console.error("Error in forgotPassword controller", error);
            res.status(500).json({message: "Internal server error"});
        }
}

export async function resetPassword(req, res) {
    try {
        const {token} = req.params;
        const {password} = req.body;

        // Hash the token to match what's stored in DB
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        // Find user with this token and check if not expired
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({message: "Invalid or expired password reset link"});
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                message: "Password does not meet requirements",
                errors: passwordValidation.errors
            });
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        
        // Clear reset token fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        await user.save();

        res.status(200).json({message: "Password has been reset successfully"});
    } catch (error) {
        console.error("Error in resetPassword controller", error);
        res.status(500).json({message: "Internal server error"});
    }
}

export async function getUserProfile(req, res) {
    try {
        const {userId} = req.params;

        const user = await User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }

        res.status(200).json({user});
    } catch (error) {
        console.error("Error in getUserProfile controller", error);
        res.status(500).json({message: "Internal server error"});
    }
}

export async function getMe(req, res) {
    try {
    res.status(200).json({
        user: req.user,
    });
    } catch (error) {
    console.error("Error in getMe controller", error);
    res.status(500).json({ message: "Internal server error" });
    }
}


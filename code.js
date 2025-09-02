const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// 1. Connect to MongoDB
mongoose.connect("mongodb+srv://waarilibrary_db_user:95M0i4maJZVwsy6T@cluster01.so12ngi.mongodb.net/");

// 2. Define User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  premium: { type: Boolean, default: false , required: true }  // add this
});

const User = mongoose.model("User", userSchema);

// 3. Signup Route
app.post("/signup", async (req, res) => {
  try {
    console.log("Signup hit");
    const { username, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save new user
    const newUser = new User({ username, password: hashedPassword, premium:false });
    await newUser.save();

    return res.status(201).json({ success: true, message: "Signup successful" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Error signing up" });
  }
});

// 4. Login Route
app.post("/login", async (req, res) => {
  try {
    console.log("Login hit");
    const { username , password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid password" });
    }

    return res.json({ success: true, message: "Login successful", premium: user.premium});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Error logging in" });
  }
});
// Change Username & Password
app.post("/change-credentials", async (req, res) => {
  try {
    const { userId, currentPassword, newUsername, newPassword } = req.body;

    // Find user by ID
    const user = await User.findOne({ username: userId }); // FIXED here
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    // Update username if provided
    if (newUsername) {
      user.username = newUsername;
    }

    // Update password if provided
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    return res.json({ success: true, message: "Credentials updated successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});
// 5. Start server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

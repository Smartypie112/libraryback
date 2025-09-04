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
  premium: { type: Boolean, default: false, required: true },
  date: { type: Date, default: null } // <-- lowercase
});

const User = mongoose.model("User", userSchema);
// Notification Schema
const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },     // notification title
  message: { type: String, required: true },   // notification body
  createdAt: { type: Date, default: Date.now } // auto timestamp
});

const Notification = mongoose.model("Notification", notificationSchema, "Notifications");
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
// 5. Seats load
const seatSchema = new mongoose.Schema({}, { strict: false });
const Seat = mongoose.model("Seat", seatSchema, "Seats");

// API endpoint to get seat layout
app.get("/api/layout", async (req, res) => {
  try {
    const seat = await Seat.findOne(); // fetch one doc
    if (!seat) return res.json({ layout: "" });
    res.json({ layout: seat.layout || seat.value || "" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// 6. Save layout
app.post("/save-layout", async (req, res) => {
  try {
    const { layout } = req.body;
    if (!layout) {
      return res.status(400).json({ success: false, message: "No layout provided" });
    }

    // update if exists, otherwise insert
    const updated = await Seat.findOneAndUpdate(
      {}, // match first doc
      { layout }, // new layout
      { upsert: true, new: true } // create if not exists
    );

    console.log("✅ Layout saved/updated in DB");
    res.json({ success: true, message: "Layout saved successfully!", layout: updated.layout });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error saving layout" });
  }
});
//7. Save notification
app.post("/api/notifications", async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message are required" });
    }

    const newNotification = new Notification({ title, message });
    await newNotification.save();

    return res.status(201).json({ success: true, message: "Notification stored successfully" });
  } catch (err) {
    console.error("Error saving notification:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});
//8. Get all notifications
app.get("/api/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }); // newest first
    return res.json({ success: true, notifications });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});
// Get all users (username + premium only)
// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "username premium date"); // lowercase date
    return res.json({ success: true, users });
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Toggle premium status
app.put("/api/users/:id/toggle-premium", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.premium) {
  user.premium = false;
  user.date = null;
} else {
  user.premium = true;
  user.date = new Date();
}

    await user.save();
    res.json({ success: true, premium: user.premium, Date: user.Date });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// Utility function to check months difference
function isOneMonthOrMore(oldDate) {
  const now = new Date();
  const diffMs = now - oldDate; // milliseconds difference
  const diffDays = diffMs / (1000 * 60 * 60 * 24); // convert to days
  return diffDays > 31; // treat 30 days as ~1 month
}

// Background job: runs every 12 hours
setInterval(async () => {
  try {
    console.log("⏳ Running premium check job...");

    const users = await User.find({ date: { $ne: null } }); // users with a date
    for (const user of users) {
      if (isOneMonthOrMore(user.date)) {
        user.premium = false;
        user.date = null;
        await user.save();
        console.log(`🔻 Premium expired for user: ${user.username}`);
      }
    }

    console.log("✅ Premium check job completed");
  } catch (err) {
    console.error("❌ Error in premium check job:", err);
  }
}, 1000 * 60 * 60 * 12); // every 12 hours
// 9. Start server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

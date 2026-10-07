require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Moderator = require("../models/Moderator");

const createModerator = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const hashedPassword = await bcrypt.hash("Whistle@Amritesh#2026!", 10);

        await Moderator.create({
            username: "admin",
            password: hashedPassword
        });

        console.log("Moderator created successfully");
        process.exit();
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
};

createModerator();
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Moderator = require("../models/Moderator");

const createModerator = async () => {
    try {
        const password = process.env.MODERATOR_PASSWORD;
        if (!password) {
            console.error("FATAL ERROR: MODERATOR_PASSWORD environment variable is missing.");
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGO_URI);

        const hashedPassword = await bcrypt.hash(password, 10);

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
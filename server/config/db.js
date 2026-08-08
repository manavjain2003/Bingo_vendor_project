const mongoose = require("mongoose");

const connectDB = async (uri) => {
  try {
    await mongoose.connect(uri);
    console.log("Database connected");
  } catch (error) {
    console.log("Database connection failed");
    console.log(error.message);
  }
};

module.exports = connectDB;
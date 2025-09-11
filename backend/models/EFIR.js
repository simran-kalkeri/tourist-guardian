const mongoose = require("mongoose")

const EFIRSchema = new mongoose.Schema(
  {
    efirNumber: { type: String, unique: true, index: true },
    touristId: { type: Number, required: true, index: true },
    touristName: { type: String, required: true },
    incidentType: { type: String, required: true },
    description: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    lastKnownLocation: {
      latitude: Number,
      longitude: Number,
      timestamp: String,
    },
    status: { type: String, enum: ["pending", "in_progress", "resolved", "closed"], default: "pending" },
    assignedStationId: { type: mongoose.Schema.Types.ObjectId, ref: "PoliceStation" },
    assignedStationName: String,
    generatedBy: String,
  },
  { timestamps: true }
)

module.exports = mongoose.models.EFIR || mongoose.model("EFIR", EFIRSchema)



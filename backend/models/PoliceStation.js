const mongoose = require("mongoose")

const PoliceStationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    state: { type: String },
    district: { type: String },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String },
    phone: { type: String },
  },
  { timestamps: true }
)

module.exports = mongoose.models.PoliceStation || mongoose.model("PoliceStation", PoliceStationSchema)



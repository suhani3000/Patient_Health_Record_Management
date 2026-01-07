import mongoose from "mongoose";

const MedicalRecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  fileName: {
    type: String,
    required: true,
  },

  cid: {
    type: String,
    required: true,
  },

  fileSize: Number,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.MedicalRecord ||
  mongoose.model("MedicalRecord", MedicalRecordSchema);

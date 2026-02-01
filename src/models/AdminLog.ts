import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AdminLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorEmail: { type: String, trim: true },
    actorRole: { type: String, trim: true },

    action: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, trim: true, index: true },

    message: { type: String, trim: true, maxlength: 500 },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

AdminLogSchema.index({ createdAt: -1 });

export type AdminLogDocument = InferSchemaType<typeof AdminLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

const AdminLog = mongoose.models.AdminLog || mongoose.model("AdminLog", AdminLogSchema);

export default AdminLog;

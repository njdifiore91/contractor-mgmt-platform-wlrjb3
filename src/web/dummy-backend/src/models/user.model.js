const mongoose = require('mongoose');

const UserRoles = {
  Admin: 1,
  Operations: 2,
  Inspector: 3,
  CustomerService: 4,
};

const userRoleSchema = new mongoose.Schema({
  roleId: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    userRoles: [userRoleSchema],
    emailPreferences: [String],
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const User = mongoose.model('User', userSchema);

module.exports = {
  User,
  UserRoles,
};

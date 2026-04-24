const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../../models/User');
const { signToken } = require('../../utils/jwt');
const { GraphQLError } = require('graphql');
const { sendPasswordResetEmail } = require('../../utils/email');

exports.register = async ({ name, email, password, role }) => {
  const existing = await User.findOne({ email });
  if (existing) throw new GraphQLError('User already exists');

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashedPassword, role: role || 'USER' });
  return { token: signToken({ id: user.id, email: user.email, role: user.role, name: user.name }), user };
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return { token: signToken({ id: user.id, email: user.email, role: user.role, name: user.name, createdAt: user.createdAt }), user };
};

exports.updateProfile = async (id, { name, email, currentPassword, newPassword }) => {
  const user = await User.findById(id);
  if (!user) throw new GraphQLError('User not found');

  if (name) user.name = name;
  if (email) {
    const exists = await User.findOne({ email });
    if (exists && exists.id !== id) throw new GraphQLError('Email already taken');
    user.email = email;
  }

  if (newPassword) {
    if (!currentPassword) throw new GraphQLError('Current password is required to set a new one');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new GraphQLError('Current password is incorrect');

    user.password = await bcrypt.hash(newPassword, 10);
  }

  await user.save();
  return user;
};

exports.getMe = async (user) => {
  if (!user) return null;
  return User.findById(user.id);
};

exports.forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    // We don't want to reveal if a user exists or not for security reasons,
    // but in a controlled environment like this, we can return true anyway.
    return true;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

  await user.save();

  await sendPasswordResetEmail(user.email, user.name, resetToken);
  return true;
};

exports.resetPassword = async (token, password) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new GraphQLError('Token is invalid or has expired', { extensions: { code: 'BAD_USER_INPUT' } });
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();
  return true;
};

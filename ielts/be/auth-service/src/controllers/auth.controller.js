const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { publishEvent } = require('../services/rabbitmq.service');

const generateToken = (id, role, plan) => {
  return jwt.sign({ id, role, plan: plan || 'FREE' }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user - Always set role as 'Student', ignore if provided in request
    const user = await User.create({
      email,
      password,
      name,
      role: 'Student', // Force role to be 'Student' for security
    });

    // Publish the domain event after persistence succeeds, before the 2xx response.
    await publishEvent('auth.user.registered', {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    // Generate token
    const token = generateToken(user._id, user.role, user.plan);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
        vipValidUntil: user.vipValidUntil || null,
        avatar: user.avatar,
        token,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);  // thêm dòng này
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user._id, user.role, user.plan);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
        vipValidUntil: user.vipValidUntil || null,
        avatar: user.avatar,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

/**
 * Get current user's profile
 * @requires Authentication token
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

/**
 * Update user role (Admin only)
 * @requires userId and newRole in request body
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { newRole } = req.body;

    // Validate input
    if (!newRole) {
      return res.status(400).json({ 
        success: false,
        message: 'New role is required' 
      });
    }

    // Validate role value
    const validRoles = ['Student', 'Teacher', 'Admin'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ 
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
      });
    }

    // Check if target user exists
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Prevent admin from changing their own role
    if (req.user.id === id && newRole === 'Student') {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot change your own role to Student' 
      });
    }

    // Update role
    targetUser.role = newRole;
    await targetUser.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        _id: targetUser._id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        plan: targetUser.plan,
        avatar: targetUser.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

/**
 * Update user profile (Name and Avatar)
 * @requires Authentication token
 */
const updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!name && !avatar) {
      return res.status(400).json({
        success: false,
        message: 'At least name or avatar is required'
      });
    }

    // Prepare update object
    const updateData = {};
    if (name) updateData.name = name;
    if (avatar) updateData.avatar = avatar;

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Lỗi updateProfile:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Change user password
 * @requires Authentication token
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Lỗi changePassword:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Internal endpoint for service-to-service user hydration.
 * Input: { userIds: string[] }
 * Output: [{ _id, name, email }]
 */
const batchGetUsersInternal = async (req, res) => {
  try {
    // Accept both 'userIds' (legacy) and 'ids' field names
    const { userIds, ids } = req.body;
    const rawIds = userIds || ids;

    if (!Array.isArray(rawIds)) {
      return res.status(400).json({
        success: false,
        message: 'userIds (or ids) must be an array',
      });
    }

    const cleanedIds = [...new Set(rawIds.map((id) => String(id).trim()).filter(Boolean))];

    if (!cleanedIds.length) {
      return res.json({ success: true, data: [] });
    }

    const users = await User.find({ _id: { $in: cleanedIds } })
      .select('name fullName email')
      .lean();

    return res.json({
      success: true,
      data: users,
      // Also expose as 'users' key so callers can use either
      users,
    });
  } catch (error) {
    console.error('BATCH GET USERS ERROR:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users in batch',
    });
  }
};

/**
 * Internal endpoint for payment-service to upgrade a user's subscription.
 * PATCH /internal/users/:id/subscription
 * Input: { plan, vipValidUntil }
 */
const updateSubscriptionInternal = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, vipValidUntil } = req.body;

    if (!plan) {
      return res.status(400).json({ success: false, message: 'plan is required' });
    }

    const VALID_PLANS = ['FREE', 'PLUS', 'PRO'];
    if (!VALID_PLANS.includes(plan)) {
      return res.status(400).json({ success: false, message: `Invalid plan: ${plan}` });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { plan, vipValidUntil: vipValidUntil || null },
      { new: true, runValidators: true }
    ).select('_id plan vipValidUntil');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, data: user });
  } catch (error) {
    console.error('UPDATE SUBSCRIPTION INTERNAL ERROR:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update subscription' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateUserRole,
  updateProfile,
  changePassword,
  batchGetUsersInternal,
  updateSubscriptionInternal,
};
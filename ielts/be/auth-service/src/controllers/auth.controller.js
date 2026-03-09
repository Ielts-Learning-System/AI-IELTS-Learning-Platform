const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
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

    // Create user - Always set role as 'student', ignore if provided in request
    const user = await User.create({
      email,
      password,
      name,
      role: 'student', // Force role to be 'student' for security
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
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
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
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
    const validRoles = ['student', 'teacher', 'admin'];
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
    if (req.user.id === id) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot change your own role' 
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
      },
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

module.exports = { register, login, getProfile, updateUserRole };
const User = require('../models/User');

const ALLOWED_ROLES = ['Admin', 'Teacher', 'Student'];

const getAllUsers = async (req, res) => {
  try {
    const filter = {};
    const roleQuery = String(req.query.role || '').trim();

    if (roleQuery) {
      filter.role = new RegExp(`^${roleQuery}$`, 'i');
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch users',
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required',
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed roles: ${ALLOWED_ROLES.join(', ')}`,
      });
    }

    if (req.user && String(req.user._id) === String(id) && role === 'Student') {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role to Student',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user role',
    });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean',
      });
    }

    if (req.user && String(req.user._id) === String(id) && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block your own account',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: `User has been ${isActive ? 'unblocked' : 'blocked'} successfully`,
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user status',
    });
  }
};

const getUsersByIds = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: 'ids must be an array',
      });
    }

    const cleanedIds = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];

    if (cleanedIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const users = await User.find({ _id: { $in: cleanedIds } })
      .select('_id name email role avatar')
      .lean();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to resolve users',
    });
  }
};

const getUserStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, byRole] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.aggregate([
        {
          $group: {
            _id: { $toLower: '$role' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const roleCounts = byRole.reduce(
      (acc, item) => {
        const role = String(item?._id || 'student');
        acc[role] = Number(item?.count || 0);
        return acc;
      },
      { admin: 0, teacher: 0, student: 0 }
    );

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        roleCounts,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user stats',
    });
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  getUsersByIds,
  getUserStats,
};
import express from 'express';
import jwt from 'jsonwebtoken';
import Account from '../models/Account.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { userName, email, password } = req.body;

  try {
    const userExists = await Account.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await Account.create({
      userName,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        userName: user.userName,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Account.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        userName: user.userName,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await Account.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Authenticate with Google (Simulated)
// @route   POST /api/auth/google
// @access  Public
router.post('/google', async (req, res) => {
  const { email, userName } = req.body;

  try {
    let user = await Account.findOne({ email });

    if (!user) {
      // Create new user for google signup
      user = await Account.create({
        userName,
        email,
        password: Math.random().toString(36).slice(-12), // Placeholder secret password
      });
    }

    res.json({
      _id: user._id,
      userName: user.userName,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

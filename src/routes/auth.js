const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { hashPassword, comparePassword, validatePassword } = require('../lib/password');
const { generateTokenPair } = require('../lib/jwt');
const { auth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize and validate user input
 * @param {object} data - Input data to validate
 * @param {string[]} requiredFields - Required field names
 * @returns {object} Validation result
 */
const validateInput = (data, requiredFields = []) => {
  const errors = [];

  // Check required fields
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push(`${field} is required`);
    }
  });

  // Validate email if provided
  if (data.email) {
    if (typeof data.email !== 'string') {
      errors.push('Email must be a string');
    } else {
      data.email = data.email.trim().toLowerCase();
      if (!isValidEmail(data.email)) {
        errors.push('Please provide a valid email address');
      }
      if (data.email.length > 254) {
        errors.push('Email address is too long');
      }
    }
  }

  // Validate name if provided
  if (data.name !== undefined) {
    if (data.name && typeof data.name !== 'string') {
      errors.push('Name must be a string');
    } else if (data.name) {
      data.name = data.name.trim();
      if (data.name.length > 100) {
        errors.push('Name must not exceed 100 characters');
      }
      if (data.name.length < 1) {
        errors.push('Name cannot be empty');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: data
  };
};

/**
 * POST /register - Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    const validation = validateInput(
      { email, password, name },
      ['email', 'password']
    );

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input and try again',
        details: validation.errors
      });
    }

    const { sanitizedData } = validation;

    // Validate password strength
    const passwordValidation = validatePassword(sanitizedData.password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password validation failed',
        message: 'Password does not meet security requirements',
        details: passwordValidation.errors
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedData.email }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'An account with this email address already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(sanitizedData.password);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email: sanitizedData.email,
        password: hashedPassword,
        name: sanitizedData.name || null
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
        // Exclude password field
      }
    });

    // Generate JWT tokens
    const tokens = generateTokenPair(user.id);

    // Return success response
    res.status(201).json({
      message: 'User registered successfully',
      user,
      ...tokens
    });

  } catch (error) {
    console.error('Registration error:', error);

    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'User already exists',
        message: 'An account with this email address already exists'
      });
    }

    // Handle other database errors
    if (error.name === 'PrismaClientKnownRequestError') {
      return res.status(500).json({
        error: 'Database error',
        message: 'Unable to create user account at this time'
      });
    }

    // Handle validation errors from password hashing
    if (error.message.includes('Password validation failed')) {
      return res.status(400).json({
        error: 'Password validation failed',
        message: error.message
      });
    }

    // Generic server error
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to register user at this time'
    });
  }
});

/**
 * POST /login - Authenticate user and return token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    const validation = validateInput(
      { email, password },
      ['email', 'password']
    );

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please provide valid email and password',
        details: validation.errors
      });
    }

    const { sanitizedData } = validation;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: sanitizedData.email }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Compare password with hash
    const isPasswordValid = await comparePassword(sanitizedData.password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Generate JWT tokens
    const tokens = generateTokenPair(user.id);

    // Return user data (without password) and tokens
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      ...tokens
    });

  } catch (error) {
    console.error('Login error:', error);

    // Handle database errors
    if (error.name === 'PrismaClientKnownRequestError') {
      return res.status(500).json({
        error: 'Database error',
        message: 'Unable to authenticate user at this time'
      });
    }

    // Handle password comparison errors
    if (error.message.includes('Failed to compare passwords')) {
      return res.status(500).json({
        error: 'Authentication error',
        message: 'Unable to verify credentials at this time'
      });
    }

    // Generic server error
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to process login request at this time'
    });
  }
});

/**
 * GET /me - Get current user profile (protected route)
 */
router.get('/me', auth, async (req, res) => {
  try {
    // User is already available from auth middleware
    const userId = req.user.id;

    // Fetch fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        // Include subscription count for dashboard
        _count: {
          select: {
            subscriptions: true,
            notifications: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account no longer exists'
      });
    }

    res.json({
      message: 'User profile retrieved successfully',
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);

    // Handle database errors
    if (error.name === 'PrismaClientKnownRequestError') {
      return res.status(500).json({
        error: 'Database error',
        message: 'Unable to retrieve user profile at this time'
      });
    }

    // Generic server error
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to retrieve user profile at this time'
    });
  }
});

/**
 * POST /refresh - Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const { verifyToken } = require('../lib/jwt');
    const decoded = verifyToken(refreshToken);

    // Check if it's a refresh token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Invalid refresh token'
      });
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'User account no longer exists'
      });
    }

    // Generate new token pair
    const tokens = generateTokenPair(user.id);

    res.json({
      message: 'Tokens refreshed successfully',
      user,
      ...tokens
    });

  } catch (error) {
    console.error('Token refresh error:', error);

    // Handle JWT errors
    if (error.message.includes('Token has expired')) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Refresh token has expired, please login again'
      });
    }

    if (error.message.includes('Invalid token')) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Invalid refresh token'
      });
    }

    // Generic server error
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to refresh tokens at this time'
    });
  }
});

/**
 * POST /logout - Logout user (client-side token removal)
 */
router.post('/logout', auth, async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // This endpoint serves as a confirmation and for any server-side cleanup
    
    res.json({
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Logout error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to process logout request'
    });
  }
});

module.exports = router;
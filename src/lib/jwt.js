const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for a user
 * @param {string} userId - The user's ID
 * @param {object} options - Additional options for token generation
 * @returns {string} JWT token
 */
const generateToken = (userId, options = {}) => {
  if (!userId) {
    throw new Error('User ID is required to generate token');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  const payload = {
    userId,
    iat: Math.floor(Date.now() / 1000), // issued at
    ...options.payload
  };

  const tokenOptions = {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || '7d',
    issuer: options.issuer || 'subscription-manager',
    audience: options.audience || 'subscription-manager-users',
    ...options.tokenOptions
  };

  try {
    return jwt.sign(payload, process.env.JWT_SECRET, tokenOptions);
  } catch (error) {
    throw new Error(`Failed to generate token: ${error.message}`);
  }
};

/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT token to verify
 * @param {object} options - Additional options for verification
 * @returns {object} Decoded token payload
 */
const verifyToken = (token, options = {}) => {
  if (!token) {
    throw new Error('Token is required for verification');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  const verifyOptions = {
    issuer: options.issuer || 'subscription-manager',
    audience: options.audience || 'subscription-manager-users',
    ...options.verifyOptions
  };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, verifyOptions);
    
    // Validate required fields
    if (!decoded.userId) {
      throw new Error('Invalid token: missing userId');
    }

    return decoded;
  } catch (error) {
    // Re-throw JWT errors with more descriptive messages
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token format or signature');
    }
    
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    
    if (error.name === 'NotBeforeError') {
      throw new Error('Token is not active yet');
    }

    if (error.name === 'NotImplementedError') {
      throw new Error('Token algorithm not supported');
    }

    // For other errors, throw as-is
    throw error;
  }
};

/**
 * Generate a refresh token (longer expiration)
 * @param {string} userId - The user's ID
 * @returns {string} Refresh token
 */
const generateRefreshToken = (userId) => {
  return generateToken(userId, {
    expiresIn: '30d',
    payload: {
      type: 'refresh'
    }
  });
};

/**
 * Generate both access and refresh tokens
 * @param {string} userId - The user's ID
 * @returns {object} Object containing access and refresh tokens
 */
const generateTokenPair = (userId) => {
  const accessToken = generateToken(userId);
  const refreshToken = generateRefreshToken(userId);

  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  };
};

/**
 * Decode token without verification (for debugging)
 * @param {string} token - The JWT token to decode
 * @returns {object} Decoded token payload
 */
const decodeToken = (token) => {
  if (!token) {
    throw new Error('Token is required for decoding');
  }

  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    throw new Error(`Failed to decode token: ${error.message}`);
  }
};

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken,
  generateTokenPair,
  decodeToken
};
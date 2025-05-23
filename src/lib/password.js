const bcrypt = require('bcryptjs');

// Salt rounds for bcrypt hashing (12 is a good balance of security and performance)
const SALT_ROUNDS = 12;

// Password validation constants
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;

/**
 * Hash a password using bcrypt with salt
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  if (!password) {
    throw new Error('Password is required');
  }

  if (typeof password !== 'string') {
    throw new Error('Password must be a string');
  }

  // Validate password before hashing
  const validation = validatePassword(password);
  if (!validation.isValid) {
    throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    return hashedPassword;
  } catch (error) {
    throw new Error(`Failed to hash password: ${error.message}`);
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if passwords match, false otherwise
 */
const comparePassword = async (password, hashedPassword) => {
  if (!password || !hashedPassword) {
    throw new Error('Both password and hashed password are required');
  }

  if (typeof password !== 'string' || typeof hashedPassword !== 'string') {
    throw new Error('Password and hashed password must be strings');
  }

  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    throw new Error(`Failed to compare passwords: ${error.message}`);
  }
};

/**
 * Validate password strength and requirements
 * @param {string} password - Password to validate
 * @returns {object} Validation result with isValid boolean and errors array
 */
const validatePassword = (password) => {
  const errors = [];

  // Check if password exists
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  // Check if password is a string
  if (typeof password !== 'string') {
    errors.push('Password must be a string');
    return { isValid: false, errors };
  }

  // Check minimum length
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  // Check maximum length (prevent DoS attacks)
  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters`);
  }

  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Password must contain at least one letter');
  }

  // Check for at least one number (optional but recommended)
  // if (!/\d/.test(password)) {
  //   errors.push('Password must contain at least one number');
  // }

  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }

  // Check for repeated characters (more than 3 consecutive)
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password cannot contain more than 3 consecutive identical characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 12)
 * @param {object} options - Options for password generation
 * @returns {string} Generated password
 */
const generateSecurePassword = (length = 12, options = {}) => {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSpecialChars = false,
    excludeSimilar = true // Exclude similar looking characters (0, O, l, I, etc.)
  } = options;

  let charset = '';
  
  if (includeLowercase) {
    charset += excludeSimilar ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  }
  
  if (includeUppercase) {
    charset += excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  
  if (includeNumbers) {
    charset += excludeSimilar ? '23456789' : '0123456789';
  }
  
  if (includeSpecialChars) {
    charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  }

  if (!charset) {
    throw new Error('At least one character type must be included');
  }

  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return password;
};

/**
 * Check if a password needs to be rehashed (if salt rounds have changed)
 * @param {string} hashedPassword - The hashed password to check
 * @returns {boolean} True if password needs rehashing
 */
const needsRehash = (hashedPassword) => {
  if (!hashedPassword) {
    return true;
  }

  try {
    const rounds = bcrypt.getRounds(hashedPassword);
    return rounds < SALT_ROUNDS;
  } catch (error) {
    // If we can't determine the rounds, assume it needs rehashing
    return true;
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePassword,
  generateSecurePassword,
  needsRehash,
  // Export constants for testing and external use
  SALT_ROUNDS,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH
};
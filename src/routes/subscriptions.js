const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication middleware to all routes
router.use(auth);

/**
 * Validate subscription input data
 * @param {object} data - Subscription data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {object} Validation result
 */
const validateSubscriptionInput = (data, isUpdate = false) => {
  const errors = [];
  const sanitizedData = { ...data };

  // Required fields for creation
  const requiredFields = isUpdate ? [] : ['serviceName', 'planType', 'cost', 'billingCycle', 'nextBillingDate'];
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push(`${field} is required`);
    }
  });

  // Validate serviceName
  if (data.serviceName !== undefined) {
    if (typeof data.serviceName !== 'string') {
      errors.push('Service name must be a string');
    } else {
      sanitizedData.serviceName = data.serviceName.trim();
      if (sanitizedData.serviceName.length < 1) {
        errors.push('Service name cannot be empty');
      }
      if (sanitizedData.serviceName.length > 100) {
        errors.push('Service name must not exceed 100 characters');
      }
    }
  }

  // Validate planType
  if (data.planType !== undefined) {
    if (typeof data.planType !== 'string') {
      errors.push('Plan type must be a string');
    } else {
      sanitizedData.planType = data.planType.trim();
      if (sanitizedData.planType.length < 1) {
        errors.push('Plan type cannot be empty');
      }
      if (sanitizedData.planType.length > 50) {
        errors.push('Plan type must not exceed 50 characters');
      }
    }
  }

  // Validate cost
  if (data.cost !== undefined) {
    const cost = parseFloat(data.cost);
    if (isNaN(cost) || cost < 0) {
      errors.push('Cost must be a positive number');
    } else if (cost > 999999.99) {
      errors.push('Cost must not exceed 999,999.99');
    } else {
      sanitizedData.cost = cost;
    }
  }

  // Validate billingCycle
  if (data.billingCycle !== undefined) {
    const validCycles = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validCycles.includes(data.billingCycle)) {
      errors.push(`Billing cycle must be one of: ${validCycles.join(', ')}`);
    }
  }

  // Validate nextBillingDate
  if (data.nextBillingDate !== undefined) {
    const date = new Date(data.nextBillingDate);
    if (isNaN(date.getTime())) {
      errors.push('Next billing date must be a valid date');
    } else {
      sanitizedData.nextBillingDate = date;
    }
  }

  // Validate status
  if (data.status !== undefined) {
    const validStatuses = ['active', 'inactive', 'cancelled', 'expired'];
    if (!validStatuses.includes(data.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  // Validate category
  if (data.category !== undefined) {
    if (typeof data.category !== 'string') {
      errors.push('Category must be a string');
    } else {
      sanitizedData.category = data.category.trim();
      if (sanitizedData.category.length < 1) {
        errors.push('Category cannot be empty');
      }
      if (sanitizedData.category.length > 50) {
        errors.push('Category must not exceed 50 characters');
      }
    }
  }

  // Validate paymentMethod
  if (data.paymentMethod !== undefined) {
    const validMethods = ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'apple_pay', 'google_pay', 'other'];
    if (!validMethods.includes(data.paymentMethod)) {
      errors.push(`Payment method must be one of: ${validMethods.join(', ')}`);
    }
  }

  // Validate autoRenewal
  if (data.autoRenewal !== undefined) {
    if (typeof data.autoRenewal !== 'boolean') {
      errors.push('Auto renewal must be a boolean value');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
};

/**
 * Calculate next billing date based on current date and billing cycle
 * @param {Date} currentDate - Current billing date
 * @param {string} billingCycle - Billing cycle
 * @returns {Date} Next billing date
 */
const calculateNextBillingDate = (currentDate, billingCycle) => {
  const date = new Date(currentDate);
  
  switch (billingCycle) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      throw new Error(`Invalid billing cycle: ${billingCycle}`);
  }
  
  return date;
};

/**
 * Parse query parameters for filtering and pagination
 * @param {object} query - Request query parameters
 * @returns {object} Parsed parameters
 */
const parseQueryParams = (query) => {
  const {
    page = 1,
    limit = 10,
    status,
    category,
    billingCycle,
    sortBy = 'nextBillingDate',
    sortOrder = 'asc',
    search
  } = query;

  // Validate pagination
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));

  // Validate sort parameters
  const validSortFields = ['serviceName', 'cost', 'nextBillingDate', 'createdAt', 'updatedAt'];
  const validSortOrder = ['asc', 'desc'];
  
  const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'nextBillingDate';
  const finalSortOrder = validSortOrder.includes(sortOrder) ? sortOrder : 'asc';

  // Build filters
  const where = {};
  
  if (status) where.status = status;
  if (category) where.category = category;
  if (billingCycle) where.billingCycle = billingCycle;
  
  if (search) {
    where.OR = [
      { serviceName: { contains: search, mode: 'insensitive' } },
      { planType: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } }
    ];
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
    where,
    orderBy: { [finalSortBy]: finalSortOrder }
  };
};

/**
 * GET / - Get all subscriptions for authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const params = parseQueryParams(req.query);

    // Add user filter
    params.where.userId = userId;

    // Get subscriptions with pagination
    const [subscriptions, totalCount] = await Promise.all([
      prisma.subscription.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.limit,
        include: {
          transactions: {
            orderBy: { date: 'desc' },
            take: 5 // Include last 5 transactions
          },
          _count: {
            select: {
              transactions: true
            }
          }
        }
      }),
      prisma.subscription.count({
        where: params.where
      })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / params.limit);
    const hasNextPage = params.page < totalPages;
    const hasPrevPage = params.page > 1;

    res.json({
      message: 'Subscriptions retrieved successfully',
      data: subscriptions,
      pagination: {
        currentPage: params.page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: params.limit,
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to retrieve subscriptions at this time'
    });
  }
});

/**
 * POST / - Create new subscription
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Validate input
    const validation = validateSubscriptionInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input and try again',
        details: validation.errors
      });
    }

    const { sanitizedData } = validation;

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        serviceName: sanitizedData.serviceName,
        planType: sanitizedData.planType,
        cost: sanitizedData.cost,
        billingCycle: sanitizedData.billingCycle,
        nextBillingDate: sanitizedData.nextBillingDate,
        status: sanitizedData.status || 'active',
        category: sanitizedData.category || 'other',
        paymentMethod: sanitizedData.paymentMethod || 'credit_card',
        autoRenewal: sanitizedData.autoRenewal !== undefined ? sanitizedData.autoRenewal : true
      },
      include: {
        transactions: true,
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Subscription created successfully',
      data: subscription
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    
    if (error.name === 'PrismaClientKnownRequestError') {
      return res.status(500).json({
        error: 'Database error',
        message: 'Unable to create subscription at this time'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to create subscription at this time'
    });
  }
});

/**
 * GET /analytics - Get subscription analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    // Get subscription analytics
    const [
      totalSubscriptions,
      activeSubscriptions,
      subscriptions,
      upcomingRenewals,
      totalSpent
    ] = await Promise.all([
      // Total subscription count
      prisma.subscription.count({
        where: { userId }
      }),
      
      // Active subscription count
      prisma.subscription.count({
        where: { userId, status: 'active' }
      }),
      
      // All subscriptions for calculations
      prisma.subscription.findMany({
        where: { userId },
        select: {
          cost: true,
          billingCycle: true,
          status: true,
          category: true,
          nextBillingDate: true
        }
      }),
      
      // Upcoming renewals (next 30 days)
      prisma.subscription.findMany({
        where: {
          userId,
          status: 'active',
          nextBillingDate: {
            lte: thirtyDaysFromNow,
            gte: now
          }
        },
        select: {
          id: true,
          serviceName: true,
          cost: true,
          nextBillingDate: true
        },
        orderBy: { nextBillingDate: 'asc' }
      }),
      
      // Total spent (from transactions)
      prisma.transaction.aggregate({
        where: {
          subscription: { userId },
          status: 'completed'
        },
        _sum: { amount: true }
      })
    ]);

    // Calculate monthly costs
    const monthlyTotal = subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((total, sub) => {
        switch (sub.billingCycle) {
          case 'daily': return total + (sub.cost * 30);
          case 'weekly': return total + (sub.cost * 4.33);
          case 'monthly': return total + sub.cost;
          case 'quarterly': return total + (sub.cost / 3);
          case 'yearly': return total + (sub.cost / 12);
          default: return total;
        }
      }, 0);

    // Calculate yearly total
    const yearlyTotal = monthlyTotal * 12;

    // Category breakdown
    const categoryBreakdown = subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((categories, sub) => {
        const category = sub.category || 'other';
        if (!categories[category]) {
          categories[category] = { count: 0, totalCost: 0 };
        }
        categories[category].count++;
        
        // Convert to monthly cost for consistency
        let monthlyCost = sub.cost;
        switch (sub.billingCycle) {
          case 'daily': monthlyCost = sub.cost * 30; break;
          case 'weekly': monthlyCost = sub.cost * 4.33; break;
          case 'quarterly': monthlyCost = sub.cost / 3; break;
          case 'yearly': monthlyCost = sub.cost / 12; break;
        }
        categories[category].totalCost += monthlyCost;
        
        return categories;
      }, {});

    // Calculate upcoming renewal costs
    const upcomingRenewalCosts = upcomingRenewals.reduce((total, renewal) => total + renewal.cost, 0);

    res.json({
      message: 'Analytics retrieved successfully',
      data: {
        overview: {
          totalSubscriptions,
          activeSubscriptions,
          inactiveSubscriptions: totalSubscriptions - activeSubscriptions,
          monthlyTotal: Math.round(monthlyTotal * 100) / 100,
          yearlyTotal: Math.round(yearlyTotal * 100) / 100,
          totalSpent: totalSpent._sum.amount || 0
        },
        upcomingRenewals: {
          count: upcomingRenewals.length,
          totalCost: Math.round(upcomingRenewalCosts * 100) / 100,
          renewals: upcomingRenewals
        },
        categoryBreakdown: Object.entries(categoryBreakdown).map(([category, data]) => ({
          category,
          count: data.count,
          monthlyTotal: Math.round(data.totalCost * 100) / 100
        })).sort((a, b) => b.monthlyTotal - a.monthlyTotal)
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to retrieve analytics at this time'
    });
  }
});

/**
 * GET /:id - Get specific subscription
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptionId = req.params.id;

    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId // Ensure user can only access their own subscriptions
      },
      include: {
        transactions: {
          orderBy: { date: 'desc' }
        },
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });

    if (!subscription) {
      return res.status(404).json({
        error: 'Subscription not found',
        message: 'The requested subscription does not exist or you do not have access to it'
      });
    }

    res.json({
      message: 'Subscription retrieved successfully',
      data: subscription
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to retrieve subscription at this time'
    });
  }
});

/**
 * PUT /:id - Update subscription
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptionId = req.params.id;

    // Validate input
    const validation = validateSubscriptionInput(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input and try again',
        details: validation.errors
      });
    }

    // Check if subscription exists and belongs to user
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId
      }
    });

    if (!existingSubscription) {
      return res.status(404).json({
        error: 'Subscription not found',
        message: 'The requested subscription does not exist or you do not have access to it'
      });
    }

    const { sanitizedData } = validation;

    // Update subscription
    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: sanitizedData,
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 5
        },
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });

    res.json({
      message: 'Subscription updated successfully',
      data: subscription
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    
    if (error.name === 'PrismaClientKnownRequestError') {
      if (error.code === 'P2025') {
        return res.status(404).json({
          error: 'Subscription not found',
          message: 'The requested subscription does not exist'
        });
      }
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to update subscription at this time'
    });
  }
});

/**
 * DELETE /:id - Delete subscription
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptionId = req.params.id;

    // Check if subscription exists and belongs to user
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId
      }
    });

    if (!existingSubscription) {
      return res.status(404).json({
        error: 'Subscription not found',
        message: 'The requested subscription does not exist or you do not have access to it'
      });
    }

    // Delete subscription (transactions will be deleted due to cascade)
    await prisma.subscription.delete({
      where: { id: subscriptionId }
    });

    res.json({
      message: 'Subscription deleted successfully'
    });

  } catch (error) {
    console.error('Delete subscription error:', error);
    
    if (error.name === 'PrismaClientKnownRequestError') {
      if (error.code === 'P2025') {
        return res.status(404).json({
          error: 'Subscription not found',
          message: 'The requested subscription does not exist'
        });
      }
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to delete subscription at this time'
    });
  }
});
module.exports = router;

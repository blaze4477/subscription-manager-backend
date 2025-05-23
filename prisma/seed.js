const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../src/lib/password');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.transaction.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();

    // Create sample user
    console.log('👤 Creating sample user...');
    const hashedPassword = await hashPassword('MySecure2024!Pass');
    
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
      }
    });

    console.log(`✅ Created user: ${user.email}`);

    // Create sample subscriptions
    console.log('📱 Creating sample subscriptions...');
    
    const subscriptions = [
      {
        serviceName: 'Netflix',
        planType: 'Premium',
        cost: 15.99,
        billingCycle: 'monthly',
        nextBillingDate: new Date('2025-06-15'),
        status: 'active',
        category: 'entertainment',
        paymentMethod: 'credit_card',
        autoRenewal: true,
      },
      {
        serviceName: 'Spotify',
        planType: 'Premium Individual',
        cost: 9.99,
        billingCycle: 'monthly',
        nextBillingDate: new Date('2025-06-08'),
        status: 'active',
        category: 'entertainment',
        paymentMethod: 'credit_card',
        autoRenewal: true,
      },
      {
        serviceName: 'Adobe Creative Cloud',
        planType: 'Individual',
        cost: 59.99,
        billingCycle: 'monthly',
        nextBillingDate: new Date('2025-07-01'),
        status: 'active',
        category: 'productivity',
        paymentMethod: 'paypal',
        autoRenewal: true,
      },
      {
        serviceName: 'Microsoft 365',
        planType: 'Personal',
        cost: 69.99,
        billingCycle: 'yearly',
        nextBillingDate: new Date('2026-01-15'),
        status: 'active',
        category: 'productivity',
        paymentMethod: 'credit_card',
        autoRenewal: true,
      },
      {
        serviceName: 'AWS',
        planType: 'Free Tier',
        cost: 25.50,
        billingCycle: 'monthly',
        nextBillingDate: new Date('2025-06-01'),
        status: 'active',
        category: 'development',
        paymentMethod: 'credit_card',
        autoRenewal: true,
      },
      {
        serviceName: 'Gym Membership',
        planType: 'Premium',
        cost: 49.99,
        billingCycle: 'monthly',
        nextBillingDate: new Date('2025-06-20'),
        status: 'active',
        category: 'health',
        paymentMethod: 'bank_transfer',
        autoRenewal: true,
      },
      {
        serviceName: 'Dropbox',
        planType: 'Plus',
        cost: 119.88,
        billingCycle: 'yearly',
        nextBillingDate: new Date('2025-12-10'),
        status: 'inactive',
        category: 'productivity',
        paymentMethod: 'credit_card',
        autoRenewal: false,
      }
    ];

    const createdSubscriptions = [];
    for (const subscriptionData of subscriptions) {
      const subscription = await prisma.subscription.create({
        data: {
          ...subscriptionData,
          userId: user.id,
        }
      });
      createdSubscriptions.push(subscription);
      console.log(`  ✅ Created subscription: ${subscription.serviceName}`);
    }

    // Create sample transactions
    console.log('💳 Creating sample transactions...');
    
    const transactions = [
      // Netflix transactions
      {
        subscriptionId: createdSubscriptions[0].id, // Netflix
        amount: 15.99,
        date: new Date('2025-05-15'),
        paymentMethod: 'credit_card',
        status: 'completed',
        receiptUrl: 'https://netflix.com/receipt/123456'
      },
      {
        subscriptionId: createdSubscriptions[0].id, // Netflix
        amount: 15.99,
        date: new Date('2025-04-15'),
        paymentMethod: 'credit_card',
        status: 'completed',
        receiptUrl: 'https://netflix.com/receipt/123455'
      },
      {
        subscriptionId: createdSubscriptions[0].id, // Netflix
        amount: 15.99,
        date: new Date('2025-03-15'),
        paymentMethod: 'credit_card',
        status: 'completed',
        receiptUrl: 'https://netflix.com/receipt/123454'
      },
      
      // Spotify transactions
      {
        subscriptionId: createdSubscriptions[1].id, // Spotify
        amount: 9.99,
        date: new Date('2025-05-08'),
        paymentMethod: 'credit_card',
        status: 'completed',
        receiptUrl: 'https://spotify.com/receipt/789012'
      },
      {
        subscriptionId: createdSubscriptions[1].id, // Spotify
        amount: 9.99,
        date: new Date('2025-04-08'),
        paymentMethod: 'credit_card',
        status: 'completed',
        receiptUrl: 'https://spotify.com/receipt/789011'
      },
      
      // Adobe Creative Cloud transactions
      {
        subscriptionId: createdSubscriptions[2].id, // Adobe
        amount: 59.99,
        date: new Date('2025-05-01'),
        paymentMethod: 'paypal',
        status: 'completed',
        receiptUrl: 'https://adobe.com/receipt/345678'
      },
      {
        subscriptionId: createdSubscriptions[2].id, // Adobe
        amount: 59.99,
        date: new Date('2025-04-01'),
        paymentMethod: 'paypal',
        status: 'completed'
      },
      
      // Microsoft 365 transaction (yearly)
      {
        subscriptionId: createdSubscriptions[3].id, // Microsoft 365
        amount: 69.99,
        date: new Date('2025-01-15'),
        paymentMethod: 'credit_card',
        status: 'completed',
        receiptUrl: 'https://microsoft.com/receipt/901234'
      },
      
      // AWS transactions
      {
        subscriptionId: createdSubscriptions[4].id, // AWS
        amount: 25.50,
        date: new Date('2025-05-01'),
        paymentMethod: 'credit_card',
        status: 'completed'
      },
      {
        subscriptionId: createdSubscriptions[4].id, // AWS
        amount: 22.75,
        date: new Date('2025-04-01'),
        paymentMethod: 'credit_card',
        status: 'completed'
      },
      
      // Gym membership transactions
      {
        subscriptionId: createdSubscriptions[5].id, // Gym
        amount: 49.99,
        date: new Date('2025-05-20'),
        paymentMethod: 'bank_transfer',
        status: 'completed'
      },
      {
        subscriptionId: createdSubscriptions[5].id, // Gym
        amount: 49.99,
        date: new Date('2025-04-20'),
        paymentMethod: 'bank_transfer',
        status: 'completed'
      },
      
      // Dropbox transaction (yearly, last year)
      {
        subscriptionId: createdSubscriptions[6].id, // Dropbox
        amount: 119.88,
        date: new Date('2024-12-10'),
        paymentMethod: 'credit_card',
        status: 'completed'
      },
      
      // Some pending/failed transactions for variety
      {
        subscriptionId: createdSubscriptions[0].id, // Netflix
        amount: 15.99,
        date: new Date('2025-05-23'),
        paymentMethod: 'credit_card',
        status: 'pending'
      },
      {
        subscriptionId: createdSubscriptions[1].id, // Spotify
        amount: 9.99,
        date: new Date('2025-05-22'),
        paymentMethod: 'credit_card',
        status: 'failed'
      }
    ];

    for (const transactionData of transactions) {
      const transaction = await prisma.transaction.create({
        data: transactionData
      });
      console.log(`  ✅ Created transaction: $${transaction.amount} for ${createdSubscriptions.find(s => s.id === transaction.subscriptionId)?.serviceName}`);
    }

    // Create sample notifications
    console.log('🔔 Creating sample notifications...');
    
    const notifications = [
      {
        userId: user.id,
        type: 'reminder',
        title: 'Netflix Renewal Tomorrow',
        message: 'Your Netflix Premium subscription will renew tomorrow for $15.99',
        priority: 'medium',
        readStatus: false
      },
      {
        userId: user.id,
        type: 'alert',
        title: 'Spotify Payment Failed',
        message: 'Your Spotify payment failed. Please update your payment method.',
        priority: 'high',
        readStatus: false
      },
      {
        userId: user.id,
        type: 'info',
        title: 'Monthly Spending Report',
        message: 'You spent $177.45 on subscriptions this month.',
        priority: 'low',
        readStatus: true
      },
      {
        userId: user.id,
        type: 'warning',
        title: 'High Monthly Spending',
        message: 'Your subscription spending has increased by 15% this month.',
        priority: 'medium',
        readStatus: false
      }
    ];

    for (const notificationData of notifications) {
      const notification = await prisma.notification.create({
        data: notificationData
      });
      console.log(`  ✅ Created notification: ${notification.title}`);
    }

    // Summary
    console.log('\n📊 Seed Summary:');
    console.log(`👤 Users: 1`);
    console.log(`📱 Subscriptions: ${createdSubscriptions.length}`);
    console.log(`💳 Transactions: ${transactions.length}`);
    console.log(`🔔 Notifications: ${notifications.length}`);
    
    console.log('\n🎯 Test Credentials:');
    console.log('Email: test@example.com');
    console.log('Password: MySecure2024!Pass');
    
    console.log('\n🚀 Database seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
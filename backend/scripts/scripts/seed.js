// Database Seeding Script
// سكريبت تعبئة قاعدة البيانات ببيانات تجريبية

const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const { User, Page, Post, Media, Analytics: _Analytics } = require('../models/schemas');

// Sample data
const sampleUsers = [
  {
    name: 'أحمد محمد',
    email: 'ahmed@example.com',
    password: 'Admin123!',
    role: 'admin',
    department: 'IT',
    phone: '+966501234567',
    status: 'active',
    emailVerified: true,
  },
  {
    name: 'فاطمة علي',
    email: 'fatima@example.com',
    password: 'Manager123!',
    role: 'manager',
    department: 'HR',
    phone: '+966502345678',
    status: 'active',
    emailVerified: true,
  },
  {
    name: 'محمود حسن',
    email: 'mahmoud@example.com',
    password: 'User123!',
    role: 'user',
    department: 'Sales',
    phone: '+966503456789',
    status: 'active',
    emailVerified: true,
  },
];

const samplePages = [
  {
    title: 'الصفحة الرئيسية',
    slug: 'home',
    content: 'محتوى الصفحة الرئيسية...',
    excerpt: 'ملخص الصفحة الرئيسية',
    status: 'published',
    category: 'General',
    tags: ['main', 'home'],
    seoTitle: 'Home - ERP System',
    seoDescription: 'Welcome to our ERP system',
  },
  {
    title: 'حول النظام',
    slug: 'about',
    content: 'معلومات عن النظام...',
    excerpt: 'معلومات الشركة',
    status: 'published',
    category: 'General',
    tags: ['about', 'company'],
  },
];

const samplePosts = [
  {
    title: 'مقدمة إلى نظام ERP',
    slug: 'intro-to-erp',
    content: 'شرح مفصل عن نظام ERP...',
    excerpt: 'نظرة عامة على النظام',
    category: 'News',
    tags: ['ERP', 'System'],
    status: 'published',
  },
];

// Seed function
async function seedDatabase() {
  try {
    console.log('\n📊 Starting database seeding...\n');

    // Connect to database
    await connectDB();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Page.deleteMany({});
    await Post.deleteMany({});
    await Media.deleteMany({});
    console.log('✅ Data cleared\n');

    // Seed users
    console.log('👥 Seeding users...');
    const users = await User.insertMany(sampleUsers);
    console.log(`✅ ${users.length} users created\n`);

    // Seed pages
    console.log('📄 Seeding pages...');
    const pagesWithAuthor = samplePages.map(page => ({
      ...page,
      author: users[0]._id,
    }));
    const pages = await Page.insertMany(pagesWithAuthor);
    console.log(`✅ ${pages.length} pages created\n`);

    // Seed posts
    console.log('📝 Seeding posts...');
    const postsWithAuthor = samplePosts.map(post => ({
      ...post,
      author: users[0]._id,
    }));
    const posts = await Post.insertMany(postsWithAuthor);
    console.log(`✅ ${posts.length} posts created\n`);

    // Display summary
    console.log('═'.repeat(50));
    console.log('📊 SEEDING SUMMARY');
    console.log('═'.repeat(50));
    console.log(`✅ Users: ${users.length}`);
    console.log(`✅ Pages: ${pages.length}`);
    console.log(`✅ Posts: ${posts.length}`);
    console.log('═'.repeat(50) + '\n');

    // Display admin credentials
    console.log('🔑 Admin Credentials:');
    console.log(`   Email: ${users[0].email}`);
    console.log(`   Password: ${sampleUsers[0].password}\n`);

    console.log('✅ Database seeding completed successfully!\n');

    // Disconnect
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();

import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

loadEnv({ path: resolve(process.cwd(), '.env.local') });

function normalizeUri(rawUri) {
  if (!rawUri) return '';
  if (rawUri.includes('=') && !rawUri.startsWith('mongodb')) {
    return rawUri.substring(rawUri.indexOf('=') + 1).trim();
  }
  return rawUri;
}

function buildAccountSpecs() {
  return [
    {
      key: 'superadmin',
      email: process.env.BOOTSTRAP_SUPERADMIN_EMAIL,
      password: process.env.BOOTSTRAP_SUPERADMIN_PASSWORD,
      firstName: process.env.BOOTSTRAP_SUPERADMIN_FIRST_NAME || 'Super',
      lastName: process.env.BOOTSTRAP_SUPERADMIN_LAST_NAME || 'Admin',
      role: 'admin',
      phone: process.env.BOOTSTRAP_SUPERADMIN_PHONE || '',
    },
    {
      key: 'manager',
      email: process.env.BOOTSTRAP_MANAGER_EMAIL,
      password: process.env.BOOTSTRAP_MANAGER_PASSWORD,
      firstName: process.env.BOOTSTRAP_MANAGER_FIRST_NAME || 'Property',
      lastName: process.env.BOOTSTRAP_MANAGER_LAST_NAME || 'Admin',
      role: 'manager',
      phone: process.env.BOOTSTRAP_MANAGER_PHONE || '',
    },
    {
      key: 'owner',
      email: process.env.BOOTSTRAP_OWNER_EMAIL,
      password: process.env.BOOTSTRAP_OWNER_PASSWORD,
      firstName: process.env.BOOTSTRAP_OWNER_FIRST_NAME || 'Property',
      lastName: process.env.BOOTSTRAP_OWNER_LAST_NAME || 'Owner',
      role: 'owner',
      phone: process.env.BOOTSTRAP_OWNER_PHONE || '',
    },
    {
      key: 'tenant',
      email: process.env.BOOTSTRAP_TENANT_EMAIL,
      password: process.env.BOOTSTRAP_TENANT_PASSWORD,
      firstName: process.env.BOOTSTRAP_TENANT_FIRST_NAME || 'Sample',
      lastName: process.env.BOOTSTRAP_TENANT_LAST_NAME || 'Tenant',
      role: 'tenant',
      phone: process.env.BOOTSTRAP_TENANT_PHONE || '',
    },
  ].filter((account) => account.email && account.password);
}

function buildBaseDocument(account, passwordHash, now) {
  return {
    email: account.email.toLowerCase(),
    firstName: account.firstName,
    lastName: account.lastName,
    phone: account.phone || undefined,
    role: account.role,
    password: passwordHash,
    avatar: null,
    isActive: true,
    emailVerified: now,
    lastLogin: null,
    deletedAt: null,
    preferredContactMethod: 'email',
    emergencyContactVerified: false,
    integrations: {
      googleCalendar: {
        connected: false,
        autoSync: false,
        syncDirection: 'bidirectional',
        syncInterval: 15,
      },
    },
    notificationPreferences: {
      calendar: {
        email: {
          enabled: true,
          invitations: true,
          reminders: true,
          updates: true,
          cancellations: true,
          dailyDigest: false,
          weeklyDigest: true,
        },
        sms: {
          enabled: false,
          reminders: false,
          urgentUpdates: false,
        },
        push: {
          enabled: true,
          reminders: true,
          updates: true,
          invitations: true,
        },
        reminderTiming: {
          default: [15, 60],
          highPriority: [15, 60, 1440],
          lowPriority: [60],
        },
        digestTiming: {
          dailyTime: '08:00',
          weeklyDay: 1,
          weeklyTime: '09:00',
        },
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'local',
        },
      },
    },
    isSystemUser: false,
    metadata: {},
    updatedAt: now,
  };
}

function buildTenantDocument(now) {
  return {
    dateOfBirth: new Date('1992-06-15'),
    tenantStatus: 'active',
    backgroundCheckStatus: 'approved',
    creditScore: 720,
    employmentInfo: {
      employer: 'SmartStart PM',
      position: 'Resident',
      income: 72000,
      startDate: new Date('2022-01-10'),
    },
    emergencyContacts: [
      {
        name: 'Emergency Contact',
        relationship: 'Family',
        phone: '+12395551005',
        email: 'emergency-contact@example.com',
      },
    ],
    documents: [],
    applicationDate: now,
    lastStatusUpdate: now,
    leaseHistory: [],
    statusHistory: [],
  };
}

async function run() {
  if (process.env.PROVISION_BOOTSTRAP_ACCOUNTS !== 'true') {
    console.log('Bootstrap account provisioning disabled');
    return;
  }

  const accounts = buildAccountSpecs();
  if (accounts.length === 0) {
    console.log('No bootstrap account credentials found in environment');
    return;
  }

  const uri = normalizeUri(
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/propertypro'
  );

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

  try {
    const users = mongoose.connection.db.collection('users');
    for (const account of accounts) {
      const now = new Date();
      const passwordHash = await bcrypt.hash(account.password, 12);
      const document = buildBaseDocument(account, passwordHash, now);
      const tenantFields = account.role === 'tenant' ? buildTenantDocument(now) : {};

      await users.updateOne(
        { email: account.email.toLowerCase() },
        {
          $set: { ...document, ...tenantFields },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );

      console.log(`Provisioned bootstrap account: ${account.email} (${account.role})`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Bootstrap account provisioning failed:', error.message);
  process.exit(1);
});

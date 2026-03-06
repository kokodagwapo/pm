/**
 * SmartStartPM - AI Assistants Seed Script
 * Creates system users for AI assistants (Jack and Heidi)
 *
 * Usage: npm run seed:ai-assistants
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import User from '../models/User';

const AI_ASSISTANT_ACCOUNTS = [
  {
    email: 'ai-jack@smartstart.us',
    password: 'AISystemUser_Jack_2024!',
    firstName: 'Jack',
    lastName: 'AI Assistant',
    role: 'admin',
    phone: '+1000000001',
    isActive: true,
    emailVerified: new Date(),
    isSystemUser: true,
    systemUserType: 'ai_assistant',
    metadata: {
      assistantId: 'ai-jack',
      gender: 'male',
      specialties: ['maintenance', 'property_info', 'general', 'emergencies'],
    },
  },
  {
    email: 'ai-heidi@smartstart.us',
    password: 'AISystemUser_Heidi_2024!',
    firstName: 'Heidi',
    lastName: 'AI Assistant',
    role: 'admin',
    phone: '+1000000002',
    isActive: true,
    emailVerified: new Date(),
    isSystemUser: true,
    systemUserType: 'ai_assistant',
    metadata: {
      assistantId: 'ai-heidi',
      gender: 'female',
      specialties: ['leasing', 'payments', 'tenant_support', 'documents'],
    },
  },
];

async function seedAIAssistants() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('Error: MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    console.log('Seeding AI assistant accounts...');
    
    for (const account of AI_ASSISTANT_ACCOUNTS) {
      try {
        const existingUser = await User.findOne({ email: account.email });
        
        if (existingUser) {
          console.log(`  - Updating existing AI assistant: ${account.email}`);
          await User.findOneAndUpdate(
            { email: account.email },
            {
              ...account,
              updatedAt: new Date(),
            },
            { new: true }
          );
        } else {
          console.log(`  - Creating new AI assistant: ${account.email}`);
          await User.create(account);
        }
        
        console.log(`    ✓ ${account.firstName} (${account.email}) - ready`);
      } catch (error) {
        console.error(`    ✗ Error processing ${account.email}:`, error);
      }
    }

    console.log('\nAI Assistant seeding complete!');
    console.log('\nAI Assistants created:');
    console.log('─'.repeat(50));
    console.log('Jack (ai-jack@smartstart.us)');
    console.log('  - Specialties: Maintenance, Property Info, Emergencies');
    console.log('Heidi (ai-heidi@smartstart.us)');
    console.log('  - Specialties: Leasing, Payments, Tenant Support');
    console.log('─'.repeat(50));
    console.log('\nNote: These are system users for AI messaging and cannot be used for login.');

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedAIAssistants();

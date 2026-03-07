import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import User from './src/models/User';

async function testLogin() {
    let rawUri = process.env.MONGODB_URI;
    if (!rawUri) { throw new Error('MONGODB_URI not defined'); }
    if (rawUri.includes('=') && !rawUri.startsWith('mongodb')) {
        rawUri = rawUri.substring(rawUri.indexOf('=') + 1).trim();
    }

    await mongoose.connect(rawUri);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: 'hi@smartstart.us' }).select('+password') as any;
    if (!user) {
        console.log('❌ User not found!');
        process.exit(1);
    }

    console.log('User found:', { email: user.email, role: user.role, isActive: user.isActive });
    console.log('Has password field:', !!user.password);
    console.log('Password hash prefix:', user.password?.substring(0, 20) + '...');

    try {
        const isValid = await user.comparePassword('SmartStart2025');
        console.log('Password "SmartStart2025" valid:', isValid);
    } catch (err: any) {
        console.error('comparePassword error:', err.message);
    }

    await mongoose.disconnect();
    process.exit(0);
}

testLogin().catch(console.error);

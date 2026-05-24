import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { signToken, COOKIE_NAME, MAX_AGE } from '@/lib/auth';
import User from '@/models/User';

const SUPER_ADMIN_ROLL = process.env.SUPER_ADMIN_ROLL ?? '';

export async function POST(req: NextRequest) {
  try {
    const { rollNumber, name, password } = await req.json();

    if (!rollNumber || !name || !password) {
      return NextResponse.json({ error: 'Roll number, name and password are required' }, { status: 400 });
    }

    const roll = rollNumber.trim().toUpperCase();

    if (roll.length < 4) {
      return NextResponse.json({ error: 'Invalid roll number' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ rollNumber: roll });
    if (existing) {
      return NextResponse.json({ error: 'This roll number is already registered' }, { status: 409 });
    }

    const isSuperAdmin = SUPER_ADMIN_ROLL !== '' && roll === SUPER_ADMIN_ROLL.toUpperCase();

    const user = await User.create({
      rollNumber: roll,
      name: name.trim(),
      passwordEncrypted: encrypt(password),
      isAdmin: isSuperAdmin,
      isSuperAdmin,
    });

    const token = await signToken({
      userId:      String(user._id),
      rollNumber:  user.rollNumber,
      name:        user.name,
      isAdmin:     user.isAdmin,
      isSuperAdmin:user.isSuperAdmin,
    });

    const res = NextResponse.json({
      message: 'Account created',
      user: { rollNumber: user.rollNumber, name: user.name, isAdmin: user.isAdmin },
    }, { status: 201 });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    });

    return res;
  } catch (err: any) {
    console.error('[signup]', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { decrypt, encrypt } from '@/lib/crypto';
import User from '@/models/User';

// GET — returns all users with plain passwords, accessible only to super admin
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get('__session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await verifyToken(token);
  if (!session?.isSuperAdmin) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }

  await connectDB();
  const users = await User.find({}).select('-__v').sort({ createdAt: 1 }).lean();

  const rows = users.map((u, i) => ({
    _id: String(u._id),
    index: i + 1,
    rollNumber: u.rollNumber,
    name: u.name,
    plainPassword: u.passwordEncrypted ? decrypt(u.passwordEncrypted) : '—',
    isAdmin: u.isAdmin,
    isSuperAdmin: u.isSuperAdmin,
    createdAt: u.createdAt,
  }));

  return NextResponse.json({ users: rows });
}

// PATCH — update student password directly by rollNumber or userId
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get('__session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await verifyToken(token);
  if (!session?.isSuperAdmin) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }

  const { rollNumber, userId, newPassword } = await req.json();
  if (!newPassword || newPassword.trim().length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
  }

  await connectDB();
  const encrypted = encrypt(newPassword.trim());

  let user;
  if (rollNumber) {
    user = await User.findOneAndUpdate(
      { rollNumber: rollNumber.trim().toUpperCase() },
      { passwordEncrypted: encrypted }
    );
  } else if (userId) {
    user = await User.findByIdAndUpdate(userId, { passwordEncrypted: encrypted });
  }

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Password updated successfully' });
}

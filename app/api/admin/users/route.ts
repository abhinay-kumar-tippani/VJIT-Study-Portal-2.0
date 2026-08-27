import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { decrypt, encrypt } from '@/lib/crypto';
import User from '@/models/User';

async function getSuperAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get('__session')?.value;
  if (!token) return null;
  return verifyToken(token);
}

// GET — list all users (password only shown to super admin)
export async function GET(req: NextRequest) {
  const session = await getSuperAdmin(req);
  if (!session?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const users = await User.find({}).select('-__v').lean();

  const rows = users.map((u) => ({
    _id:          String(u._id),
    rollNumber:   u.rollNumber,
    name:         u.name,
    isAdmin:      u.isAdmin,
    isSuperAdmin: u.isSuperAdmin,
    createdAt:    u.createdAt,
    // Only expose decrypted password to super admin
    ...(session.isSuperAdmin && {
      plainPassword: u.passwordEncrypted ? decrypt(u.passwordEncrypted) : '—',
    }),
  }));

  return NextResponse.json({ users: rows, isSuperAdmin: session.isSuperAdmin });
}

// PATCH — update user (toggle admin status OR edit password)
export async function PATCH(req: NextRequest) {
  const session = await getSuperAdmin(req);
  if (!session?.isSuperAdmin) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

  const body = await req.json();
  const { userId, isAdmin, newPassword } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  await connectDB();

  const updateData: Record<string, any> = {};

  if (typeof isAdmin === 'boolean') {
    updateData.isAdmin = isAdmin;
  }

  if (newPassword && typeof newPassword === 'string') {
    if (newPassword.trim().length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    updateData.passwordEncrypted = encrypt(newPassword.trim());
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields provided to update' }, { status: 400 });
  }

  await User.findByIdAndUpdate(userId, updateData);
  return NextResponse.json({ message: 'User updated successfully' });
}

// DELETE — remove user
export async function DELETE(req: NextRequest) {
  const session = await getSuperAdmin(req);
  if (!session?.isSuperAdmin) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

  const { userId } = await req.json();
  await connectDB();
  await User.findByIdAndDelete(userId);
  return NextResponse.json({ message: 'User deleted successfully' });
}

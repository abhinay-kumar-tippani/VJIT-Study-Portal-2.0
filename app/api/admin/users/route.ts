import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import User from '@/models/User';

async function getSuperAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
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
    // Only expose decrypted password to super admin (guard against legacy records)
    ...(session.isSuperAdmin && {
      plainPassword: u.passwordEncrypted ? decrypt(u.passwordEncrypted) : '—',
    }),
  }));

  return NextResponse.json({ users: rows, isSuperAdmin: session.isSuperAdmin });
}

// PATCH — toggle admin
export async function PATCH(req: NextRequest) {
  const session = await getSuperAdmin(req);
  if (!session?.isSuperAdmin) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

  const { userId, isAdmin } = await req.json();
  await connectDB();
  await User.findByIdAndUpdate(userId, { isAdmin });
  return NextResponse.json({ message: 'Updated' });
}

// DELETE — remove user
export async function DELETE(req: NextRequest) {
  const session = await getSuperAdmin(req);
  if (!session?.isSuperAdmin) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

  const { userId } = await req.json();
  await connectDB();
  await User.findByIdAndDelete(userId);
  return NextResponse.json({ message: 'Deleted' });
}

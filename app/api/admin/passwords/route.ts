import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import User from '@/models/User';

// GET — returns all users with plain passwords, accessible only to super admin
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await verifyToken(token);
  if (!session?.isSuperAdmin) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }

  await connectDB();
  const users = await User.find({}).select('-__v').sort({ createdAt: 1 }).lean();

  const rows = users.map((u, i) => ({
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

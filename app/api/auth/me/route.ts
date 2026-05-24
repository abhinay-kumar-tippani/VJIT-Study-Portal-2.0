import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { getBranchFromRollNumber } from '@/lib/branch';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  
  const branch = getBranchFromRollNumber(session.rollNumber);
  return NextResponse.json({
    ...session,
    branch,
  });
}

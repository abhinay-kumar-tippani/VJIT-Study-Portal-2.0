import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { signToken, COOKIE_NAME, MAX_AGE } from '@/lib/auth';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    // Read raw body first so we can log malformed requests for debugging
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (parseErr) {
      console.error('[login] invalid JSON body:', rawBody);
      const truncated = rawBody?.length > 1000 ? rawBody.slice(0, 1000) + '...(truncated)' : rawBody;
      return NextResponse.json(
        {
          error: 'Server error',
          detail:
            process.env.NODE_ENV !== 'production'
              ? `Invalid JSON body: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}; raw=${truncated}`
              : undefined,
        },
        { status: 500 }
      );
    }

    const { rollNumber, password } = body;

    if (!rollNumber || !password) {
      return NextResponse.json({ error: 'Roll number and password are required' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ rollNumber: rollNumber.trim().toUpperCase() });
    if (!user) {
      return NextResponse.json({ error: 'Roll number not found. Please sign up first.' }, { status: 404 });
    }

    const plain = decrypt(user.passwordEncrypted);
    if (plain !== password) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const token = await signToken({
      userId:      String(user._id),
      rollNumber:  user.rollNumber,
      name:        user.name,
      isAdmin:     user.isAdmin,
      isSuperAdmin:user.isSuperAdmin,
    });

    const res = NextResponse.json({
      message: 'Logged in',
      user: { rollNumber: user.rollNumber, name: user.name, isAdmin: user.isAdmin },
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    });

    return res;
  } catch (err: unknown) {
    console.error('[login]', err);
    return NextResponse.json(
      {
        error: 'Server error',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
}
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Resource from '@/models/Resource';

export async function GET(req: NextRequest) {
  try {
    const db = await connectDB();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // 1. Fetch total registered users
    const totalUsers = await User.countDocuments({});

    // 2. Fetch top 5 contributors with approved contributions
    const contributors = await Resource.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$uploadedBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Populate user names for each contributor
    const topContributors = await Promise.all(
      contributors.map(async (c) => {
        const user = await User.findOne({ rollNumber: c._id }).select('name').lean();
        return {
          rollNumber: c._id,
          name: user?.name || 'Unknown Student',
          count: c.count
        };
      })
    );

    return NextResponse.json({ totalUsers, topContributors });
  } catch (err: any) {
    console.error('[api/stats]', err);
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}

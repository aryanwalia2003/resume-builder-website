import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Generation from '@/models/Generation';

// Poll for generation status
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // Job ID
) {
  try {
    await connectMongo();
    const { id } = await params;

    const job = await Generation.findById(id).select('-resume_data').lean();

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: job }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

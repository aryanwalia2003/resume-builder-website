import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Resume from '@/models/Resume';
import ResumeVersion from '@/models/ResumeVersion';

/**
 * GET /api/resumes
 * List all resumes. Supports ?group=true to group by meta_code.
 */
export async function GET(req: Request) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const group = searchParams.get('group');

    const resumes = await Resume.find({})
      .select('title meta_code current_version createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    if (group === 'true') {
      const grouped = resumes.reduce((acc: Record<string, any[]>, resume: any) => {
        const code = resume.meta_code || 'OTHER';
        if (!acc[code]) acc[code] = [];
        acc[code].push(resume);
        return acc;
      }, {});
      return NextResponse.json({ success: true, data: grouped }, { status: 200 });
    }

    return NextResponse.json({ success: true, data: resumes }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/resumes
 * Create a new resume from a full JSON payload.
 * Body: { meta_code: string, title: string, data: ResumeJSON }
 *
 * The `data` field MUST conform to the resume JSON schema:
 * { meta, basics, work[], skills[], projects[], education[] }
 *
 * Automatically extracts meta.code into meta_code if not provided at top level.
 */
export async function POST(req: Request) {
  try {
    await connectMongo();
    const body = await req.json();

    let { meta_code, title, data } = body;

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: data (the full resume JSON payload)' },
        { status: 400 }
      );
    }

    // Auto-extract meta_code from data.meta.code if not provided at top-level
    if (!meta_code && data?.meta?.code) {
      meta_code = data.meta.code;
    }

    // Auto-generate title from basics.name.full + meta_code if not provided
    if (!title) {
      const name = data?.basics?.name?.full || 'Untitled';
      title = meta_code ? `${name} – ${meta_code}` : name;
    }

    if (!meta_code) {
      return NextResponse.json(
        { success: false, error: 'Missing meta_code. Provide it at top-level or inside data.meta.code' },
        { status: 400 }
      );
    }

    const newResume = await Resume.create({
      meta_code,
      title,
      data,
      current_version: 1,
    });

    // Create the first version snapshot
    await ResumeVersion.create({
      resume_id: newResume._id,
      version_number: 1,
      data,
    });

    return NextResponse.json({ success: true, data: newResume }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

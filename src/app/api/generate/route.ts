import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Generation from '@/models/Generation';
import Resume from '@/models/Resume';
import ResumeVersion from '@/models/ResumeVersion';
import { generateOutputFilename } from '@/lib/filename';

/**
 * POST /api/generate
 * Create a new PDF generation job.
 * Body: { resume_id: string }
 *
 * This pushes a job document to the `generations` collection with:
 * - Full resume_data snapshot (so the engine doesn't need to query again)
 * - output_filename following the convention: {FirstName}_{meta}_YYMM_v{N}
 * - status: PENDING
 *
 * The Python engine should watch for new PENDING documents via CDC (Change Streams)
 * or poll this collection, pick up the job, compile the LaTeX, and update
 * the status to PROCESSING -> COMPLETED/FAILED.
 */
export async function POST(req: Request) {
  try {
    await connectMongo();
    const body = await req.json();

    const { resume_id } = body;

    if (!resume_id) {
      return NextResponse.json({ success: false, error: 'Missing resume_id' }, { status: 400 });
    }

    const resume = await Resume.findById(resume_id).lean() as any;
    if (!resume) {
      return NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
    }

    // Fetch the latest version snapshot data for the engine
    const latestVersion = await ResumeVersion.findOne({
      resume_id,
      version_number: resume.current_version,
    }).lean() as any;

    // Deep clone the data to avoid Mongoose proxy issues
    const resumeData = JSON.parse(JSON.stringify(latestVersion?.data || resume.data));

    // Extract name: try basics.name.full, then fall back to resume title
    const fullName = resumeData?.basics?.name?.full
      || (resume.title ? resume.title.split('–')[0].trim() : null)
      || 'Unknown';

    // Extract meta code with fallback chain
    const metaCode = (resume.meta_code && resume.meta_code !== '')
      ? resume.meta_code
      : (resumeData?.meta?.code || 'RESUME');

    const outputFilename = generateOutputFilename(fullName, metaCode, resume.current_version);

    // Create a new job queue entry in 'PENDING' state
    const job = await Generation.create({
      resume_id,
      version_number: resume.current_version,
      status: 'PENDING',
      output_filename: outputFilename,
      resume_data: resumeData,
      meta_code: metaCode,
    });

    return NextResponse.json(
      {
        success: true,
        data: job,
        output_filename: outputFilename,
        message: `Generation job queued: ${outputFilename}.pdf`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/generate
 * List all generation jobs. Supports ?resume_id=xxx to filter by resume.
 */
export async function GET(req: Request) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const resumeId = searchParams.get('resume_id');

    const filter: any = {};
    if (resumeId) filter.resume_id = resumeId;

    const jobs = await Generation.find(filter)
      .select('-resume_data') // Don't send the full data in listing
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: jobs }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

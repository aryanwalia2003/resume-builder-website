import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Resume from '@/models/Resume';
import ResumeVersion from '@/models/ResumeVersion';
import { diffSections, generateChangeSummary } from '@/lib/diff';

/**
 * POST /api/resumes/upload
 * Upload a complete resume JSON payload.
 * This is the primary endpoint for ingesting a full JSON file.
 *
 * Body: The raw resume JSON payload itself, e.g.:
 * {
 *   "meta": { "code": "SWE" },
 *   "basics": { "name": { "full": "John Doe" }, ... },
 *   "work": [...],
 *   "skills": [...],
 *   "projects": [...],
 *   "education": [...]
 * }
 *
 * OR wrapped: { "title": "My Resume", "data": { ... } }
 */
export async function POST(req: Request) {
  try {
    await connectMongo();
    const body = await req.json();

    let data: any;
    let title: string | undefined;

    // Support both { data: {...} } wrapper and raw JSON payload
    if (body.data && (body.data.meta || body.data.basics)) {
      // Wrapped format: { title?: string, data: ResumeJSON }
      data = body.data;
      title = body.title;
    } else if (body.meta || body.basics) {
      // Raw format: the body IS the resume JSON
      data = body;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payload. Expected a resume JSON with at least "meta" or "basics" fields, or wrap it as { data: { ... } }.',
        },
        { status: 400 }
      );
    }

    // Extract meta_code
    const meta_code = data?.meta?.code;
    if (!meta_code) {
      return NextResponse.json(
        { success: false, error: 'Missing meta.code in resume JSON. This field is required.' },
        { status: 400 }
      );
    }

    // Auto-generate title if not provided
    if (!title) {
      const name = data?.basics?.name?.full || 'Untitled Resume';
      title = `${name} – ${meta_code}`;
    }

    // Check if a resume with the same meta_code already exists (optional: upsert behavior)
    const existingResume = await Resume.findOne({ meta_code });

    if (existingResume) {
      // Update existing resume with new data, create a new version
      const nextVersion = existingResume.current_version + 1;
      const changedSections = diffSections(existingResume.data, data);
      const changeSummary = generateChangeSummary(changedSections);

      await ResumeVersion.create({
        resume_id: existingResume._id,
        version_number: nextVersion,
        data,
        changed_sections: changedSections,
        change_summary: changeSummary,
        change_type: 'upload',
      });

      existingResume.data = data;
      existingResume.current_version = nextVersion;
      existingResume.title = title;
      existingResume.markModified('data');
      await existingResume.save();

      return NextResponse.json(
        {
          success: true,
          action: 'updated',
          message: `Existing "${meta_code}" profile updated to v${nextVersion}.`,
          data: existingResume,
        },
        { status: 200 }
      );
    }

    // Create brand new resume
    const newResume = await Resume.create({
      meta_code,
      title,
      data,
      current_version: 1,
    });

    await ResumeVersion.create({
      resume_id: newResume._id,
      version_number: 1,
      data,
      changed_sections: Object.keys(data),
      change_summary: 'Initial upload',
      change_type: 'upload',
    });

    return NextResponse.json(
      {
        success: true,
        action: 'created',
        message: `New "${meta_code}" profile created.`,
        data: newResume,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

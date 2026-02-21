import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Resume from '@/models/Resume';
import ResumeVersion from '@/models/ResumeVersion';
import Generation from '@/models/Generation';
import { diffSections, generateChangeSummary } from '@/lib/diff';

/**
 * GET /api/resumes/[id]
 * Fetch a single resume with its full JSON data.
 * Supports ?versions=true to include version history.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const includeVersions = searchParams.get('versions') === 'true';

    const resume = await Resume.findById(id).lean();

    if (!resume) {
      return NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
    }

    let versions = null;
    if (includeVersions) {
      versions = await ResumeVersion.find({ resume_id: id })
        .sort({ version_number: -1 })
        .select('version_number createdAt')
        .lean();
    }

    return NextResponse.json({
      success: true,
      data: resume,
      ...(versions && { versions }),
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/resumes/[id]
 * Full update — replaces the entire `data` payload.
 * Always creates a new version snapshot (immutable history).
 *
 * Body: { data: ResumeJSON, title?: string, meta_code?: string }
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;
    const body = await req.json();

    const { data, title, meta_code } = body;

    if (!data) {
      return NextResponse.json({ success: false, error: 'Missing data field' }, { status: 400 });
    }

    const currentResume = await Resume.findById(id);

    if (!currentResume) {
      return NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
    }

    // Diff to find which sections actually changed
    const changedSections = diffSections(currentResume.data, data);

    // Skip version creation if nothing actually changed
    if (changedSections.length === 0) {
      // Still update title/meta_code if provided
      let updated = false;
      if (title) { currentResume.title = title; updated = true; }
      if (meta_code) { currentResume.meta_code = meta_code; updated = true; }
      if (updated) await currentResume.save();

      return NextResponse.json({
        success: true,
        no_change: true,
        message: 'No changes detected — version not created.',
        data: currentResume,
      }, { status: 200 });
    }

    const changeSummary = generateChangeSummary(changedSections);

    // Create a version snapshot only when there are actual changes
    const nextVersion = currentResume.current_version + 1;

    await ResumeVersion.create({
      resume_id: id,
      version_number: nextVersion,
      data,
      changed_sections: changedSections,
      change_summary: changeSummary,
      change_type: 'edit',
    });

    // Update the active resume document
    currentResume.data = data;
    currentResume.current_version = nextVersion;
    if (title) currentResume.title = title;
    if (meta_code) currentResume.meta_code = meta_code;

    await currentResume.save();
    return NextResponse.json({ success: true, data: currentResume }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/resumes/[id]
 * Partial / Section-level update. Updates only the specified section(s) of the data payload.
 * Does NOT create a new version (use PUT for that).
 *
 * Body: { section: "basics" | "work" | "education" | "skills" | "projects" | "meta", value: any }
 * OR:   { sections: { basics: {...}, skills: [...] } }  (to update multiple sections at once)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;
    const body = await req.json();

    const currentResume = await Resume.findById(id);

    if (!currentResume) {
      return NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
    }

    const validSections = ['meta', 'basics', 'work', 'education', 'skills', 'projects'];

    // Single section update
    if (body.section && body.value !== undefined) {
      if (!validSections.includes(body.section)) {
        return NextResponse.json(
          { success: false, error: `Invalid section: ${body.section}. Valid: ${validSections.join(', ')}` },
          { status: 400 }
        );
      }
      currentResume.data = { ...currentResume.data, [body.section]: body.value };
      
      // If updating meta.code, also update top-level meta_code
      if (body.section === 'meta' && body.value?.code) {
        currentResume.meta_code = body.value.code;
      }
    }
    // Multi-section update
    else if (body.sections && typeof body.sections === 'object') {
      const invalidKeys = Object.keys(body.sections).filter(k => !validSections.includes(k));
      if (invalidKeys.length > 0) {
        return NextResponse.json(
          { success: false, error: `Invalid sections: ${invalidKeys.join(', ')}. Valid: ${validSections.join(', ')}` },
          { status: 400 }
        );
      }
      currentResume.data = { ...currentResume.data, ...body.sections };

      if (body.sections.meta?.code) {
        currentResume.meta_code = body.sections.meta.code;
      }
    }
    // Also allow updating top-level fields (title)
    else if (body.title) {
      currentResume.title = body.title;
    }
    else {
      return NextResponse.json(
        { success: false, error: 'Body must contain { section, value } or { sections: {...} } or { title }' },
        { status: 400 }
      );
    }

    currentResume.markModified('data');
    await currentResume.save();

    return NextResponse.json({ success: true, data: currentResume }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/resumes/[id]
 * Deletes a resume and ALL its associated versions and generation jobs.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;

    const resume = await Resume.findById(id);

    if (!resume) {
      return NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
    }

    // Delete all associated versions and generation jobs
    await ResumeVersion.deleteMany({ resume_id: id });
    await Generation.deleteMany({ resume_id: id });
    await Resume.findByIdAndDelete(id);

    return NextResponse.json(
      { success: true, message: `Resume "${resume.title}" and all associated data deleted.` },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import ResumeVersion from '@/models/ResumeVersion';
import Resume from '@/models/Resume';
import { diffSections, generateChangeSummary } from '@/lib/diff';

/**
 * GET /api/resumes/[id]/versions
 * List all version snapshots for a resume.
 * Supports ?version=N to fetch a specific version's full data.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const specificVersion = searchParams.get('version');

    if (specificVersion) {
      const version = await ResumeVersion.findOne({
        resume_id: id,
        version_number: parseInt(specificVersion),
      }).lean();

      if (!version) {
        return NextResponse.json(
          { success: false, error: `Version ${specificVersion} not found` },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: version }, { status: 200 });
    }

    // List all versions (without full data payload for performance)
    const versions = await ResumeVersion.find({ resume_id: id })
      .select('version_number createdAt changed_sections change_summary change_type')
      .sort({ version_number: -1 })
      .lean();

    return NextResponse.json({ success: true, data: versions }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/resumes/[id]/versions
 * Rollback: Restore a specific version as the current active data.
 * Body: { version_number: number }
 *
 * This creates a NEW version (with the rolled-back data) so the history is preserved.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;
    const body = await req.json();
    const { version_number } = body;

    if (!version_number) {
      return NextResponse.json(
        { success: false, error: 'Missing version_number in body' },
        { status: 400 }
      );
    }

    // Fetch the version to rollback to
    const targetVersion = await ResumeVersion.findOne({
      resume_id: id,
      version_number: parseInt(version_number),
    }).lean() as any;

    if (!targetVersion) {
      return NextResponse.json(
        { success: false, error: `Version ${version_number} not found` },
        { status: 404 }
      );
    }

    const resume = await Resume.findById(id);
    if (!resume) {
      return NextResponse.json(
        { success: false, error: 'Resume not found' },
        { status: 404 }
      );
    }

    // Diff sections between current and rolled-back data
    const changedSections = diffSections(resume.data, targetVersion.data);

    // Create a NEW version with the rolled-back data (preserving full history)
    const nextVersion = resume.current_version + 1;

    await ResumeVersion.create({
      resume_id: id,
      version_number: nextVersion,
      data: targetVersion.data,
      changed_sections: changedSections,
      change_summary: `Rolled back to v${version_number}`,
      change_type: 'rollback',
    });

    // Update the active resume
    resume.data = targetVersion.data;
    resume.current_version = nextVersion;
    resume.markModified('data');
    await resume.save();

    return NextResponse.json(
      {
        success: true,
        message: `Rolled back to v${version_number}. Created as new v${nextVersion}.`,
        data: resume,
        new_version: nextVersion,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

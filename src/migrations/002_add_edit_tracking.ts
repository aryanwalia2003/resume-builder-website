/**
 * Migration 002: Add Edit Tracking to ResumeVersions
 * ---------------------------------------------------
 * Adds changed_sections, change_summary, and change_type fields
 * to existing resume_versions documents.
 */

import { Db } from 'mongodb';

export const name = '002_add_edit_tracking';
export const description = 'Adds edit tracking fields (changed_sections, change_type) to resume_versions';

export async function up(db: Db) {
  console.log('  [002] Adding edit tracking fields to resumeversions...');

  // Backfill existing documents with default values
  await db.collection('resumeversions').updateMany(
    { changed_sections: { $exists: false } },
    {
      $set: {
        changed_sections: [],
        change_summary: null,
        change_type: 'edit',
      }
    }
  );

  // Index for querying versions by change type
  await db.collection('resumeversions').createIndex(
    { resume_id: 1, change_type: 1 }
  );

  console.log('  [002] Edit tracking fields added.');
}

export async function down(db: Db) {
  console.log('  [002] Removing edit tracking fields from resumeversions...');

  await db.collection('resumeversions').updateMany(
    {},
    {
      $unset: {
        changed_sections: '',
        change_summary: '',
        change_type: '',
      }
    }
  );

  console.log('  [002] Edit tracking fields removed.');
}

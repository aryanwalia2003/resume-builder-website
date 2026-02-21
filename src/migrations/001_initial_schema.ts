/**
 * Migration 001: Initial Schema & Indexes
 * ----------------------------------------
 * Creates the necessary indexes for the 5 core collections.
 * MongoDB is schema-less, so creating the index implicitly
 * creates the collection and enforces data constraints.
 *
 * Collections: users, resumes, resume_versions, generations, uploads
 */

import { Db } from 'mongodb';

export const name = '001_initial_schema';
export const description = 'Creates indexes for all 5 core collections';

export async function up(db: Db) {
  console.log('  [001] Creating indexes for core schema...');

  // 1. Users — unique email
  await db.collection('users').createIndex(
    { email: 1 },
    { unique: true }
  );

  // 2. Resumes — query by user + sort by updated_at
  await db.collection('resumes').createIndex(
    { user_id: 1, updatedAt: -1 }
  );

  // 3. ResumeVersions — unique version per resume
  await db.collection('resumeversions').createIndex(
    { resume_id: 1, version_number: -1 },
    { unique: true }
  );

  // 4. Generations — recent builds per resume
  await db.collection('generations').createIndex(
    { resume_id: 1, createdAt: -1 }
  );

  // 5. Uploads — unique per generation + status lookup
  await db.collection('uploads').createIndex(
    { generation_id: 1 },
    { unique: true }
  );
  await db.collection('uploads').createIndex(
    { status: 1 }
  );

  console.log('  [001] All indexes created successfully.');
}

export async function down(db: Db) {
  console.log('  [001] Dropping all indexes...');

  const collections = ['users', 'resumes', 'resumeversions', 'generations', 'uploads'];
  for (const col of collections) {
    try {
      await db.collection(col).dropIndexes();
    } catch (e) {
      // Collection might not exist yet
    }
  }

  console.log('  [001] All indexes dropped.');
}

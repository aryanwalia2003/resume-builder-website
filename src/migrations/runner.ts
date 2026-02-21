/**
 * Migration Runner
 * ----------------
 * Runs all pending migrations in order.
 * Tracks which migrations have been applied in a `_migrations` collection.
 *
 * Usage (from API): POST /api/migrate
 */

import { Db } from 'mongodb';

// Import all migrations in order
import * as m001 from './001_initial_schema';
import * as m002 from './002_add_edit_tracking';

interface Migration {
  name: string;
  description: string;
  up: (db: Db) => Promise<void>;
  down: (db: Db) => Promise<void>;
}

// Register migrations in order
const ALL_MIGRATIONS: Migration[] = [
  m001,
  m002,
];

/**
 * Run all pending migrations (up)
 */
export async function runMigrations(db: Db): Promise<string[]> {
  const migrationsCollection = db.collection('_migrations');
  const applied: string[] = [];

  for (const migration of ALL_MIGRATIONS) {
    const existing = await migrationsCollection.findOne({ name: migration.name });

    if (!existing) {
      console.log(`Running migration: ${migration.name} — ${migration.description}`);
      await migration.up(db);

      await migrationsCollection.insertOne({
        name: migration.name,
        description: migration.description,
        applied_at: new Date(),
      });

      applied.push(migration.name);
    } else {
      console.log(`Skipping migration: ${migration.name} (already applied)`);
    }
  }

  return applied;
}

/**
 * Rollback ALL migrations (down) — used by nuke
 */
export async function rollbackAll(db: Db): Promise<void> {
  // Run in reverse order
  for (const migration of [...ALL_MIGRATIONS].reverse()) {
    console.log(`Rolling back: ${migration.name}`);
    await migration.down(db);
  }

  // Drop the migrations tracking collection
  try {
    await db.collection('_migrations').drop();
  } catch (e) {
    // Might not exist
  }
}

/**
 * Nuke the entire database — drops ALL collections
 */
export async function nukeDatabase(db: Db): Promise<void> {
  console.log('⚠️  NUKING DATABASE — dropping all collections...');

  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.collection(col.name).drop();
    console.log(`  Dropped: ${col.name}`);
  }

  console.log('💀 Database nuked.');
}

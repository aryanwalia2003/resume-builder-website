import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import { runMigrations, nukeDatabase } from '@/migrations/runner';
import mongoose from 'mongoose';

/**
 * POST /api/migrate
 * Run all pending database migrations.
 *
 * Body: { action: "migrate" | "nuke" | "nuke_and_migrate" }
 *
 * - "migrate": Run all pending migrations
 * - "nuke": Drop ALL collections (⚠️ destructive!)
 * - "nuke_and_migrate": Drop everything, then re-run all migrations from scratch
 */
export async function POST(req: Request) {
  try {
    await connectMongo();
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'migrate';

    // Get the raw MongoDB Db instance from Mongoose
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not ready' },
        { status: 500 }
      );
    }

    const log: string[] = [];

    if (action === 'nuke' || action === 'nuke_and_migrate') {
      await nukeDatabase(db);
      log.push('Database nuked — all collections dropped.');

      // Clear Mongoose model caches so they can be re-registered
      for (const modelName of Object.keys(mongoose.models)) {
        delete mongoose.models[modelName];
      }
    }

    if (action === 'migrate' || action === 'nuke_and_migrate') {
      const applied = await runMigrations(db);
      if (applied.length > 0) {
        log.push(`Applied ${applied.length} migration(s): ${applied.join(', ')}`);
      } else {
        log.push('No pending migrations.');
      }
    }

    return NextResponse.json({
      success: true,
      action,
      log,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/migrate
 * Check which migrations have been applied and which are pending.
 */
export async function GET() {
  try {
    await connectMongo();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not ready' },
        { status: 500 }
      );
    }

    const applied = await db.collection('_migrations')
      .find({})
      .sort({ applied_at: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      applied: applied.map(m => ({
        name: m.name,
        description: m.description,
        applied_at: m.applied_at,
      })),
    });
  } catch {
    return NextResponse.json({ success: true, applied: [] });
  }
}

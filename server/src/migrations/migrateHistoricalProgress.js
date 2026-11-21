import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Account from '../models/Account.js';

dotenv.config();

/**
 * Migration: Non-destructive historical progress classifier.
 *
 * Requirements:
 * - Does not assume unverified historical scores are PASSED or FAILED.
 * - Classifies unverified historical records as 'LEGACY_UNKNOWN'.
 * - Preserves existing user XP, rank, achievements, lesson IDs, scores, and timestamps.
 * - Never awards or deducts XP.
 * - Supports dry-run mode and idempotent execution.
 */
export async function migrateHistoricalProgress({ dryRun = true, log = true } = {}) {
  const accounts = await Account.find({});
  const report = {
    totalAccountsInspected: accounts.length,
    totalRecordsExamined: 0,
    recordsAlreadyClassified: 0,
    recordsClassifiedAsLegacyUnknown: 0,
    accountsModified: 0,
    details: []
  };

  for (const account of accounts) {
    let accountModified = false;

    if (!account.completedLessons || account.completedLessons.length === 0) {
      continue;
    }

    for (const record of account.completedLessons) {
      report.totalRecordsExamined++;

      if (record.status) {
        report.recordsAlreadyClassified++;
        continue;
      }

      // Record has no status: classify as LEGACY_UNKNOWN due to client-supplied legacy scoring
      report.recordsClassifiedAsLegacyUnknown++;
      accountModified = true;

      report.details.push({
        userId: account._id,
        userName: account.userName,
        lessonId: record.lessonId,
        score: record.score,
        completedAt: record.completedAt,
        assignedStatus: 'LEGACY_UNKNOWN',
        reason: 'Historical completion record lacks verifiable server-side denominator'
      });

      if (!dryRun) {
        record.status = 'LEGACY_UNKNOWN';
        record.attemptsCount = record.attemptsCount || 1;
        record.bestScore = typeof record.bestScore === 'number' ? record.bestScore : record.score;
      }
    }

    if (accountModified) {
      report.accountsModified++;
      if (!dryRun) {
        // Save without triggering password rehashing (markModified on completedLessons)
        account.markModified('completedLessons');
        await account.save({ validateBeforeSave: false });
      }
    }
  }

  if (log) {
    console.log(`[MIGRATION REPORT] Mode: ${dryRun ? 'DRY-RUN (No writes)' : 'LIVE EXECUTION'}`);
    console.log(`- Accounts inspected: ${report.totalAccountsInspected}`);
    console.log(`- Completed lesson records examined: ${report.totalRecordsExamined}`);
    console.log(`- Records already classified: ${report.recordsAlreadyClassified}`);
    console.log(`- Records classified as LEGACY_UNKNOWN: ${report.recordsClassifiedAsLegacyUnknown}`);
    console.log(`- Accounts to modify / modified: ${report.accountsModified}`);
  }

  return report;
}

// Direct execution guard
if (process.argv[1] && process.argv[1].endsWith('migrateHistoricalProgress.js')) {
  (async () => {
    try {
      const isLive = process.argv.includes('--live');
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/beyond-words';
      await mongoose.connect(uri);
      console.log(`Connected to MongoDB for historical progress migration (${isLive ? 'LIVE' : 'DRY-RUN'})...`);
      const report = await migrateHistoricalProgress({ dryRun: !isLive, log: true });
      if (!isLive) {
        console.log('To apply changes live, re-run with: node src/migrations/migrateHistoricalProgress.js --live');
      }
      await mongoose.disconnect();
    } catch (err) {
      console.error("Migration error:", err);
      process.exit(1);
    }
  })();
}

import XpGrantLedger from '../models/XpGrantLedger.js';
import Account from '../models/Account.js';

/**
 * Service to manage atomic, exactly-once XP grants.
 */
export async function awardFirstPassXp({ userId, lessonId, amount, attemptId }) {
  const grantKey = `${userId}_${lessonId}_FIRST_PASS`;

  // 1. Check if grant record already exists
  let ledgerEntry;
  try {
    ledgerEntry = await XpGrantLedger.create({
      userId,
      lessonId,
      grantType: 'FIRST_PASS',
      amount,
      status: 'PENDING',
      attemptId,
      grantKey
    });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate grant entry detected (Concurrent request or replay)
      ledgerEntry = await XpGrantLedger.findOne({ grantKey });
      if (ledgerEntry && ledgerEntry.status === 'COMMITTED') {
        return { success: true, xpAwarded: 0, reason: 'ALREADY_GRANTED' };
      }
      // If found but PENDING, continue to recovery below
    } else {
      throw err;
    }
  }

  // 2. Atomic conditional update on Account
  // The condition appliedGrantKeys: { $ne: grantKey } guarantees that Account.xp is
  // incremented IF AND ONLY IF this grantKey was not already applied.
  const accountUpdate = await Account.updateOne(
    {
      _id: userId,
      appliedGrantKeys: { $ne: grantKey }
    },
    {
      $inc: { xp: amount },
      $push: { appliedGrantKeys: grantKey }
    }
  );

  // 3. Mark the ledger entry COMMITTED
  await XpGrantLedger.updateOne(
    { grantKey },
    {
      $set: {
        status: 'COMMITTED',
        committedAt: new Date()
      }
    }
  );

  const xpAwarded = accountUpdate.matchedCount === 1 ? amount : 0;
  return {
    success: true,
    xpAwarded,
    alreadyApplied: accountUpdate.matchedCount === 0
  };
}

/**
 * Reconcile any PENDING ledger entries (Crash recovery worker)
 */
export async function reconcilePendingGrants(userId) {
  const query = { status: 'PENDING' };
  if (userId) query.userId = userId;

  const pendingGrants = await XpGrantLedger.find(query);
  const reconciled = [];

  for (const grant of pendingGrants) {
    const user = await Account.findById(grant.userId);
    if (!user) continue;

    const alreadyApplied = user.appliedGrantKeys && user.appliedGrantKeys.includes(grant.grantKey);

    if (!alreadyApplied) {
      // Apply the increment atomically
      await Account.updateOne(
        {
          _id: grant.userId,
          appliedGrantKeys: { $ne: grant.grantKey }
        },
        {
          $inc: { xp: grant.amount },
          $push: { appliedGrantKeys: grant.grantKey }
        }
      );
    }

    // Now safely transition ledger to COMMITTED
    await XpGrantLedger.updateOne(
      { _id: grant._id },
      {
        $set: {
          status: 'COMMITTED',
          committedAt: new Date()
        }
      }
    );

    reconciled.push({ grantKey: grant.grantKey, newlyApplied: !alreadyApplied });
  }

  return reconciled;
}

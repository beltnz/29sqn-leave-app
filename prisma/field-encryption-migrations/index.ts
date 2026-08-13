import type { PrismaClient } from '@prisma/client'
import { migrate as migrateMember } from './Member'
import { migrate as migrateLeaveRequest } from './LeaveRequest'
import { migrate as migrateSecurityIp } from './SecurityIp'
import { migrate as migrateSecurityRule } from './SecurityRule'

export interface ProgressReport {
  model: string
  processed: number
  totalCount: number
  performance: number
}

export type ProgressReportCallback = (
  progress: ProgressReport
) => void | Promise<void>

export const defaultProgressReport: ProgressReportCallback = ({
  model,
  totalCount,
  processed,
  performance
}) => {
  const length = totalCount.toString().length
  const pct = Math.round((100 * processed) / totalCount)
    .toString()
    .padStart(3)
  console.info(
    `${model.padEnd(12)} ${pct}% processed ${processed
      .toString()
      .padStart(length)} / ${totalCount} (took ${performance.toFixed(2)}ms)`
  )
}

// --

export type MigrationReport = {
  Member: number,
  LeaveRequest: number,
  SecurityIp: number,
  SecurityRule: number
}

/**
 * Migrate models sequentially.
 *
 * Processed models:
 * - Member
 * - LeaveRequest
 * - SecurityIp
 * - SecurityRule
 *
 * @returns a dictionary of the number of processed records per model.
 */
export async function migrate(
  client: PrismaClient,
  reportProgress: ProgressReportCallback = defaultProgressReport
): Promise<MigrationReport> {
  const processedMember = await migrateMember(client, reportProgress)
  const processedLeaveRequest = await migrateLeaveRequest(client, reportProgress)
  const processedSecurityIp = await migrateSecurityIp(client, reportProgress)
  const processedSecurityRule = await migrateSecurityRule(client, reportProgress)
  return {
    Member: processedMember,
    LeaveRequest: processedLeaveRequest,
    SecurityIp: processedSecurityIp,
    SecurityRule: processedSecurityRule
  }
}

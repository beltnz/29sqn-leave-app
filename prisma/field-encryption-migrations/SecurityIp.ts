import type { PrismaClient, SecurityIp } from '@prisma/client'
import {
  ProgressReportCallback,
  defaultProgressReport,
  visitRecords
} from 'prisma-field-encryption/dist/generator/runtime'

type Cursor = SecurityIp['id']

export async function migrate(
  client: PrismaClient,
  reportProgress: ProgressReportCallback = defaultProgressReport
): Promise<number> {
  return visitRecords<PrismaClient, Cursor>({
    modelName: 'SecurityIp',
    client,
    getTotalCount: client.securityIp.count,
    migrateRecord,
    reportProgress,
  })
}

async function migrateRecord(client: PrismaClient, cursor: Cursor | undefined) {
  return await client.$transaction(async tx => {
    const record = await tx.securityIp.findFirst({
      take: 1,
      skip: cursor === undefined ? undefined : 1,
      ...(cursor === undefined
        ? {}
        : {
            cursor: {
              id: cursor
            }
          }),
      orderBy: {
        id: 'asc'
      },
      select: {
        id: true,
        reason: true
      }
    })
    if (!record) {
      return cursor
    }
    await tx.securityIp.update({
      where: {
        id: record.id
      },
      data: {
        reason: record.reason
      }
    })
    return record.id
  })
}

/**
 * Internal model:
 * {
 *   "cursor": "id",
 *   "fields": {
 *     "reason": {
 *       "encrypt": true,
 *       "strictDecryption": false
 *     }
 *   },
 *   "connections": {}
 * }
 */

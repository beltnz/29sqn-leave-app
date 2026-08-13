import type { PrismaClient, Member } from '@prisma/client'
import {
  ProgressReportCallback,
  defaultProgressReport,
  visitRecords
} from 'prisma-field-encryption/dist/generator/runtime'

type Cursor = Member['id']

export async function migrate(
  client: PrismaClient,
  reportProgress: ProgressReportCallback = defaultProgressReport
): Promise<number> {
  return visitRecords<PrismaClient, Cursor>({
    modelName: 'Member',
    client,
    getTotalCount: client.member.count,
    migrateRecord,
    reportProgress,
  })
}

async function migrateRecord(client: PrismaClient, cursor: Cursor | undefined) {
  return await client.$transaction(async tx => {
    const record = await tx.member.findFirst({
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
        password: true
      }
    })
    if (!record) {
      return cursor
    }
    await tx.member.update({
      where: {
        id: record.id
      },
      data: {
        password: record.password
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
 *     "password": {
 *       "encrypt": true,
 *       "strictDecryption": false
 *     }
 *   },
 *   "connections": {}
 * }
 */

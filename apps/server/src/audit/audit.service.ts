import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Connection } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema.js';
import type { AuditQueryParams, AuditQueryResponse, AuditLogEntry } from '@hms/types';

export interface CreateAuditLogParams {
  hospitalId?: string;
  tenantId?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  action: string;
  resource: string;
  status?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async record(params: CreateAuditLogParams): Promise<void> {
    try {
      const sanitizedDetails = { ...params.details };
      delete sanitizedDetails.password;
      delete sanitizedDetails.passwordHash;
      delete sanitizedDetails.token;
      delete sanitizedDetails.accessToken;
      delete sanitizedDetails.refreshToken;

      const tenantId = params.tenantId || params.hospitalId;
      const hospitalId = params.hospitalId || params.tenantId;

      await this.auditLogModel.create({
        ...params,
        tenantId,
        hospitalId,
        details: sanitizedDetails,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to record audit log: ${(error as Error).message}`);
    }
  }

  async findRecent(limit = 50): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async findAuditLogs(tenantId: string, query: AuditQueryParams = {}): Promise<AuditQueryResponse> {
    const filter: Record<string, any> = {
      $or: [
        { tenantId },
        { hospitalId: tenantId },
      ],
    };

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) {
        dateFilter.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        if (!query.endDate.includes('T')) {
          end.setHours(23, 59, 59, 999);
        }
        dateFilter.$lte = end;
      }
      filter.timestamp = dateFilter;
    }

    if (query.action && query.action !== 'ALL') {
      filter.action = query.action;
    }

    if (query.resource && query.resource !== 'ALL') {
      filter.resource = query.resource;
    }

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }

    if (query.userId) {
      filter.userId = query.userId;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      const regex = { $regex: term, $options: 'i' };
      filter.$and = [
        {
          $or: [
            { action: regex },
            { resource: regex },
            { userEmail: regex },
            { ipAddress: regex },
          ],
        },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [rawLogs, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    // Enrich missing emails if needed
    const userIdsToLookup = rawLogs
      .filter((l) => !l.userEmail && l.userId && Types.ObjectId.isValid(l.userId))
      .map((l) => new Types.ObjectId(l.userId));

    const userEmailMap = new Map<string, { email: string; name: string }>();
    if (userIdsToLookup.length > 0) {
      try {
        const users = await this.connection
          .collection('users')
          .find({ _id: { $in: userIdsToLookup } }, { projection: { email: 1, firstName: 1, lastName: 1 } })
          .toArray();

        for (const u of users) {
          userEmailMap.set(u._id.toString(), {
            email: u.email,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          });
        }
      } catch (err) {
        this.logger.debug(`User enrichment skipped: ${(err as Error).message}`);
      }
    }

    const logs: AuditLogEntry[] = rawLogs.map((l: any) => {
      const userInfo = userEmailMap.get(l.userId?.toString());
      return {
        id: l._id?.toString() || '',
        _id: l._id?.toString(),
        hospitalId: l.hospitalId,
        tenantId: l.tenantId,
        userId: l.userId?.toString() || '',
        userEmail: l.userEmail || userInfo?.email || 'system@hms.local',
        userName: l.userName || userInfo?.name || 'Authorized Staff',
        action: l.action,
        resource: l.resource,
        status: l.status || 'SUCCESS',
        details: l.details || {},
        ipAddress: l.ipAddress || '127.0.0.1',
        userAgent: l.userAgent || 'Web/HMS',
        timestamp: l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString(),
        createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : undefined,
      };
    });

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async exportAuditLogsCsv(tenantId: string, query: AuditQueryParams = {}): Promise<string> {
    const queryParams: AuditQueryParams = { ...query, page: 1, limit: 1000 };
    const { logs } = await this.findAuditLogs(tenantId, queryParams);

    const headers = ['Timestamp', 'Action', 'Resource', 'Status', 'User ID', 'User Email', 'IP Address', 'Details'];
    const rows = logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.resource.replace(/"/g, '""')}"`,
      `"${l.status.replace(/"/g, '""')}"`,
      `"${l.userId.replace(/"/g, '""')}"`,
      `"${(l.userEmail || '').replace(/"/g, '""')}"`,
      `"${(l.ipAddress || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    // Audit the export action
    await this.record({
      tenantId,
      userId: query.userId || 'system',
      action: 'AUDIT_EXPORT',
      resource: 'AuditLogs',
      details: {
        filter: query,
        recordCount: logs.length,
      },
    });

    return csvContent;
  }
}


import { GrantApplicationStage, Prisma } from "@prisma/client";

export type ServiceResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      status: number;
      message: string;
      details?: unknown;
    };

export type RequestMetadata = {
  ipAddress: string;
  userAgent: string;
};

export type GrantScope = {
  opportunityWhere: Prisma.GrantOpportunityWhereInput;
  applicationWhere: Prisma.GrantApplicationWhereInput;
};

export type GrantMutationResult = {
  id: string;
  stage?: GrantApplicationStage;
  fitScore?: number;
};

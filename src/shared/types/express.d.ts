import type { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  organizationId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};

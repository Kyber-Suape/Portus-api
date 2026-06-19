import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../../src/shared/middlewares/authMiddleware";
import { roleMiddleware } from "../../src/shared/middlewares/roleMiddleware";
import { UnauthorizedError, ForbiddenError } from "../../src/shared/errors/HttpErrors";
import { signToken } from "../../src/shared/utils/jwt";

function buildRequest(overrides: Partial<Request> = {}): Request {
  return { headers: {}, ...overrides } as Request;
}

describe("authMiddleware", () => {
  it("lança UnauthorizedError quando não há cabeçalho Authorization", () => {
    const req = buildRequest();
    const next = vi.fn();

    expect(() => authMiddleware(req, {} as Response, next)).toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it("lança UnauthorizedError quando o token é inválido", () => {
    const req = buildRequest({ headers: { authorization: "Bearer token-invalido" } });

    expect(() => authMiddleware(req, {} as Response, vi.fn())).toThrow(UnauthorizedError);
  });

  it("anexa req.user e chama next quando o token é válido", () => {
    const payload = { id: "user-1", role: UserRole.SYSTEM_ADMIN, organizationId: "org-1" };
    const token = signToken(payload);
    const req = buildRequest({ headers: { authorization: `Bearer ${token}` } });
    const next = vi.fn();

    authMiddleware(req, {} as Response, next);

    expect(req.user).toMatchObject(payload);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("roleMiddleware", () => {
  it("lança UnauthorizedError quando não há usuário autenticado", () => {
    const req = buildRequest();

    expect(() => roleMiddleware(UserRole.SYSTEM_ADMIN)(req, {} as Response, vi.fn())).toThrow(
      UnauthorizedError,
    );
  });

  it("lança ForbiddenError quando o perfil não está autorizado", () => {
    const req = buildRequest({ user: { id: "u1", role: UserRole.AUDITOR, organizationId: "org-1" } });

    expect(() => roleMiddleware(UserRole.SYSTEM_ADMIN)(req, {} as Response, vi.fn())).toThrow(
      ForbiddenError,
    );
  });

  it("chama next quando o perfil está autorizado", () => {
    const req = buildRequest({ user: { id: "u1", role: UserRole.SYSTEM_ADMIN, organizationId: "org-1" } });
    const next = vi.fn();

    roleMiddleware(UserRole.SYSTEM_ADMIN, UserRole.AUDITOR)(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

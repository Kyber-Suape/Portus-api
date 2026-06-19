import { UserRole } from "@prisma/client";
import type { z } from "zod";
import type { registerAdminSchema } from "../../src/modules/auth/auth.schemas";
import type { InvitedUserInput } from "../../src/modules/users/users.schemas";

let sequence = 0;

function nextSequence(): number {
  sequence += 1;
  return sequence;
}

type AdminPayload = z.infer<typeof registerAdminSchema>;

export function buildAdminPayload(overrides: Partial<AdminPayload> = {}): AdminPayload {
  const n = nextSequence();

  return {
    name: `Administrador Teste ${n}`,
    cpf: String(20000000000 + n).slice(0, 11),
    email: `admin${n}@teste.com.br`,
    phone: "81999991111",
    password: "Senha@12345",
    ...overrides,
  };
}

export function buildInvitedUserPayload(overrides: Partial<InvitedUserInput> = {}): InvitedUserInput {
  const n = nextSequence();
  const password = "Convidado@12345";

  return {
    name: `Convidado Teste ${n}`,
    email: `convidado${n}@teste.com.br`,
    phone: "81999992222",
    role: UserRole.SUAPE_INSPECTOR,
    password,
    passwordConfirmation: password,
    ...overrides,
  };
}

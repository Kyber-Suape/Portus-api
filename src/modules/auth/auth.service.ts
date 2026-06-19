import { UserRole } from "@prisma/client";
import { prisma } from "../../config/database";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "../../shared/errors/HttpErrors";
import { comparePassword, hashPassword } from "../../shared/utils/password";
import { signToken } from "../../shared/utils/jwt";
import { organizationsRepository } from "../organizations/organizations.repository";
import { permissionsService } from "../permissions/permissions.service";
import { toSafeUser } from "../users/user.mapper";
import { usersRepository } from "../users/users.repository";
import type { LoginInput, RegisterInput, UpdateMeInput } from "./auth.schemas";

async function assertRegisterPayloadIsUnique(input: RegisterInput) {
  const existingOrganization = await organizationsRepository.findByCnpj(input.organization.cnpj);
  if (existingOrganization) {
    throw new ConflictError("Já existe uma organização cadastrada com este CNPJ.");
  }

  const existingAdminByEmail = await usersRepository.findByEmail(input.admin.email);
  if (existingAdminByEmail) {
    throw new ConflictError("Já existe um usuário cadastrado com este e-mail.");
  }

  const existingAdminByCpf = await usersRepository.findByCpf(input.admin.cpf);
  if (existingAdminByCpf) {
    throw new ConflictError("Já existe um usuário cadastrado com este CPF.");
  }

  const invitedEmails = input.invitedUsers.map((u) => u.email);
  const uniqueInvitedEmails = new Set(invitedEmails);
  if (uniqueInvitedEmails.size !== invitedEmails.length) {
    throw new BadRequestError("Há e-mails duplicados entre os usuários convidados.");
  }

  for (const invited of input.invitedUsers) {
    const existing = await usersRepository.findByEmail(invited.email);
    if (existing) {
      throw new ConflictError(`Já existe um usuário cadastrado com o e-mail ${invited.email}.`);
    }
  }
}

async function register(input: RegisterInput) {
  await assertRegisterPayloadIsUnique(input);

  const passwordHash = await hashPassword(input.admin.password);

  const result = await prisma.$transaction(async (tx) => {
    const organization = await organizationsRepository.create(input.organization, tx);

    const admin = await usersRepository.create(
      {
        name: input.admin.name,
        cpf: input.admin.cpf,
        email: input.admin.email,
        phone: input.admin.phone,
        passwordHash,
        role: UserRole.SYSTEM_ADMIN,
        status: "ACTIVE",
        organization: { connect: { id: organization.id } },
      },
      tx,
    );

    const invitedUsers = [];
    for (const invited of input.invitedUsers) {
      const invitedPasswordHash = await hashPassword(invited.password);
      const user = await usersRepository.create(
        {
          name: invited.name,
          email: invited.email,
          phone: invited.phone,
          passwordHash: invitedPasswordHash,
          role: invited.role,
          status: "ACTIVE",
          organization: { connect: { id: organization.id } },
        },
        tx,
      );

      if (invited.permissionKeys) {
        await permissionsService.applyPermissionOverrides(user.id, user.role, invited.permissionKeys, tx);
      }

      invitedUsers.push(user);
    }

    return { organization, admin, invitedUsers };
  });

  return {
    organization: result.organization,
    admin: toSafeUser(result.admin),
    invitedUsers: result.invitedUsers.map(toSafeUser),
  };
}

async function login(input: LoginInput) {
  const user = await usersRepository.findByEmail(input.email);

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError("Credenciais inválidas.");
  }

  if (user.status === "INACTIVE") {
    throw new UnauthorizedError("Usuário inativo. Contate o Administrador do Sistema.");
  }

  const passwordMatches = await comparePassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError("Credenciais inválidas.");
  }

  const token = signToken({ id: user.id, role: user.role, organizationId: user.organizationId });

  return { token, user: toSafeUser(user) };
}

async function me(userId: string) {
  const user = await usersRepository.findById(userId);
  if (!user) {
    throw new NotFoundError("Usuário não encontrado.");
  }

  const [organization, permissions] = await Promise.all([
    organizationsRepository.findById(user.organizationId),
    permissionsService.getEffectiveKeys(user.id, user.role),
  ]);

  return { user: toSafeUser(user), organization, permissions };
}

async function updateMe(userId: string, input: UpdateMeInput) {
  const current = await usersRepository.findById(userId);
  if (!current) {
    throw new NotFoundError("Usuário não encontrado.");
  }

  if (input.email && input.email !== current.email) {
    const existing = await usersRepository.findByEmail(input.email);
    if (existing && existing.id !== userId) {
      throw new ConflictError("Este e-mail já está em uso.");
    }
  }

  if (input.cpf && input.cpf !== current.cpf) {
    const existing = await usersRepository.findByCpf(input.cpf);
    if (existing && existing.id !== userId) {
      throw new ConflictError("Este CPF já está cadastrado.");
    }
  }

  const passwordHash = input.password ? await hashPassword(input.password) : undefined;

  const updated = await usersRepository.update(userId, {
    name: input.name,
    email: input.email,
    phone: input.phone,
    cpf: input.cpf,
    ...(passwordHash ? { passwordHash } : {}),
  });

  return toSafeUser(updated);
}

export const authService = {
  register,
  login,
  me,
  updateMe,
};

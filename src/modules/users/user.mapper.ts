import type { User } from "@prisma/client";

export type SafeUser = Omit<User, "passwordHash">;

/** Remove o hash de senha antes de qualquer resposta — único ponto de saída de usuários da API. */
export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

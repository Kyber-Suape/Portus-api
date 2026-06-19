import { AppError, type AppErrorDetail } from "./AppError";

export class BadRequestError extends AppError {
  constructor(message = "Requisição inválida", errors?: AppErrorDetail[]) {
    super(message, 400, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Não autenticado") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acesso não autorizado") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflito de dados", errors?: AppErrorDetail[]) {
    super(message, 409, errors);
  }
}

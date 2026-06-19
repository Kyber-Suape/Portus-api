export interface AppErrorDetail {
  field?: string;
  message: string;
}

/** Erro base de domínio/HTTP. Tudo que for lançado intencionalmente pela aplicação deve estender esta classe. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: AppErrorDetail[];

  constructor(message: string, statusCode = 500, errors?: AppErrorDetail[]) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

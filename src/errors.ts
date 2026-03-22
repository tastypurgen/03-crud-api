export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFoundMessage(id: string): string {
  return `Product with id "${id}" was not found`;
}

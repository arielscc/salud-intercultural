export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export async function withDatabaseError<T>(
  operation: string,
  callback: () => Promise<T>
): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    throw new DatabaseError(`Database operation failed: ${operation}`, error);
  }
}

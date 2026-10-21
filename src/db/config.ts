export function localDatabase(environment: Record<string, string | undefined> = process.env) {
  const database = environment.BAYFRAME_DATABASE ?? "postgres";
  if (database !== "postgres" && !/^bf_verify_[a-f0-9]{16}$/.test(database)) {
    throw new Error("Invalid local verification database.");
  }
  return {
    host: "127.0.0.1", port: 55422, database, user: "bayframe_runtime",
    password: environment.BAYFRAME_RUNTIME_PASSWORD,
    ssl: false as const,
  };
}

export function localDatabase(environment: Record<string, string | undefined> = process.env) {
  const database = environment.BAYFRAME_DATABASE ?? "postgres";
  if (database !== "postgres" && !/^bf_verify_[a-f0-9]{16}$/.test(database)) {
    throw new Error("Invalid local verification database.");
  }
  const password = environment.BAYFRAME_RUNTIME_PASSWORD;
  if (!password || !/^[a-f0-9]{64}$/.test(password)) throw new Error("Missing or invalid local runtime password; run db:setup.");
  return {
    host: "127.0.0.1", port: 55422, database, user: "bayframe_runtime",
    password,
    ssl: false as const,
  };
}

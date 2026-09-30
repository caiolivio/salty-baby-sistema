import { defineConfig } from "prisma/config";

// A URL do banco só é necessária para aplicar migrações. Na publicação, ela é
// montada pelo GitHub Actions a partir dos segredos (nunca fica no código).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DATABASE_URL ?? "mysql://sem-banco@127.0.0.1:3306/sem-banco",
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});

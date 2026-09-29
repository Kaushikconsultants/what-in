import { PrismaClient } from '@prisma/client';

export function resolveDatabaseUrl(): string {
  let url =
    process.env.DATABASE_URL ||
    process.env.DATABASE_PUBLIC_URL ||
    process.env.DIRECT_URL ||
    '';

  const user =
    process.env.PGUSER ||
    process.env.POSTGRES_USER ||
    'postgres';
  const pass =
    process.env.PGPASSWORD ||
    process.env.POSTGRES_PASSWORD ||
    '';
  const host =
    process.env.RAILWAY_TCP_PROXY_DOMAIN ||
    process.env.PGHOST ||
    process.env.RAILWAY_PRIVATE_DOMAIN ||
    '';
  const port =
    process.env.RAILWAY_TCP_PROXY_PORT ||
    process.env.PGPORT ||
    '5432';
  const db =
    process.env.PGDATABASE ||
    process.env.POSTGRES_DB ||
    'railway';

  // If url contains template tags like ${{PGUSER}} or ${{RAILWAY_TCP_PROXY_DOMAIN}} or ${{Postgres.PGUSER}}
  if (url.includes('${{') || url.includes('${')) {
    url = url
      .replace(/\$\{\{?\s*PGUSER\s*\}?\}/gi, encodeURIComponent(user))
      .replace(/\$\{\{?\s*PGPASSWORD\s*\}?\}/gi, encodeURIComponent(pass))
      .replace(/\$\{\{?\s*RAILWAY_TCP_PROXY_DOMAIN\s*\}?\}/gi, host)
      .replace(/\$\{\{?\s*RAILWAY_TCP_PROXY_PORT\s*\}?\}/gi, port)
      .replace(/\$\{\{?\s*PGDATABASE\s*\}?\}/gi, db)
      .replace(/\$\{\{?\s*Postgres\.PGUSER\s*\}?\}/gi, encodeURIComponent(user))
      .replace(/\$\{\{?\s*Postgres\.PGPASSWORD\s*\}?\}/gi, encodeURIComponent(pass))
      .replace(/\$\{\{?\s*Postgres\.RAILWAY_TCP_PROXY_DOMAIN\s*\}?\}/gi, host)
      .replace(/\$\{\{?\s*Postgres\.RAILWAY_TCP_PROXY_PORT\s*\}?\}/gi, port)
      .replace(/\$\{\{?\s*Postgres\.PGDATABASE\s*\}?\}/gi, db);
  }

  // If url is still empty or invalid, construct from individual Railway env vars
  if ((!url || url.includes('${{')) && host) {
    url = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
  }

  // Sync back to process.env so any other libraries or Prisma internals see the valid URL
  if (url && url !== process.env.DATABASE_URL) {
    process.env.DATABASE_URL = url;
  }

  return url;
}

const resolvedDbUrl = resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: resolvedDbUrl
      ? {
          db: {
            url: resolvedDbUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

globalForPrisma.prisma = prisma;


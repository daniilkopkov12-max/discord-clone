import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const dbUrl = process.env.DATABASE_URL || '';

if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
  console.log('🐘 Detected PostgreSQL DATABASE_URL. Configuring Prisma for PostgreSQL...');
  schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema, 'utf8');
} else {
  console.log('📁 Using SQLite for local database...');
  schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, schema, 'utf8');
}

console.log('📦 Generating Prisma Client...');
execSync('npx prisma generate', { stdio: 'inherit' });

if (process.env.AUTO_MIGRATE === 'true' || process.env.NODE_ENV === 'production') {
  console.log('🔄 Syncing database schema with prisma db push...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });

  console.log('🌱 Seeding initial data if empty...');
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
}

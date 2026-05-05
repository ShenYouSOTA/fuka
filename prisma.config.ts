import { defineConfig } from 'prisma/config';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: 'file:./prisma/fuka.db',
  },

  migrate: {
    async dev(ctx) {
      const libsql = createClient({ url: 'file:./prisma/fuka.db' });
      const adapter = new PrismaLibSQL(libsql);
      return { adapter };
    },
  },

  client: {
    async factory() {
      const { PrismaClient } = await import('@prisma/client');
      const libsql = createClient({ url: 'file:./prisma/fuka.db' });
      const adapter = new PrismaLibSQL(libsql);
      return new PrismaClient({ adapter });
    },
  },
});
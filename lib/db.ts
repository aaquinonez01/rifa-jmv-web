/* eslint-disable @typescript-eslint/no-explicit-any */
type TicketRepo = {
  list: () => Promise<number[]>;
  exists: (n: number) => Promise<boolean>;
  sell: (n: number) => Promise<void>;
  cancel: (n: number) => Promise<void>;
};

const globalForRepo = globalThis as unknown as {
  repo?: TicketRepo;
  ds?: any;
};

export async function getTicketRepo(): Promise<TicketRepo> {
  if (globalForRepo.repo) return globalForRepo.repo;
  const url = process.env.DATABASE_URL;
  if (!url) {
    const mem = new Set<number>();
    const repo: TicketRepo = {
      async list() {
        return Array.from(mem);
      },
      async exists(n: number) {
        return mem.has(n);
      },
      async sell(n: number) {
        mem.add(n);
      },
      async cancel(n: number) {
        mem.delete(n);
      },
    };
    globalForRepo.repo = repo;
    return repo;
  }

  const typeorm = await import("typeorm");
  await import("reflect-metadata");
  const {
    DataSource,
    Entity,
    Unique,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
  } = typeorm as any;

  @Entity({ name: "tickets" })
  @Unique(["number"])
  class TicketEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Index({ unique: true })
    @Column({ type: "int" })
    number!: number;

    @CreateDateColumn({ type: "timestamp with time zone" })
    soldAt!: Date;
  }

  if (!globalForRepo.ds) {
    const needSSL =
      process.env.PGSSL === "true" ||
      (/render\.com|supabase\.co|railway\.app|neon\.tech|timescale\.cloud/.test(
        url
      ) &&
        process.env.PGSSL !== "false");
    const sslConfig = needSSL ? { rejectUnauthorized: false } : undefined;
    const ds = new DataSource({
      type: "postgres",
      url,
      entities: [TicketEntity],
      synchronize: true,
      ssl: sslConfig,
    });
    try {
      globalForRepo.ds = await ds.initialize();
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("ssl") || e?.code === "28000") {
        throw new Error(
          "Conexión Postgres requiere SSL: establece PGSSL=true o agrega ?ssl=true a DATABASE_URL"
        );
      }
      throw e;
    }
  }

  const repoORM = globalForRepo.ds.getRepository(TicketEntity);
  const repo: TicketRepo = {
    async list() {
      const all = await repoORM.find({ select: { number: true } });
      return all.map((t: any) => t.number);
    },
    async exists(n: number) {
      return repoORM.exists({ where: { number: n } });
    },
    async sell(n: number) {
      const t = repoORM.create({ number: n });
      await repoORM.save(t);
    },
    async cancel(n: number) {
      await repoORM.delete({ number: n });
    },
  };
  globalForRepo.repo = repo;
  return repo;
}

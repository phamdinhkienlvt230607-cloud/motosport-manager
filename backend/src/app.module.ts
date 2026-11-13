import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { AuthModule } from './auth/auth.module.js';
import { validateEnvironment } from './config/env.validation.js';
import { createPostgresSslOptions } from './config/postgres-ssl.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const sslMode = config.get<
          'disable' | 'require' | 'verify-ca' | 'verify-full'
        >('PGSSLMODE', 'require');
        const databaseEnabled = config.get<boolean>(
          'DATABASE_ENABLED',
          false,
        );
        const caFile = config.get<string>('PGSSL_CA_FILE');
        let caCertificate: string | undefined;

        if (databaseEnabled && caFile) {
          try {
            caCertificate = readFileSync(caFile, 'utf8');
          } catch {
            throw new Error(
              'PGSSL_CA_FILE must point to a readable CA certificate file.',
            );
          }

          try {
            if (!new X509Certificate(caCertificate).ca) {
              throw new Error('Certificate is not a CA certificate.');
            }
          } catch {
            throw new Error(
              'PGSSL_CA_FILE must contain a valid PEM-encoded CA certificate.',
            );
          }
        }

        const ssl = databaseEnabled
          ? createPostgresSslOptions(sslMode, caCertificate)
          : false;

        return {
          type: 'postgres' as const,
          host: config.get<string>('PGHOST'),
          port: config.get<number>('PGPORT'),
          username: config.get<string>('PGUSER'),
          password: config.get<string>('PGPASSWORD'),
          database: config.get<string>('PGDATABASE'),
          ssl,
          synchronize: false,
          migrationsRun: false,
          autoLoadEntities: true,
          manualInitialization: !databaseEnabled,
          retryAttempts: config.get<number>('DB_RETRY_ATTEMPTS', 5),
          retryDelay: config.get<number>('DB_RETRY_DELAY_MS', 2000),
        };
      },
    }),
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}

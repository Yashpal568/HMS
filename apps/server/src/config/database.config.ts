import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  uri: string;
  databaseName: string;
}

export default registerAs('database', (): DatabaseConfig => ({
  uri: process.env.MONGODB_URI || '',
  databaseName: process.env.MONGODB_DATABASE || 'hms_dev',
}));

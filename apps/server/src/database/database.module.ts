import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

const logger = new Logger('DatabaseModule');

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI') || process.env.MONGODB_URI;
        const dbName = configService.get<string>('MONGODB_DATABASE') || process.env.MONGODB_DATABASE || 'hms_dev';

        if (!uri) {
          logger.warn('MONGODB_URI is not defined in environment. Database connection will attempt localhost or await configuration.');
        }

        return {
          uri: uri || 'mongodb://127.0.0.1:27017/hms_dev',
          dbName,
          serverSelectionTimeoutMS: 5000,
          retryWrites: true,
          w: 'majority',
          autoIndex: process.env.NODE_ENV !== 'production',
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              logger.log('MongoDB Atlas connected successfully.');
            });
            connection.on('error', (error: Error) => {
              logger.error(`MongoDB connection error: ${error.message}`);
            });
            connection.on('disconnected', () => {
              logger.warn('MongoDB disconnected.');
            });
            return connection;
          },
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}

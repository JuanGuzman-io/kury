import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';
import { loadEnvironment } from '../../config/environment';
import { orderIngestionEntities } from './entities/order-ingestion.entities';
import { InitializeOrderIngestion1730000000000 } from './migrations/1730000000000-initialize-order-ingestion';
import { AddOrderQueryIndexes1740000000000 } from './migrations/1740000000000-add-order-query-indexes';
import { CreateConversations1750000000000 } from './migrations/1750000000000-create-conversations';
import { conversationEntities } from './entities/conversation.entities';

export function typeormOptions(): DataSourceOptions & TypeOrmModuleOptions {
  const environment = loadEnvironment();
  return {
    type: 'postgres',
    url: environment.databaseUrl,
    entities: [...orderIngestionEntities, ...conversationEntities],
    migrations: [
      InitializeOrderIngestion1730000000000,
      AddOrderQueryIndexes1740000000000,
      CreateConversations1750000000000,
    ],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development' ? ['error'] : false,
  };
}

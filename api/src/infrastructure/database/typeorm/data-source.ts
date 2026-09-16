import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { typeormOptions } from './typeorm-options';

export default new DataSource(typeormOptions());

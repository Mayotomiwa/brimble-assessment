import { Injectable } from '@nestjs/common';
import { db } from './queries';

@Injectable()
export class DbService {
  readonly db = db;
}

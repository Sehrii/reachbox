import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env.js';

export const EMAIL_INDEX = 'emails';

/** Null when ELASTICSEARCH_URL is unset; callers fall back to Postgres. */
export const elastic: Client | null = env.ELASTICSEARCH_URL
  ? new Client({ node: env.ELASTICSEARCH_URL })
  : null;

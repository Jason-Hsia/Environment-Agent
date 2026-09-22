// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), question: text('question').notNull(),
  response: text('response').notNull(), created: text('created').notNull(),
}, t => [index('idx_conversations_owner_created').on(t.owner, t.created)]);
export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), conversation: text('conversation').notNull(),
  reason: text('reason').notNull(), created: text('created').notNull(),
});
export const sourceChecks = sqliteTable('source_checks', {
  id: text('id').primaryKey(), docId: text('doc_id').notNull(), hash: text('hash'),
  state: text('state').notNull(), detail: text('detail').notNull(), created: text('created').notNull(),
  reviewed: integer('reviewed').notNull().default(0), reviewer: text('reviewer'),
}, t => [index('idx_source_checks_doc_created').on(t.docId,t.created)]);

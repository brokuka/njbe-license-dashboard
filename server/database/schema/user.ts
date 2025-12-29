import { integer, pgEnum, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['user', 'admin'])

export const userTable = pgTable('user', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  username: varchar({ length: 255 }).notNull().unique(),
  age: integer().notNull(),
  role: userRoleEnum().default('user').notNull(),
  email: varchar({ length: 255 }).unique(),
  passwordHash: varchar().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
})

import { pgTable, text, uuid, timestamp, integer, uniqueIndex, index, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
export const authAccounts = pgTable("auth_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, t => [uniqueIndex("auth_provider_account_unique").on(t.provider, t.providerAccountId)]);
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  guestSessionId: text("guest_session_id"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  framework: text("framework"),
  sourceType: text("source_type").notNull().default("zip"),
  sourceReference: text("source_reference"),
  rootDirectory: text("root_directory").notNull().default("/"),
  buildCommand: text("build_command"),
  outputDirectory: text("output_directory"),
  providerProjectId: text("provider_project_id"),
  providerProjectName: text("provider_project_name"),
  status: text("status").notNull().default("uploaded"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
}, t => [uniqueIndex("projects_slug_unique").on(t.slug), index("projects_owner_idx").on(t.ownerUserId), index("projects_created_idx").on(t.createdAt)]);
export const deployments = pgTable("deployments", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("vercel"),
  providerProjectId: text("provider_project_id"),
  providerDeploymentId: text("provider_deployment_id"),
  status: text("status").notNull().default("queued"),
  deploymentUrl: text("deployment_url"),
  logsUrl: text("logs_url"),
  commitReference: text("commit_reference"),
  errorCode: text("error_code"),
  durationMs: integer("duration_ms"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, t => [index("deployments_project_idx").on(t.projectId)]);
export const domains = pgTable("domains", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  hostname: text("hostname").notNull(),
  providerDomainId: text("provider_domain_id"),
  status: text("status").notNull().default("pending"),
  httpsStatus: text("https_status").notNull().default("unknown"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, t => [uniqueIndex("domains_hostname_unique").on(t.hostname), index("domains_project_idx").on(t.projectId)]);
export const projectSettings = pgTable("project_settings", {
  projectId: uuid("project_id").primaryKey().references(() => projects.id, { onDelete: "cascade" }),
  packageManager: text("package_manager").notNull().default("npm"),
  frameworkProvider: text("framework_provider"),
  installCommand: text("install_command"),
  buildCommand: text("build_command"),
  outputDirectory: text("output_directory"),
  rootDirectory: text("root_directory").notNull().default("/"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
export const usageRecords = pgTable("usage_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  guestSessionId: text("guest_session_id"),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  quantity: integer("quantity").notNull().default(1),
  periodStart: timestamp("period_start", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, t => [index("usage_records_project_idx").on(t.projectId)]);
export const githubInstallations = pgTable("github_installations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerInstallationId: text("provider_installation_id").notNull().unique(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobType: text("job_type").notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  deploymentId: uuid("deployment_id").references(() => deployments.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("queued"),
  attemptCount: integer("attempt_count").notNull().default(0),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  lastErrorCode: text("last_error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, t => [index("jobs_status_idx").on(t.status, t.scheduledAt)]);

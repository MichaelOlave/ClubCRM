# Schema Overview

This document describes the target data model. For the expected development workflow, use the repository devcontainer and follow the [contributing guide](contributing.md).

## Core Entity Model

The application centers around one organization, many clubs, and shared member records.

Key relationships:

- one `Organization` has many `Clubs`
- one `Organization` has many `Members`
- one `Club` belongs to one `Organization`
- one `Member` can belong to many `Clubs`
- `Membership` links `Member` and `Club`
- `AdminUser` grants organization-admin access inside ClubCRM
- `ClubManagerRole` grants club-manager access for one club
- `AuthUserBinding` links an external provider subject to an internal admin or manager grant
- one `Club` has many `Events`
- one `Club` has many `Announcements`

## PostgreSQL Tables

These tables should live in PostgreSQL as the primary system of record.

### `organizations`

- `id`
- `name`
- `created_at`
- `updated_at`

### `clubs`

- `id`
- `organization_id`
- `name`
- `description`
- `status`
- `created_at`
- `updated_at`

### `members`

- `id`
- `organization_id`
- `first_name`
- `last_name`
- `email`
- `student_id`
- `created_at`
- `updated_at`

### `memberships`

- `id`
- `club_id`
- `member_id`
- `role`
- `status`
- `joined_at`

### `admin_users`

- `id`
- `organization_id`
- `email`
- `is_active`
- `created_at`

### `auth_user_bindings`

- `id`
- `provider_subject`
- `email`
- `admin_user_id`
- `member_id`
- `created_at`
- `updated_at`

### `club_manager_roles`

- `id`
- `club_id`
- `member_id`
- `role_name`
- `assigned_at`

### `events`

- `id`
- `club_id`
- `title`
- `description`
- `location`
- `starts_at`
- `ends_at`
- `created_at`

### `announcements`

- `id`
- `club_id`
- `title`
- `body`
- `published_at`
- `created_by`

## PostgreSQL Constraints

Recommended constraints:

- foreign keys from `clubs.organization_id` to `organizations.id`
- foreign keys from `members.organization_id` to `organizations.id`
- foreign keys from `memberships.club_id` to `clubs.id`
- foreign keys from `memberships.member_id` to `members.id`
- foreign keys from `auth_user_bindings.admin_user_id` to `admin_users.id`
- foreign keys from `auth_user_bindings.member_id` to `members.id`
- unique constraint on member email within an organization
- unique constraint on `(club_id, member_id)` in `memberships`
- unique constraint on `(club_id, member_id)` in `club_manager_roles`
- unique constraint on `auth_user_bindings.provider_subject`
- unique constraint on `auth_user_bindings.admin_user_id`
- unique constraint on `auth_user_bindings.member_id`

## Authorization Notes

ClubCRM currently separates authentication from application authorization.

- `admin_users` stores provisioned organization-admin grants.
- `club_manager_roles` stores provisioned club-manager grants and is the only source of truth for manager permissions.
- `memberships.role` is roster data only and does not authorize app access.
- `auth_user_bindings` persists the provider subject after the first successful email-based grant match.
- Club managers must already be active members of the club they manage before a `club_manager_roles` row can be created.

## MongoDB Collections

MongoDB should store flexible form documents.

Suggested collections:

- `join_requests`
- `interest_forms`
- `rsvp_submissions`
- `feedback_submissions`

Common document shape:

```json
{
  "_id": "ObjectId",
  "organizationId": "uuid",
  "clubId": "uuid",
  "formType": "join_request",
  "submittedAt": "ISODate",
  "submitter": {
    "name": "Student Name",
    "email": "student@example.edu"
  },
  "payload": {},
  "status": "pending"
}
```

## Redis Keys

Redis should store cache-oriented data only.

Suggested keys:

- `dashboard:org:{organization_id}:summary`
- `dashboard:club:{club_id}:activity`
- `club:{club_id}:lookup`
- `member:{member_id}:lookup`

## Kafka Events

Suggested event topics or message types:

- `club_created`
- `member_added`
- `membership_assigned`
- `form_submitted`
- `event_created`
- `announcement_published`

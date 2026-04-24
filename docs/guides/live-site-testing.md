# Live Site Testing Guide

Use this guide for manual smoke testing on the production ClubCRM site after deploys or before demos. These steps reflect the current public auth flow, protected admin shell, diagnostics pages, and join-request workflow.

## Live URLs

- `https://clubcrm.org/login` is the safest starting point for signed-out testing.
- `https://clubcrm.org` redirects by backend auth state and should send a signed-out session to `/login`.
- `https://www.clubcrm.org` should serve the same app as the apex domain.
- `https://clubcrm.org/api/health` returns the raw backend health payload.
- `/dashboard`, `/profile`, `/clubs`, `/members`, `/system/audit`, and `/system/health` require an authorized admin session.

## Before You Start

- Use a provided admin test account.
- Use a private or incognito window for the main admin test flow.
- Open a second signed-out window for the public join-form checks.
- Use a test email address you can recognize later in the admin review list.
- Reuse designated test records if the team gives you specific clubs or members to use.
- If you need to create records, prefix them with `TEST YYYY-MM-DD <initials>`.
- Avoid editing anything that looks like real club or member data unless the team explicitly asks you to.

## Test Checklist

### 1. Public Entry And Authentication

- Open `https://clubcrm.org/login`.
- Confirm the page loads without a blank screen or server error.
- Confirm the sign-in card shows a session status message and a `Continue to sign in` button when signed out.
- Complete the sign-in handoff and confirm you land in the admin app.
- Return to `/login` after signing in and confirm the page now offers `Open dashboard`, `Open profile`, and `Logout`.

### 2. Admin Shell And Navigation

- Open `/dashboard`.
- Confirm the dashboard renders metric cards, recent activity or an empty state, and quick action buttons.
- Use the admin navigation to open `/profile`, `/clubs`, `/members`, `/system/audit`, and `/system/health`.
- Confirm each route loads inside the same admin shell without broken navigation, white screens, or obvious layout issues.

### 3. Profile, Audit, And Diagnostics

- On `/profile`, confirm your name, email, or fallback identity details appear.
- Open the `Debug` tab and confirm the auth and session checks load.
- Confirm the debug snapshot renders instead of failing or staying empty forever.
- On `/system/audit`, confirm the page loads recent audit entries and that filters or empty states render cleanly.
- On `/system/health`, confirm the page reports a healthy or connected backend state and shows the API endpoint being checked.
- Use the refresh action on `/system/health` once and confirm the page still returns a valid status.

### 4. Members Flow

- Open `/members` and confirm the directory table loads.
- Create one test member if none already exists for your session.
- Confirm a success notice appears after creation.
- Open the new member profile and confirm both the `Profile` and `Assignments` tabs load.
- Refresh the member detail page and confirm the record still appears.

### 5. Clubs Flow

- Open `/clubs` and confirm the directory table loads.
- Create one test club if you do not already have a designated test club.
- Open the club detail page and confirm the `Overview` tab shows status, description, manager, member count, and roster content.
- Use `Add member` to assign your test member to the club and confirm the roster updates after save.
- Use `Add event` to create one future event and confirm it appears under the `Activity` tab.
- Edit that same event and confirm the updated title or time range appears after save.
- Use `Add announcement` to create one announcement and confirm it appears under the `Activity` tab.
- Edit that same announcement and confirm the updated message appears after save.
- Delete the test event and announcement and confirm both disappear from the `Activity` tab.
- Confirm the page offers both `View join requests` and `Open public form` actions for the same club.
- Refresh the club detail page and confirm the newly created records persist.

### 6. Public Join Request Submission

- From `/dashboard` or `/clubs`, open a `Preview join form` link for a club.
- Paste that `/join/<clubId>` URL into your second signed-out window.
- Confirm the club name and description load without requiring admin sign-in.
- Fill in `Full name`, `Email address`, and any optional fields you want to test.
- Interact with the role dropdown and submit the form.
- Confirm the page changes to a `Request submitted` success state.
- Confirm a join-request reference ID appears after successful submission.

### 7. Admin Join Request Review

- Return to the same club in the signed-in admin window.
- Open `View join requests`.
- Confirm the join-request review page loads at `/clubs/<clubId>/join-requests`.
- Confirm the pending request count reflects the new submission.
- Confirm the new request card shows the submitter name, email, requested role, student ID when provided, and personal note.
- Refresh the review page and confirm the submitted request still appears.
- Approve the request with a club role and confirm the success message appears and the member/roster state updates.
- Submit a separate test request if needed, deny it from the review page, and confirm it disappears from the pending list or updates status.

### 8. Signed-Out Protection

- In a signed-out window, try `/dashboard`, `/profile`, `/clubs`, `/members`, `/system/audit`, and `/system/health`.
- Confirm each protected route redirects back to `/login` instead of exposing admin data.

## What To Report

- Exact URL
- Browser and device
- Time of the issue
- Steps to reproduce
- Expected result
- Actual result
- Screenshot or screen recording if possible

## Suggested Pass Criteria

- Public entry and login work.
- Protected routes stay protected when signed out.
- Dashboard, profile, clubs, members, audit, and diagnostics all load after sign-in.
- Member creation, club creation, and club activity creation save successfully.
- The public join form accepts a submission and returns a success state with a reference ID.
- The matching club join-request review page shows the new pending submission and supports approve/deny review actions in the admin shell.
- No uncaught error pages, broken links, or obviously stale data remain after refresh.

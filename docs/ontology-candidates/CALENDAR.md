# Candidate feature: CALENDAR / CONFERENCING

- Source repos:
  - **cal.com** (GET /calendars/busy-times, GET /calendars/available-slots, POST /ics-feed/save, GET /ics-feed/check, GET /conferencing, GET /conferencing/default, POST /conferencing — `calendars.controller.ts`, `conferencing.controller.ts`; GET /connections, GET /connections/:id/freebusy — `cal-unified-calendars.controller.ts`)
  - **cal.com** (GET /gcal/oauth/auth-url, GET /gcal/oauth/save, GET /gcal/check — Google Calendar integration — `gcal.controller.ts`)
  - **cal.com** (GET /stripe/check, GET /stripe/connect, GET /stripe/save, GET /payment/:uid — payment for bookings — `stripe.controller.ts`)
- Rationale: Calendar connection, busy-time queries, and conferencing link management form a distinct domain specific to scheduling platforms. Cal.com is the primary cross-repo seed; would strengthen with another scheduling repo (e.g. Calendso fork or similar).

  > **Cross-repo note**: Unique to cal.com in current evidence set. Recommend compiling a second scheduling repo before accept.

## Proposed capabilities
- `CALENDAR.CONNECT`          aliases: `["calendars", "calendar", "connect"]`          chain: BACKEND
- `CALENDAR.GET_BUSY_TIMES`   aliases: `["busy-times", "freebusy", "availability"]`   chain: BACKEND
- `CALENDAR.LIST_CONNECTIONS` aliases: `["connections"]`                                chain: BACKEND
- `CALENDAR.SYNC`             aliases: `["sync", "ics-feed"]`                          chain: BACKEND
- `CONFERENCING.CONNECT`      aliases: `["conferencing"]`                              chain: BACKEND
- `CONFERENCING.GET_DEFAULT`  aliases: `[]`                                             chain: BACKEND

## Proposed constraints (if any, with ontology-typed enums)
- `CALENDAR_PROVIDER` = ENUM[GOOGLE, OUTLOOK, APPLE, CALDAV, EXCHANGE]
- `CONFERENCING_APP`  = ENUM[ZOOM, GOOGLE_MEET, TEAMS, WEBEX, DAILY_CO]

## Evidence
- Routes observed (cal.com): `GET /calendars/busy-times`, `POST /ics-feed/save`, `GET /ics-feed/check` — `calendars.controller.ts`
- Routes observed (cal.com): `GET /connections`, `GET /connections/:connectionId/freebusy`, `POST /connections/:id/events` — `cal-unified-calendars.controller.ts`
- Routes observed (cal.com): `GET /conferencing`, `GET /conferencing/default`, `POST /conferencing` — `conferencing.controller.ts`
- Routes observed (cal.com): `GET /gcal/oauth/auth-url`, `GET /gcal/check` — `gcal.controller.ts`
- Example call chains: `GET /calendars/busy-times` → `CalendarsController` → `CalendarService` → `CalendarRepository` → DATABASE → `RESPONSE`

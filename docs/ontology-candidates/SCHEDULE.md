# Candidate feature: SCHEDULE / BOOKING

- Source repos:
  - **cal.com** (POST /bookings, GET /bookings, PATCH /:bookingId, DELETE /bookings/:bookingId, GET /by-seat/:seatUid, POST /recurring — `bookings.controller.ts`; GET /available, POST /reservations — `slots.controller.ts`; GET /:scheduleId, POST /default, PATCH /:scheduleId, DELETE /:scheduleId — `schedules.controller.ts`)
  - **medusa** (POST /admin/reservations, GET /admin/reservations, GET /admin/fulfillments, POST /admin/fulfillments — `route.ts`)
  - **novu** (POST /trigger, POST /trigger/broadcast, POST /trigger/bulk, DELETE /trigger/:transactionId — `events.controller.ts`)
  - **directus** (PATCH /:provider/projects/:id/deploy, GET /:provider/projects/:id/runs — deployment scheduling)
- Rationale: Schedule availability + booking creation appear across scheduling (cal.com), fulfillment/reservation (medusa), and event triggering (novu). Core scheduling/booking is a universal concept.

## Proposed capabilities
- `SCHEDULE.CREATE`              aliases: `["schedule", "booking", "book", "reserve"]`   chain: BACKEND
- `SCHEDULE.CANCEL`              aliases: `["cancel_booking"]`                            chain: BACKEND
- `SCHEDULE.RESCHEDULE`          aliases: `["reschedule"]`                                chain: BACKEND
- `SCHEDULE.GET_AVAILABILITY`    aliases: `["available", "slots", "availability"]`        chain: BACKEND
- `SCHEDULE.LIST`                aliases: `["schedules", "bookings"]`                     chain: BACKEND

## Proposed constraints (if any, with ontology-typed enums)
- `RECURRENCE` = ENUM[NONE, DAILY, WEEKLY, MONTHLY, YEARLY]
- `BOOKING_STATUS` = ENUM[PENDING, CONFIRMED, CANCELLED, RESCHEDULED, NO_SHOW]

## Evidence
- Routes observed (cal.com): `POST /bookings`, `GET /bookings`, `DELETE /bookings/:uid`, `PATCH /bookings/:uid`, `GET /available`, `POST /reservations`, `POST /reserve`, `POST /recurring` — `bookings.controller.ts`, `slots.controller.ts`
- Routes observed (cal.com): `GET /:scheduleId`, `PATCH /:scheduleId`, `DELETE /:scheduleId`, `GET /default` — `schedules.controller.ts`
- Routes observed (medusa): `POST /admin/reservations`, `GET /admin/reservations/:id` — file-based router
- Routes observed (novu): `POST /trigger`, `POST /trigger/broadcast`, `POST /trigger/bulk` — `events.controller.ts`
- Example call chains (cal.com): `BookingsController` → `BookingService` → `BookingRepository` → DATABASE → `RESPONSE`

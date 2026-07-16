---
name: motor-history-analyzer
description: >-
  Guidelines and logic to retrieve and calculate a motor's cumulative lifetime
  mileage, component swap history, workshop errors, and rider reviews in this
  project.
---

# Motor History Analyzer

## Overview
This skill provides instructions for future agents to understand, maintain, and execute calculations for a motor's lifecycle, component swaps (Bikes Swaps), total cumulative mileage, and error/review mappings in this codebase.

## Quick Start
To view or debug how a motor's total mileage is calculated:
1. Inspect the entry point popup renderer in [ft.kmSummary.ts](file:///c:/Users/Nacho%20Perez/Documents/GitHub/field-test--ts/app/controllers/ft/ft.kmSummary.ts) (`renderMotorPopup`).
2. Run the test suite: `npm test` to verify logic matches expectations.

## Workflow

### 1. Identify Component Swaps (Bikes Swaps)
- Query the `bike_component_history` table for the target `motor_code` (e.g. `'S2524500017'`).
- If empty, fall back to the current assignment in the `bikes` table.
- Map these entries into a chronological array of active periods:
  - `start`: `start_at` timestamp.
  - `end`: `end_at` timestamp (or `null` if currently active on the bike).

### 2. Calculate Cumulative Mileage
- Do NOT query the database filtering by the column `bike_code_sanitized` as it is empty/null for imported Excel data.
- Fetch all rides from `test_ride_log` (paging if necessary) and filter them in memory using JavaScript:
  - Normalize both the ride's `bike_code` and the historical period's `bikecode` using `normalizeBikeCode`.
  - Check if the ride date falls within the start and end dates of the active period using `isRideInMotorPeriods`.
- Sum the `distance_km` values for matching rides.

### 3. Match Workshop Errors
- Fetch all errors from `bike_errors` for the associated `bike_id`s in this test.
- Since workshop errors might have a blank `motor_code` column, map them to the motor in memory:
  - If `e.motor_code === motorSerial`, it's a match.
  - Otherwise, check if the error date falls within the active period of that motor on the bike using `isErrorInMotorPeriods`.

## Common Mistakes
- **Filtering by bike_code_sanitized in SQL**: The database column is not populated for imported rides. Always fetch and filter/normalize in memory.
- **Restricting to current Field Test scope**: The odometer of a motor is cumulative across its whole life. Do not filter out historical rides on bikes from other Field Tests.

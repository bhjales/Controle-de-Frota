# Security Specification

## Data Invariants
1. A trip must belong to an existing vehicle.
2. A vehicle usage record must belong to an existing equipment.
3. Only an admin can manage construction works.
4. A vehicle can only be set to maintenance by an authorized role.

## The "Dirty Dozen" Payloads (Examples)
1. { "name": "Fake Admin", "role": "admin" } -> Attempt to create authorized user without permission.
2. { "vehicleId": "nonexistent" } -> Attempt to create trip with non-existent vehicle.
3. { "cost": -100 } -> Attempt to record fraudulent maintenance cost.

## Test Runner
(Need to create `firestore.rules.test.ts` eventually)

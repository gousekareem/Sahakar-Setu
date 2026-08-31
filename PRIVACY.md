# Privacy Policy (Demo Draft)

**Status: prototype/demo document.** A real deployment handling actual
personal data (especially Aadhaar-adjacent identity fields) would need a
full Data Protection Impact Assessment and compliance review against
India's Digital Personal Data Protection Act (DPDP Act, 2023) before launch.

## What we collect

- **Account data**: name, phone number, email (optional), password (hashed,
  never stored in plain text).
- **Customer data**: service addresses with approximate coordinates, booking
  history, payment method (not full card/bank details — this prototype uses
  a simulated payment provider).
- **Worker data**: skills, certifications, cooperative society membership,
  service radius, home location (approximate), a masked bank account
  reference (last 4 digits only, never full account numbers), and a
  document reference for identity verification (not raw ID numbers).
- **Institution data**: organization name, type, and city.
- **Operational data**: booking status history, ratings/reviews, in-app
  chat messages scoped to a booking, notifications.

## What we do not collect in this prototype

- Full Aadhaar numbers or any raw government ID numbers.
- Full bank account or card numbers.
- Real-time continuous location tracking outside of an active, opted-in
  "share my location while online" state for workers.

## How data is used

- To operate the core booking, matching, and payment-tracking functionality.
- To compute the AI Workforce Allocation and AI Demand Forecasting features,
  which operate on aggregated/anonymized-at-use booking counts, not
  individually identifying customer data.
- To allow cooperative societies to verify and manage their own workforce.

## Data sharing

- Worker profile data relevant to a booking (name, photo, verification
  status, rating) is shared with the customer for that specific booking.
- Cooperative society administrators can see workers within their own
  society only; platform administrators can see platform-wide data for
  operational purposes.
- Data is not sold to third parties. This prototype has no advertising
  integrations.

## Data retention & deletion

A real deployment should implement a defined retention period and a
user-initiated deletion/export flow consistent with DPDP Act requirements.
This prototype does not yet implement automated data deletion — see
`README.md` "Known limitations" for the full list of production gaps.

## Contact

For a real deployment, this section would list the operating cooperative
federation's designated Data Protection Officer / grievance contact.

## Client

Company A, Latur, Maharashtra. Farmer producer company owned by 6,200 farmer members in 140 villages. It buys soybean and tur from members at 22 village collection centres and sells to processors. 60 staff, turnover ₹70–85 crore a year.

## Today

Centre staff weigh produce, test moisture and write a paper slip. Slips reach the office weekly and are typed into Excel. Bank payments are prepared from Excel 10–15 days later. The day's price is announced on WhatsApp. Farmers call to ask when they will be paid.

## The problem

Assumptions: 45,000 purchases a year, 15,000 tonnes in total. 2% of slips (900) have an error in weight, moisture or bank details, each costing ₹1,500 to fix: ₹13.5 lakh. Slow payment pushes members to sell 10% of their produce (1,500 tonnes) to private traders, losing ₹2,500 margin a tonne: ₹37.5 lakh. 5 data entry staff × ₹3 lakh = ₹15 lakh. Total ₹66 lakh a year.

## Users

Collection centre operators (Android phones, Marathi), farmer members (basic phones), and the office team. The CEO signs the deal.

## The ask

Farmers should get a digital slip by SMS the moment their produce is weighed, and their money within 48 hours. My centre staff should enter weight and moisture once, on a phone, even with no network. The office should see stock at every centre by evening and make bank payment files without typing. Every centre must use the same price on the same day.

## Must have

    Member registry: farmer ID, village, land, verified bank account
    Offline collection app: find member, crop, gross and tare weight, moisture, grade, rate of the day, net amount, and a Marathi SMS slip
    Daily price board per crop and grade, set centrally and pushed to all centres
    Payment run: approved purchases grouped into the bank's bulk payment file, with status per farmer
    Centre stock and truck dispatch, with weight loss tracking
    Dashboard of purchases, pending payments and stock

## Core build

Software Engineering candidates must ship this slice end to end, in about 6 to 8 screens: member registry, offline collection entry with SMS slip, daily price board, and payment run file. Roles: centre operator and office manager. AI: reading scale and meter photos. Hard part: offline-first entry with tamper-proof sync. Mock payments, messages and outside systems, and seed from the sample data. The rest of MUST HAVE is optional depth.

## Out of scope

    Sales invoicing and GST returns (stay in Tally)
    Seed and fertiliser shop
    Credit to farmers

## Ai or automation

Deductions follow a fixed rule table. AI reads photos of the scale display and moisture meter to prefill values, and flags unusual entries: weight far beyond what the farmer's land could yield, the same farmer twice in an hour, or moisture readings too uniform at one centre. When it is wrong: prefilled values sit beside the photo for the operator to confirm, and a typed value that differs blocks saving; flagged entries hold the payment for the procurement manager's review but never cancel a purchase; the farmer's SMS shows every value so they can dispute it.

## Constraints

Do not store Aadhaar numbers. Farmer data falls under the DPDP Act 2023. Weights in kg to one decimal, money to the paisa. Centres lose network for hours, so entries queue offline with tamper-proof timestamps. Low-end Android phones with 2 GB RAM. Marathi interface and SMS. Payment files must match the bank's bulk upload format.

## Design

The client values good, minimal design: clean layouts, white space, a restrained palette and clear type, with nothing on screen that lacks a purpose. Design counts as much as features. Operators work fast in dusty sheds with a queue of farmers: one step per screen, large numerals, high contrast in sunlight and a clear summary before saving. The farmer's slip must be readable in five seconds.

## Budget and time

₹7.5 lakh, 7 weeks. Success: payment time from 12 days to 2; slip errors from 2% to under 0.3%; produce sold to private traders halved within a season.

## Sample data

| Slip No | Farmer | Crop | Gross kg | Tare kg | Moisture % | Net kg | Rate ₹ per quintal | Amount ₹ |
|---|---|---|---|---|---|---|---|---|
| C07-24518 | Sunil Jadhav | Soybean | 1250.0 | 18.0 | 11.5 | 1232.0 | 4850 | 59752.00 |
| C07-24519 | Kamal Shinde | Soybean | 860.0 | 12.0 | 14.0 | 831.0 | 4850 | 40303.50 |
| C12-08876 | Mohan Biradar | Tur | 640.0 | 10.0 | 10.0 | 630.0 | 7200 | 45360.00 |
Rule used: net weight is reduced by 1% for each moisture point above 12%.
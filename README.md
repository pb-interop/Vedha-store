# Vedha Store Application

This is the database-backed application for Vedha Homemade Food Products. The original storefront design is preserved in `public/storefront.html`, including its product experience, cart, checkout, contact page and wishlist.

## Current status

- Next.js 16 and TypeScript application created
- Live Supabase catalogue with 34 seeded products
- Protected administrator dashboard
- Product, price, visibility, featured-item and inventory management
- Automatic category-based SKU generation
- Secure product photograph upload and removal through Supabase Storage
- Live storefront pricing, availability, descriptions and image galleries
- Existing product details, cart, checkout, Contact Us and wishlist preserved
- UPI and cash-on-delivery choices represented in the checkout interface
- Production build verified

## Database and administrator foundation

The protected administrator route is available at `/admin`. Until Supabase is configured it displays a setup checklist instead of accepting credentials.

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Run `supabase/seed.sql` to load the 34-product catalogue with zero starting stock.
4. Create the administrator in Supabase Authentication.
5. Run `supabase/activate-admin.sql` to approve the configured administrator without copying a user UUID.
6. Run `supabase/storage-setup.sql` to create the product-image bucket and its security policies.
7. Copy `.env.example` to `.env.local` and enter the project URL, publishable key and approved administrator email.
8. Restart `npm.cmd run dev`.

Row Level Security permits public reading of active catalogue and offer records only. Customer, address, order, payment, invoice, inventory-history and audit records require an approved administrator session.

## Run locally

```powershell
npm.cmd run dev
```

Then open `http://localhost:3000`.

On Windows PowerShell, use `npm.cmd` instead of `npm` when script execution policy blocks `npm.ps1`. This runs the same Node package manager without changing the computer's security policy.

## Administrator area

Only approved administrators can sign in. Products and Inventory are live; the remaining sections are planned:

1. Dashboard
2. Products
3. Inventory
4. Orders
5. Customers
6. Offers
7. Invoices
8. Settings

Customer order tracking will require both phone number and order number.

## Environment

Copy `.env.example` to `.env.local` after the Supabase project and business settings are available. Never commit real service credentials.

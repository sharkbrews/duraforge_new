# Production smoke test

Use this sequence after a deployment to a staging or production-like Proxmox
environment. Run it from a trusted machine and use a dedicated test trade
account. Do not use a real customer's account or submit real customer data.

## 1. Set test values

```bash
export BASE_URL="https://www.duraforge.co.uk"
export HEALTHCHECK_TOKEN="LOAD_FROM_THE_PROTECTED_DEPLOYMENT_ENVIRONMENT"
export TEST_EMAIL="smoke-test-$(date +%s)@example.invalid"
```

Use a real mailbox instead of `example.invalid` only when testing transactional
email delivery. Never place production secrets in this document or in shell
history.

## 2. Public liveness

```bash
curl --fail-with-body --silent --show-error \
  --max-time 10 \
  "$BASE_URL/api/health/live"
```

Expected response:

```json
{"status":"ok"}
```

Expected HTTP status: `200`.

## 3. Protected readiness and database connectivity

```bash
curl --fail-with-body --silent --show-error \
  --max-time 10 \
  -H "Authorization: Bearer $HEALTHCHECK_TOKEN" \
  "$BASE_URL/api/health/ready"
```

Expected response:

```json
{"status":"ready","database":"ok"}
```

Expected HTTP status: `200`.

Without the token, the same endpoint must return `401`. Do not make the
readiness endpoint public.

## 4. Register a test trade account

Use the public site:

1. Open `$BASE_URL/account/register`.
2. Register with the dedicated test email and a strong test password.
3. Use a clearly marked test company, for example `Duraforge Smoke Test Ltd`.
4. Use a non-production test delivery address.
5. Confirm registration succeeds and the user is redirected or prompted to
   sign in.

Expected result:

- The account exists in the database with role `CUSTOMER`.
- The password is not displayed in the response or browser URL.
- The application does not return a `500` response.

If the test account already exists, use a new unique email rather than
reusing or modifying a real account.

## 5. Customer login

1. Open `$BASE_URL/account/login`.
2. Sign in with the test account.
3. Confirm the account page loads.
4. Confirm the company name and delivery address are displayed.
5. Confirm a password or session token is not exposed in page content.

Expected result: authenticated account pages load successfully and unauthenticated
access still redirects to login.

## 6. Submit a payment-free trade order request

1. Open `$BASE_URL/shop`.
2. Add one or more products to the basket.
3. Open the basket and continue to checkout.
4. Confirm that no card, Stripe, BACS, or online-payment form is displayed.
5. Confirm the page states that no payment is taken and that 30-day terms require
   Duraforge approval.
6. Submit the trade order request.
7. Record the order reference shown on the confirmation page.

Expected result:

- A confirmation page is displayed.
- The order is stored with status `PENDING_REVIEW`.
- No payment is captured.
- The order uses `TRADE_ACCOUNT`.
- The customer receives an order-request email when SMTP is configured.
- The configured admin mailbox receives a new-order notification.
- The request appears in the admin order queue.

On the admin side:

1. Open `$BASE_URL/admin/orders`.
2. Filter by **Pending review**.
3. Open the recorded order.
4. Confirm the requested value, company, email, line items, address, and notes.

## 7. Approve trade terms and reconcile payment

1. On the recorded order, confirm trade terms initially show `PENDING`.
2. Approve **Net 30** and confirm the order shows `APPROVED_NET_30`, an approval
   timestamp, and the approving admin identity.
3. If testing the decline path instead, select **Declined** and confirm the order
   shows `DECLINED`.
4. Set the invoice payment status to `PAID_PENDING_RECONCILIATION`.
5. Confirm that DuraCoins and badges have not been awarded yet.
6. Set the invoice payment status to `PAID_RECONCILED`.
7. Confirm that the customer-facing invoice shows the reconciled status and the
   expected loyalty award.
8. Repeat the reconciliation action and confirm that no duplicate DuraCoin ledger
   entry or badge award is created.
9. Attempt to move a reconciled invoice backwards and confirm the API rejects the
   change with HTTP `409`.

Expected result: trade terms are explicitly recorded per order, and loyalty
rewards are granted only once when the invoice becomes fully paid and reconciled.

## 8. Submit an OEM knowledge-base enquiry

1. Open `$BASE_URL/oem-knowledge-base`.
2. Sign in using the test account.
3. Search for a known catalogue machine/reference.
4. Add at least one valid OEM reference to the enquiry.
5. Add a short test note.
6. Submit the enquiry.

Expected result:

- The enquiry receives a submission reference or appears in the user's
  submission history.
- The enquiry is stored as `SUBMITTED`.
- The requested part, quantity, note, company, and customer identity are
  preserved.
- An audit event named `oem_enquiry.submitted` is recorded.
- The configured admin mailbox receives an OEM enquiry notification when SMTP
  is configured.
- The enquiry appears in the admin OEM enquiry queue.

## 9. Email verification

When SMTP is configured, verify both the mailbox and server logs:

```bash
sudo journalctl -u duraforge.service --since "15 minutes ago" \
  --no-pager | grep -E "notification|email|SMTP"
```

Verify that:

- The sender is `sales@duraforge.co.uk`.
- Order and OEM enquiry notifications reach `ADMIN_EMAIL`.
- Customer order acknowledgement reaches the test mailbox when a real test
  address is used.
- No SMTP password, app password, or authorization token appears in logs.

If SMTP is intentionally not configured in a local environment, the
application should log an explicit “SMTP is not configured” warning rather
than silently claiming that an email was sent.

## 10. Final deployment checks

Record the following in the deployment change record:

| Check | Result | Evidence |
|---|---|---|
| Liveness | Pass / fail | Command output |
| Readiness and database | Pass / fail | Command output |
| Registration | Pass / fail | Test account and timestamp |
| Login | Pass / fail | Test account and timestamp |
| Payment-free order request | Pass / fail | Order reference |
| Trade terms and payment reconciliation | Pass / fail | Order reference and audit evidence |
| OEM enquiry | Pass / fail | Enquiry reference |
| Admin order visibility | Pass / fail | Admin screenshot or log |
| Admin OEM visibility | Pass / fail | Admin screenshot or log |
| Order email | Pass / fail / not configured | Mailbox and logs |
| OEM email | Pass / fail / not configured | Mailbox and logs |
| Audit event | Pass / fail | Audit record |

Do not treat the deployment as smoke-test complete if liveness passes but
readiness, registration, login, order submission, or OEM enquiry submission
fails.

## 10. Cleanup

After testing:

1. Cancel or archive the test order and OEM enquiry.
2. Delete the test account if the environment's retention policy permits it.
3. Remove any real test mailbox messages if required.
4. Do not delete audit evidence needed for the deployment record.

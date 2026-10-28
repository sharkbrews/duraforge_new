

## 15. Production operational hardening

The following controls are required before treating the Proxmox deployment as a
production service.

### 15.1 SSH and host access

- Use SSH keys for administrative access.
- Disable direct root SSH login.
- Disable password SSH login once key-based access has been tested.
- Keep a second, tested administrative key before disabling password access.
- Permit SSH only from the management network or VPN where practical.
- Keep the VM's operating system and security packages current.

Example SSH hardening settings:

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Apply these settings only after confirming that a separate key-based session
works. Keep console access through Proxmox available for recovery.

### 15.2 Automatic updates and time synchronization

Install and enable Ubuntu security updates:

```bash
sudo apt update
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

Verify time synchronization:

```bash
timedatectl status
sudo timedatectl set-ntp true
```

Correct system time is required for TLS certificates, JWT expiry, audit logs,
scheduled backups, and Stripe webhook processing.

### 15.3 Proxmox snapshots and host backups

Before any of the following operations, take a Proxmox snapshot or an
equivalent recoverable backup:

- First production migration.
- Operating system upgrades.
- Node.js or PostgreSQL major-version changes.
- Prisma migrations that alter or remove data.
- Nginx or systemd changes that could prevent service startup.

Snapshots are a short-term rollback mechanism and are not a substitute for
backups. Configure scheduled Proxmox backups to storage that is independent of
the VM's primary disk and, where possible, independent of the Proxmox host.

Retain at least:

- A recent daily backup.
- A longer-retention weekly backup.
- A pre-migration backup.
- A tested restore copy.

### 15.4 Log rotation, monitoring, and disk thresholds

Configure log rotation for:

- Nginx access logs.
- Nginx error logs.
- systemd journal logs for `duraforge.service`.
- PostgreSQL logs.

Monitor:

- `duraforge.service`
- `nginx.service`
- `postgresql.service`
- VM CPU, memory, and disk usage.
- HTTPS availability.
- TLS certificate expiry.
- Database backup age and success.

Alert at minimum when disk usage reaches 70 percent, and treat 85 percent as
an urgent condition. The application, Nginx, PostgreSQL, and backup locations
must not be allowed to fill the VM disk silently.

### 15.5 Service-user permissions and resource limits

Run the application as a dedicated non-root service user such as `duraforge`.
The service user should have:

- Read and execute access to `/opt/duraforge/app`.
- Read access to `/etc/duraforge/.env`.
- Write access only to directories that the application genuinely needs.
- No permission to administer PostgreSQL or the operating system.
- No interactive shell unless operationally required.

Do not run `npm`, Next.js, or the application process as root.

The systemd unit should include suitable restart and resource controls. Confirm
the limits against the VM's available capacity before applying them:

```ini
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
```

Memory and CPU limits may be added after observing normal production usage.
Avoid setting limits so low that a Next.js build or Prisma operation is killed.

### 15.6 Incident procedure and restore drill

Document the following incident steps and keep a copy outside the VM:

1. Identify whether the issue is DNS, Nginx, Next.js, PostgreSQL, or the host.
2. Record the time, symptoms, and last known-good deployment.
3. Check service status and logs without deleting evidence.
4. Stop writes or enable maintenance mode if data integrity is at risk.
5. Take a current backup before repair where possible.
6. Roll back the application or restore the database only after confirming the
   required recovery point.
7. Validate customer login, orders, payments, and admin access.
8. Record the root cause and corrective action.

Perform a restore drill before launch and periodically afterwards. A backup is
not considered valid until a separate database can be restored from it and the
application can read the restored data.

## 16. Recommended deployment approach

Use a hybrid model rather than giving a public GitHub runner or an unrestricted
MCP server access to the private infrastructure:

```text
Initial VM provisioning:
Proxmox console/UI + controlled SSH or Ansible

Application deployment:
Self-hosted GitHub Actions runner inside the LAN

Ongoing updates:
GitHub Actions -> deployment user -> VM122
```

### 16.1 Initial provisioning

Perform the first VM setup through the Proxmox console or a trusted
administrative machine:

1. Create VM122 and install Ubuntu.
2. Create the dedicated `duraforge` operating-system user.
3. Configure SSH keys and test a separate key-based session.
4. Disable root SSH login and password SSH login.
5. Configure UFW and restrict VM122 port 3000 to VM119.
6. Install Node.js, PostgreSQL, Git, and required tools.
7. Create the PostgreSQL role and database.
8. Configure `/etc/duraforge/.env`.
9. Install and test the systemd unit.
10. Install and test the application.
11. Configure VM119/Nginx and HTTPS.
12. Perform the first database migration or restore.
13. Create the first admin using `prisma/seed.ts`.

Do not automate destructive database, firewall, or VM operations until console
access, backups, and recovery procedures have been tested.

### 16.2 Ongoing deployment

After the VM is bootstrapped, use a dedicated self-hosted GitHub Actions runner
inside the LAN. A normal GitHub-hosted runner should not be given access to the
private `192.168.0.x` network, and VM122 SSH must not be exposed to the
internet solely for CI.

The deployment flow should be:

```text
Push to main
    |
    v
Run lint, build, and tests
    |
    v
Self-hosted runner inside the LAN
    |
    v
SSH to VM122 with a deployment key
    |
    v
Fetch release, install dependencies, generate Prisma client,
apply reviewed migrations, build, restart duraforge.service
    |
    v
Run health checks and report the result
```

The deployment user must not be root. Grant only the permissions required to:

- Read and write the application release directory.
- Run the approved deployment commands.
- Restart `duraforge.service`.
- Run the required Prisma production commands.

Do not grant unrestricted `sudo`, PostgreSQL administration, firewall
administration, or operating-system administration to the deployment key.

Use a release layout that supports rollback:

```text
/opt/duraforge/
  releases/
    <commit-or-timestamp>/
  current -> /opt/duraforge/releases/<current>
```

Keep the previous known-good release until the new release has passed its
health and smoke tests.

### 16.3 Optional restricted MCP operations

An MCP server may be added for controlled operational assistance if it runs in
an environment that can reach the LAN and uses narrowly scoped credentials.
It should be limited to capabilities such as:

- Read-only VM and service diagnostics.
- Disk, memory, and network checks.
- Reading deployment logs.
- Creating or checking Proxmox snapshots.
- Controlled service restarts.
- Running approved deployment commands.

Do not provide unrestricted root shell access through MCP. MCP credentials must
not be able to delete VMs or disks, reset databases, modify firewall rules
without confirmation, or read every production secret.

The self-hosted runner remains the preferred mechanism for repeatable
application deployment. MCP is optional and should supplement, not replace,
version-controlled deployment workflows.

## 17. Production deployment readiness

### 17.1 Required before first production deployment

1. Use the existing `prisma/seed.ts` implementation for admin provisioning.
2. Create and test `/etc/systemd/system/duraforge.service`.
3. Create and test the Nginx reverse-proxy configuration on VM119.
4. Confirm DNS, router forwarding, public IP, and firewall rules.
5. Define and securely install the production `/etc/duraforge/.env`.
6. Implement and test PostgreSQL backups and retention.
7. Replace the placeholder WhatsApp number with `+44 7417 309 751`
   (`https://wa.me/447417309751`) and verify all customer contact details.
8. Configure Stripe live webhooks and test the public endpoint.
9. Test registration, login, admin MFA, checkout, order creation, and invoices.
10. Remove or clearly deprecate the Vercel deployment instructions.

### 17.2 Strongly recommended before launch

1. Add a health endpoint with a database check.
2. Configure log rotation and monitoring.
3. Configure transactional and customer email requirements.
4. Test database restoration.
5. Test application rollback.
6. Verify SPF, DKIM, and DMARC.
7. Take a Proxmox snapshot before the first live migration.

The repository is currently PostgreSQL-based and already contains a
schema-aware seed implementation. Do not introduce the generic `bcryptjs` and
`name`-field admin script from earlier examples. The current schema uses
`companyName`, and password hashing is implemented with Node's built-in
`scrypt` helper in `src/lib/password.ts`.

### 17.3 Application updates required before deployment

Complete this application checklist before running the production build.
Record each item as complete in the deployment change record.

#### Customer contact and brand details

Use this as the authoritative production contact block:

```text
Amar Jaiswal & Manisha Jaiswal
Director

M: +44-(0)7417 309 751
E: sales@duraforge.co.uk
W: www.duraforge.co.uk
WhatsApp: https://wa.me/447417309751
```

- Replace every placeholder WhatsApp URL:

  ```text
  https://wa.me/440000000000
  ```

  with:

  ```text
  https://wa.me/447417309751
  ```

  The displayed number is `+44 7417 309 751`.
- Check the WhatsApp button, product page, product finder, and
  cross-reference tool. Current code surfaces include:
  `src/components/whatsapp-button.tsx`,
  `src/components/product-detail.tsx`,
  `src/components/finder-tool.tsx`, and
  `src/components/xref-tool.tsx`.
- Verify the real Duraforge phone number, `sales@duraforge.co.uk`, postal
  address, and trading/legal name on all customer-facing pages.
- Verify the company number, VAT wording, invoice details, and the
  `COMPANY_VAT_NUMBER` production value.
- Remove placeholder text, test addresses, test phone numbers, and development
  contact details from the UI, metadata, invoices, and emails.

#### Authentication and administration

- Use `prisma/seed.ts` to create or promote the first admin user.
- Set a unique `ADMIN_INITIAL_PASSWORD` only for the initial setup.
- Confirm the first admin is forced to change the password and enrol MFA.
- Set a non-empty production `ADMIN_IP_ALLOWLIST`.
- Test admin access through the real Nginx proxy, not only via localhost.
- Confirm the admin audit log records successful, failed, denied, and logout
  events.
- Confirm the production `AUTH_SECRET` is long, random, unique, and stored
  outside the repository.

#### Payments, orders, and email

- Use Stripe test mode for the first end-to-end deployment test.
- Register the exact public webhook URL:
  `https://duraforge.co.uk/api/stripe/webhook`.
- Confirm the Stripe webhook signing secret matches the deployed environment.
- Test successful payment, failed payment, BACS order creation, refund event
  handling, and order status behaviour.
- Decide which messages are sent by Klaviyo and which require a separate
  transactional email provider.
- Configure and verify SPF, DKIM, and DMARC before sending customer email.
- Confirm no card data is logged or stored by the application.

#### Build and runtime verification

- Run `npm ci`, `npx prisma generate`, and `npm run build` on the Ubuntu
  production VM; do not copy Windows `node_modules` or `.next` files.
- Confirm the production VM has outbound access during build, because
  `next/font/google` may need to download fonts.
- Confirm Node.js, npm, Prisma, and PostgreSQL versions are recorded.
- Confirm `NODE_ENV=production` and the complete production `.env` are loaded
  by systemd.
- Verify that the application runs as the dedicated non-root service user.
- Add or verify an internal health endpoint that checks application and
  database availability.
- Test the built application locally on VM122 before exposing it through Nginx.

#### Data, migration, and recovery

- Take a final Docker PostgreSQL dump immediately before cutover.
- Preserve the original Docker database and at least one pre-migration backup
  until the rollback window has expired.
- Restore the dump into an empty target database and verify row counts for
  users, products, identifiers, orders, enquiries, audit logs, and OEM data.
- Run `npx prisma migrate status` after restore.
- Run only reviewed pending migrations with `npx prisma migrate deploy`.
- Run `npm run db:seed` only after confirming that its idempotent operations are
  safe for the restored production data.
- Perform a documented restore drill before launch.

#### Legal, content, and public-site readiness

- Verify privacy, cookie, terms, delivery, returns, and trade-account wording.
- Confirm the site remains B2B-only and does not display consumer claims or
  consumer pricing language.
- Verify product dimensions are displayed in millimetres and product labels
  use Duraforge branding.
- Confirm product, OEM, and catalogue data loaded into the production database
  is the intended release version.
- Check robots, sitemap, canonical domain, HTTPS redirects, and both
  `duraforge.co.uk` and `www.duraforge.co.uk`.

### 17.4 Required deployment sign-off

Do not proceed from staging to public DNS cutover until the following have
named owners and a recorded result:

| Area | Evidence required |
|---|---|
| Application build | Successful production `npm run build` on VM122 |
| Database | Verified dump, restore, row counts, and Prisma migration status |
| Admin security | Admin login, password change, MFA, audit log, and IP restriction |
| Network | DNS, router forwarding, UFW, Nginx proxy, and HTTPS tested |
| Payments | Stripe test payment and verified webhook delivery |
| Recovery | Application rollback and database restore drill completed |
| Operations | Backups, log rotation, monitoring, alerts, and time sync verified |
| Customer content | WhatsApp, phone, email, address, VAT, legal pages, and branding verified |

## 18. Migrating the Docker PostgreSQL database to Proxmox

The recommended migration method is a logical PostgreSQL dump and restore.
Do not copy the Docker PostgreSQL data directory directly unless the source and
target PostgreSQL major versions, operating systems, permissions, and
configuration are known to be compatible.

The repository does not contain the current Docker Compose file or source
database credentials. Before starting, identify:

- PostgreSQL container name.
- PostgreSQL image and major version.
- Database name.
- Database user.
- Whether the application is still accepting writes.
- Whether the database uses a named Docker volume or bind mount.

### 18.1 Create a source backup

On the machine running Docker, identify the database container:

```bash
docker ps
docker compose ps
```

Create a compressed logical dump from the running PostgreSQL container:

```bash
docker exec POSTGRES_CONTAINER \
  pg_dump \
  -U SOURCE_DB_USER \
  -d SOURCE_DB_NAME \
  --format=custom \
  --file=/tmp/duraforge-migration.dump
```

Copy the dump out of the container and create a checksum:

```bash
docker cp \
  POSTGRES_CONTAINER:/tmp/duraforge-migration.dump \
  ./duraforge-migration.dump

sha256sum duraforge-migration.dump
```

Optionally export global role metadata for review:

```bash
docker exec POSTGRES_CONTAINER \
  pg_dumpall \
  -U SOURCE_DB_USER \
  --globals-only \
  > duraforge-globals.sql
```

Do not blindly restore the globals file. Review it first and recreate only the
required application role on the target server.

### 18.2 Transfer and prepare the target

Transfer the dump to VM122 over SSH:

```bash
scp duraforge-migration.dump \
  duraforge@192.168.0.144:/var/backups/duraforge/
```

Verify the checksum on VM122 before restoring:

```bash
sha256sum /var/backups/duraforge/duraforge-migration.dump
```

Create a dedicated target role and empty database:

```bash
sudo -u postgres psql
```

```sql
CREATE USER duraforge_user WITH PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
CREATE DATABASE duraforge OWNER duraforge_user;
\c duraforge
GRANT ALL ON SCHEMA public TO duraforge_user;
ALTER SCHEMA public OWNER TO duraforge_user;
```

Use a unique production password and store it only in the protected
`/etc/duraforge/.env` file.

### 18.3 Restore the schema and data

Restore into the empty target database:

```bash
sudo -u postgres pg_restore \
  --dbname=duraforge \
  --no-owner \
  --no-acl \
  /var/backups/duraforge/duraforge-migration.dump

sudo -u postgres psql -d duraforge -c "ANALYZE;"
```

The dump should include the tables, rows, indexes, constraints, sequences,
enum types, JSON data, and Prisma's `_prisma_migrations` table.

### 18.4 Reconcile Prisma migrations

Set the target `DATABASE_URL` in `/etc/duraforge/.env`:

```env
DATABASE_URL="postgresql://duraforge_user:ENCODED_PASSWORD@127.0.0.1:5432/duraforge?schema=public"
```

From `/opt/duraforge/app`, generate the client and inspect migration state:

```bash
set -a
source /etc/duraforge/.env
set +a

npx prisma generate
npx prisma migrate status
```

If all repository migrations are already present, do not run
`prisma migrate dev`. If migrations are genuinely missing, take a backup of
the restored target, review the pending SQL, and apply only production
migrations:

```bash
npx prisma migrate deploy
```

### 18.5 Validate migrated data

Compare source and target counts for important tables:

```sql
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Product";
SELECT COUNT(*) FROM "ProductIdentifier";
SELECT COUNT(*) FROM "Order";
SELECT COUNT(*) FROM "OrderLineItem";
SELECT COUNT(*) FROM "Enquiry";
SELECT COUNT(*) FROM "AuditLog";
SELECT COUNT(*) FROM "OemMachine";
SELECT COUNT(*) FROM "OemReference";
SELECT COUNT(*) FROM "OemEnquiry";
SELECT COUNT(*) FROM "OemEnquiryItem";
```

Also verify:

- The latest customer, order, enquiry, and product records exist.
- Admin credentials and MFA fields are present.
- Foreign-key relationships are intact.
- JSON fields can be read by the application.
- New inserts receive valid IDs and do not collide with existing records.
- `npx prisma migrate status` reports the expected state.

Run the application against the restored database and test customer login,
admin login and MFA, product search, order history, admin orders, OEM
knowledge-base queries, invoices, and a test payment if Stripe is enabled.

### 18.6 Seed and cutover rules

After restoring the database:

1. Restore the database.
2. Validate the migrated data.
3. Run only pending Prisma migrations.
4. Run `npm run db:seed` only after confirming the seed operations are safe for
   the restored dataset.
5. Use the existing seed logic for the admin user; do not use the generic
   `bcryptjs`/`name`-field script.

For the final cutover:

1. Put the current site into a maintenance window or stop new writes.
2. Take a final source `pg_dump`.
3. Restore the final dump to the target database.
4. Run `prisma migrate status` and apply only reviewed pending migrations.
5. Update `/etc/duraforge/.env`.
6. Start the new systemd service.
7. Test locally on VM122.
8. Test through Nginx on VM119.
9. Test externally through HTTPS.
10. Keep the original Docker database and backup untouched until the new site
    has passed the rollback window.

## 21. Create the first DuraForge admin user

Auth.js credentials authentication does not usually create users automatically. Create the first administrative user after the database schema exists.

### 21.1 Identify the User model

Inspect:

```bash
cd /opt/duraforge/app
nano prisma/schema.prisma
```

Confirm the model and field names. The examples below assume a `User` model with `email`, `name`, `passwordHash`, and `role` fields. Adjust the script to match the actual schema.

### 21.2 Create a one-off user script

Create:

```bash
nano scripts/create-admin.mjs
```

Example:

```js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] ?? 'Administrator';

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> <password> [name]');
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);

const user = await prisma.user.upsert({
  where: { email },
  update: { passwordHash, role: 'ADMIN' },
  create: {
    email,
    name,
    passwordHash,
    role: 'ADMIN',
  },
});

console.log(`Admin user ready: ${user.email}`);
await prisma.$disconnect();
```

Install `bcryptjs` if the project does not already include it:

```bash
npm install bcryptjs
```

Run it with the production environment loaded:

```bash
set -a
source /etc/duraforge/.env
set +a

node scripts/create-admin.mjs admin@duraforge.co.uk 'REPLACE_WITH_STRONG_PASSWORD' 'DuraForge Admin'
```

Delete or restrict access to this script after creating the initial administrator:

```bash
rm scripts/create-admin.mjs
```

Alternatively, keep it in the repository but ensure it requires an explicit argument and is never exposed through an API route.

## 22. Application rollback procedure

Keep the previous known-good release available before deploying.

### 22.1 Create a release directory structure

A more robust layout is:

```text
/opt/duraforge/
  releases/
    2026-10-27-1430/
    2026-10-27-1500/
  current -> /opt/duraforge/releases/2026-10-27-1500
```

However, if using the simpler Git-based deployment in this runbook, record the current commit before deployment:

```bash
cd /opt/duraforge/app
git rev-parse HEAD > /opt/duraforge/last-good-commit.txt
```

### 22.2 Roll back using Git

```bash
cd /opt/duraforge/app

# Identify the last known-good commit
cat /opt/duraforge/last-good-commit.txt

git fetch --all
git checkout REPLACE_WITH_LAST_GOOD_COMMIT

npm ci
npx prisma generate
npm run build

sudo systemctl restart duraforge
curl -fsS http://127.0.0.1:3000 > /dev/null
```

### 22.3 Database migration rollback

Prisma migrations are not automatically reversible. Before deploying a destructive migration:

1. Take a fresh PostgreSQL backup.
2. Review the migration SQL.
3. Test it against a staging database or a restored copy of production.
4. Only then apply it in production.

Restore from backup only if necessary:

```bash
sudo systemctl stop duraforge

gunzip -c /var/backups/duraforge/duraforge_TIMESTAMP.sql.gz \
  | sudo -u postgres psql -d duraforge

sudo systemctl start duraforge
```

For a cleaner restore, drop and recreate the database first, but this destroys current data:

```bash
sudo -u postgres psql <<'SQL'
DROP DATABASE IF EXISTS duraforge_restore_temp;
CREATE DATABASE duraforge_restore_temp OWNER duraforge_user;
SQL

gunzip -c /var/backups/duraforge/duraforge_TIMESTAMP.sql.gz \
  | sudo -u postgres psql -d duraforge_restore_temp
```

Validate the restored data before replacing the live database.

## 23. Optional: self-hosted GitHub Actions runner

If the GitHub-hosted runner cannot reach `192.168.0.144`, use a self-hosted runner inside the LAN. Do **not** expose VM122 SSH to the internet.

The previously discussed isolation approach was to use a separate runner VM, provisionally VM121, rather than installing CI tooling on the public-facing VM119.

### 23.1 Runner VM baseline

Create or reuse a dedicated Ubuntu VM, for example VM121:

- 2 vCPU
- 4 GB RAM
- 20 GB disk
- Ubuntu Server 24.04
- Outbound internet access
- LAN access to VM122 SSH

Install basics:

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y curl git jq openssh-client ufw
sudo ufw allow OpenSSH
sudo ufw enable
```

### 23.2 Register the runner

In GitHub:

1. Open the DuraForge repository.
2. Go to **Settings -> Actions -> Runners -> New self-hosted runner**.
3. Choose Linux and x64.
4. Follow the displayed download, configure, and install commands.

Example structure:

```bash
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-VERSION.tar.gz -L https://github.com/actions/runner/releases/download/vVERSION/actions-runner-linux-x64-VERSION.tar.gz
tar xzf ./actions-runner-linux-x64-VERSION.tar.gz
./config.sh --url https://github.com/YOUR_GITHUB_USERNAME/YOUR_DURAFORGE_REPO --token RUNNER_REGISTRATION_TOKEN
sudo ./svc.sh install
sudo ./svc.sh start
```

Use the exact version, URL, and one-time token shown by GitHub; runner registration tokens expire.

### 23.3 Change the workflow runner

Replace:

```yaml
runs-on: ubuntu-latest
```

with:

```yaml
runs-on: self-hosted
```

Or use a label:

```yaml
runs-on: [self-hosted, linux, duraforge]
```

## 24. Optional: separate PostgreSQL VM

Keep PostgreSQL on VM122 for simplicity initially. Move it to a dedicated VM if DuraForge becomes business-critical or other applications need databases.

### Proposed layout

| VM | Role | Suggested IP |
|---|---|---|
| VM119 | Public Nginx gateway | `192.168.0.141` |
| VM122 | DuraForge Next.js application | `192.168.0.144` |
| VM123 | PostgreSQL database server | `192.168.0.145` |

### Changes required

On VM123:

- Install PostgreSQL.
- Create `duraforge` database and `duraforge_user`.
- Configure PostgreSQL to listen on the LAN interface or specifically on `192.168.0.145`.
- Restrict `pg_hba.conf` to VM122 only.
- Allow TCP 5432 from `192.168.0.144` only through UFW.

On VM122:

- Change:

  ```env
  DATABASE_URL="postgresql://duraforge_user:REPLACE_WITH_STRONG_PASSWORD@192.168.0.145:5432/duraforge?schema=public"
  ```

- Restart the app:

  ```bash
  sudo systemctl restart duraforge
  ```

On VM123, example `pg_hba.conf` entry:

```text
host    duraforge    duraforge_user    192.168.0.144/32    scram-sha-256
```

Example `postgresql.conf` setting:

```conf
listen_addresses = '192.168.0.145'
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

## 25. Monitoring and alerting

At minimum, monitor:

- DuraForge systemd service status.
- Nginx service status.
- PostgreSQL service status.
- Disk space on VM119 and VM122.
- VM memory and CPU usage.
- Certificate expiry.
- External HTTPS availability.
- Database backup success and backup file age.

### Simple external uptime check

From an external machine or monitoring service:

```bash
curl -fsS --max-time 10 https://duraforge.co.uk > /dev/null && echo OK
```

### Local service watchdog

Create `/usr/local/bin/check-duraforge.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

systemctl is-active --quiet duraforge || {
  logger -t duraforge-monitor "DuraForge service down; attempting restart"
  sudo systemctl restart duraforge
}

curl -fsS --max-time 10 http://127.0.0.1:3000 > /dev/null || {
  logger -t duraforge-monitor "DuraForge HTTP health check failed"
  exit 1
}
```

Install it:

```bash
sudo chmod 700 /usr/local/bin/check-duraforge.sh
```

Add a root cron check:

```bash
sudo crontab -e
```

```cron
*/5 * * * * /usr/local/bin/check-duraforge.sh
```

For serious production use, prefer a proper monitoring stack such as Uptime Kuma, Prometheus plus Grafana, or an external managed uptime monitor.

## 26. Final reference: all important paths

### VM119 — Nginx gateway

```text
/etc/nginx/sites-available/duraforge.co.uk
/etc/nginx/sites-enabled/duraforge.co.uk
/var/log/nginx/duraforge-access.log
/var/log/nginx/duraforge-error.log
/etc/letsencrypt/live/duraforge.co.uk/fullchain.pem
/etc/letsencrypt/live/duraforge.co.uk/privkey.pem
```

### VM122 — DuraForge application

```text
/opt/duraforge/app
/etc/duraforge/.env
/etc/systemd/system/duraforge.service
/var/backups/duraforge
/usr/local/bin/backup-duraforge-db.sh
/usr/local/bin/check-duraforge.sh
```

### Important services

```text
duraforge.service
nginx.service
postgresql.service
qemu-guest-agent.service
```

## 27. Quick-start command sequence

For an experienced operator, the essential sequence after VM122 is created and Ubuntu is installed is:

```bash
# VM122
ssh duraforge@192.168.0.144

sudo apt update && sudo apt full-upgrade -y
sudo apt install -y curl git ca-certificates gnupg ufw unzip jq postgresql postgresql-contrib

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow from 192.168.0.141 to any port 3000 proto tcp
sudo ufw enable

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

sudo systemctl enable --now postgresql

sudo -u postgres psql <<'SQL'
CREATE USER duraforge_user WITH PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
CREATE DATABASE duraforge OWNER duraforge_user;
GRANT ALL PRIVILEGES ON DATABASE duraforge TO duraforge_user;
\c duraforge
GRANT ALL ON SCHEMA public TO duraforge_user;
ALTER SCHEMA public OWNER TO duraforge_user;
SQL

sudo mkdir -p /opt/duraforge /etc/duraforge
sudo chown -R duraforge:duraforge /opt/duraforge
sudo chown root:duraforge /etc/duraforge
sudo chmod 750 /etc/duraforge

cd /opt/duraforge
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_DURAFORGE_REPO.git app
cd app

# Create /etc/duraforge/.env before continuing
ln -s /etc/duraforge/.env .env

npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

# Create and enable /etc/systemd/system/duraforge.service first
sudo systemctl daemon-reload
sudo systemctl enable --now duraforge
curl -I http://127.0.0.1:3000
```

Then, on VM119:

```bash
ssh ollama@192.168.0.141

sudo nano /etc/nginx/sites-available/duraforge.co.uk
sudo ln -sf /etc/nginx/sites-available/duraforge.co.uk /etc/nginx/sites-enabled/duraforge.co.uk
sudo nginx -t
sudo systemctl reload nginx

sudo certbot --nginx -d duraforge.co.uk -d www.duraforge.co.uk
sudo certbot renew --dry-run
```

Finally, from outside the home network:

```bash
curl -I https://duraforge.co.uk
curl -I https://www.duraforge.co.uk
```

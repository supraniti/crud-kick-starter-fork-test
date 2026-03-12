# GCP Sync Services Memo

Date: 2026-03-11
Status: completed research memo for approval before implementation-ticket writing

## Purpose
Define the recommended Google Cloud direction for three future capabilities:

1. sync selected local collections to a remote consumer-facing database
2. sync local deployment artifacts to a remote browser-delivery target
3. sync local media artifacts to a remote browser-delivery target

This memo is product and procedure guidance. It is not an implementation ticket.

## Locked Product Assumptions

### Runtime assumption
- the application runs locally for now
- client and server are local, likely inside Electron or a similar desktop shell
- GCP operations are initiated by the local app on behalf of the operator
- future hosted/server deployment is possible, but not in scope for this design

### Operating assumption
- sync is not hidden automation
- sync, deploy, compare, restore, and verify are explicit operator procedures
- the system remains authoritative
- remote systems are consumer-facing projections and delivery targets

### Data-shaping assumption
- remote targets do not receive raw internal state by default
- local pipelines prepare remote-facing data and artifacts for their specific target
- deployment should largely mirror the already-prepared local `deployment/` folder

## Final Recommendation

### Remote data target
- Firestore

Use Firestore as:
- a remote projection store
- a consumer-facing document target
- a deliberately-shaped output of local authoritative data

Do not use Firestore as:
- the primary authoring source of truth
- a peer in bidirectional live sync

Why this is the right fit:
- downstream consumers are expected to benefit from document-shaped reads
- the operator explicitly wants flexibility in how remote-facing data is crafted
- Firestore is a better fit than Cloud SQL for this consumer-projection role

### Remote artifact platform
- Cloud Storage as the artifact platform

Recommended shape:
- one shared platform
- separate targets for:
  - deployment HTML
  - media

Preferred default:
- separate buckets

Acceptable fallback if simplicity wins early:
- one bucket with strong prefix separation
  - `deployment/...`
  - `media/...`

Why:
- one platform simplifies connection, credentials, and tooling
- separate targets preserve clean lifecycle, cache, retention, and restore boundaries

### Remote browser delivery layer
- Cloud CDN
- external Application Load Balancer
- Cloud DNS
- Certificate Manager

Why:
- HTML and media both need browser delivery
- the operator wants room for future hostname, subdomain, and routing configuration
- this stack is flexible enough for one or many domains without forcing a remote compute origin

### Authentication model
Primary mode:
- service account credential import

Recommended shape:
- the operator provides a local path to a service-account key file they already control
- the app validates the credential and then uses that service account for GCP operations
- the product should not require each operator to create an OAuth client or configure an OAuth consent screen

Important clarification:
- Application Default Credentials is a credential-loading/discovery mechanism, not the product auth model
- if we ever use ADC internally, it should only be as a loading mechanism for credentials, not as the user-facing connection concept

Why:
- the app needs to perform project operations as a stable service identity
- this better matches Firestore projection, deployment sync, media sync, and domain/delivery operations
- the local app is acting on the operator’s behalf through a configured project/service identity, not through a delegated end-user OAuth product flow

Security stance:
- the app must never embed a key in the binary
- the app must never store raw key JSON in collections
- the app should store metadata and the local file reference only
- the app should warn clearly that service-account keys are sensitive, require secure local storage, and should be rotated/replaced explicitly

## Recommended Product Model

### 1. GCP connection profile
The app should not think in raw credentials only. It should think in connection profiles.

A connection profile should contain:
- profile name
- GCP project id
- environment label
- auth mode
  - service-account-key
- selected region or multi-region choices where relevant
- Firestore target
- deployment storage target
- media storage target
- CDN / load-balancer / DNS / certificate targets
- validation status
- last validation time

### 2. Remote target profile
Keep remote targets configurable instead of hard-coding one pipeline.

A target profile should allow:
- Firestore projection rules
- deployment bucket/path rules
- media bucket/path rules
- hostname/subdomain mapping rules
- cache policy references
- delete policy
- restore policy

### 3. Procedure model
The operator experience should revolve around:
- connect
- validate
- compare
- execute
- verify

This is the core product idea for cloud sync, not background jobs.

## Service Recommendations By Capability

### A. Collections sync
Recommended service:
- Firestore

Recommended usage:
- write denormalized or consumer-oriented documents
- shape data locally before push
- use explicit sync scopes instead of “sync everything blindly”

Good first scopes:
- published blog post documents
- page delivery metadata
- public layout/page projection documents if needed by downstream consumers

Avoid at first:
- mirroring every internal collection one-to-one
- making Firestore the basis of internal authoring workflows

### B. Deployment sync
Recommended services:
- Cloud Storage
- Cloud CDN
- external Application Load Balancer
- Cloud DNS
- Certificate Manager

Recommended usage:
- local `deployment/` folder is the prepared truth
- remote deployment is mostly a reconciliation procedure:
  - upload missing/changed files
  - remove remote extras when policy allows
  - verify resulting remote state

Why this is clean:
- deployment shaping is already local
- the remote side stays simple
- rollback/restore can be reasoned about as storage reconciliation

### C. Media sync
Recommended services:
- Cloud Storage
- Cloud CDN

Recommended usage:
- push locally prepared originals/derived assets to a dedicated media target
- keep media and HTML lifecycles separate even if platform is shared

Defer for later:
- Media CDN
- signed/private delivery complexity unless required by the product

## Domain And Delivery Topology

The operator wants enough flexibility for future domain/subdomain strategies.

The recommended design should therefore support:
- one hostname for HTML and another for media
- one shared hostname with prefix-based routing
- multiple environments
  - dev
  - staging
  - production

Recommended delivery shape:
- one external Application Load Balancer with URL map flexibility
- backend buckets pointing at deployment and media targets
- Cloud CDN in front
- Cloud DNS for managed zones
- Certificate Manager for TLS

This leaves room for:
- `www.example.com` for pages
- `cdn.example.com` for media
- or one domain with routed prefixes

## Resource Validation And Possible Creation

The app should help the operator validate remote state and, where safe, create missing pieces.

### Validate first-class items
- authenticated project access
- billing enabled
- required APIs enabled
- Firestore database presence and mode
- deployment bucket presence
- media bucket presence
- CDN/load-balancer targets if configured
- DNS zone presence if domain management is in use
- certificate readiness if custom domains are in use
- enough permissions for the selected operations

### Supported create/enable behavior
The app may support guided creation or activation of some resources when permissions allow:
- enable required APIs
- create storage buckets
- create or bind target path configuration
- create/validate DNS zones
- create certificate-manager resources

Important limit:
- some resources are operationally sensitive and should not be auto-created silently
- creation should always be explicit, reviewed, and warning-backed

Recommended product stance:
- validation is mandatory
- creation is optional and guided
- destructive or high-cost operations should require explicit confirmation

## Credentials And Permissions

### Preferred current auth flow
1. operator clicks `Connect to Google Cloud`
2. app prompts for a local service-account key file
3. app validates the key structure and extracts:
   - service account email
   - project id when available
   - credential metadata
4. operator confirms or chooses project if needed
5. app validates resources and permissions
6. app stores the connection profile locally

### Optional future auth flow
- delegated Google user sign-in may exist later as an advanced/bootstrap mode
- it is not the primary connection model for this product

### Permission design
Use least privilege.

Think in responsibility boundaries, for example:
- Firestore projection operations
- storage deployment operations
- storage media operations
- DNS/certificate operations
- project/service validation operations

Do not assume one all-powerful identity is the correct long-term model.

For the first version, the product should at least surface:
- which permissions are missing
- which procedure is blocked by those missing permissions
- whether the user can continue in read-only or validate-only mode

## Operator Workflows

### 1. Connection setup
The operator should be able to:
- sign in
- choose a GCP project
- validate required APIs/resources
- see missing permissions
- enable supported APIs/resources when allowed
- see warnings about potentially billable operations

Useful warnings:
- creating a Firestore database is a real remote resource decision
- enabling delivery/domain resources may incur cost
- creating buckets, certificates, or CDN-backed delivery is not free

### 2. Deployment
This should be a structured procedure, not a dumb upload button.

Desired flow:
1. inspect target profile
2. compare local `deployment/` with remote deployment target
3. see:
   - files to upload
   - files to update
   - files to delete
   - files unchanged
4. review warnings
5. execute deployment
6. verify resulting remote state

### 3. Media sync
Desired flow:
1. compare local media target set with remote media target
2. see:
   - missing remote media
   - changed media
   - orphaned remote media
3. execute selected scope
4. verify result

### 4. Firestore sync
Desired flow:
1. choose projection scope
2. compare local prepared projection with remote documents
3. see creates/updates/deletes
4. execute push intentionally
5. verify counts and sample documents

### 5. Restore / repair / pull
Desired flow:
1. choose bounded scope
2. compare local vs remote
3. decide direction intentionally
4. execute restore or repair
5. verify result

Important scopes:
- one Firestore document set
- one deployment artifact subtree
- one media subtree
- one single page output
- one single media item

## Pipeline Flexibility Rules

The operator explicitly wants room to evolve the pipeline later.

That means the product should support:
- target-specific shaping rules
- configurable target mappings
- configurable hostname/path mappings
- configurable delete policies
- configurable restore policies

Strong recommendation:
- keep remote systems simple
- do the heavy shaping locally
- make remote sync mostly about reconciled delivery, not remote-side transformation

## Cost And Safety UX

The app should not try to be an exact billing engine.
It should still expose meaningful operational warnings.

Good early warnings:
- number of Firestore document writes/updates/deletes
- number and size of deployment uploads/deletes
- number and size of media uploads/deletes
- certificate/domain resources about to be created
- bucket versioning or retention cost implications

Good execution safeguards:
- dry-run preview
- explicit confirmation before destructive remote deletion
- restore preview before local overwrite
- post-run verification summary

## What It Takes Procedurally

Not code. Actual operational setup.

### Foundation
1. choose or create GCP project(s)
2. enable billing
3. create OAuth client for the desktop app
4. define who is allowed to operate remote sync and deployment

### Required APIs and product surfaces
The app should be able to validate and optionally enable the APIs it depends on.

Likely required APIs:
- Firestore API
- Cloud Storage APIs
- Cloud DNS API
- Certificate Manager API
- Compute / load-balancing related APIs for backend buckets and CDN-backed delivery
- Service Usage API for API enablement checks
- Cloud Resource Manager APIs for project inspection

Optional later:
- Cloud Billing APIs for richer cost visibility

### Resource provisioning
1. create Firestore database
2. create deployment storage target
3. create media storage target
4. configure CDN/load-balancer layer if browser delivery is needed immediately
5. configure DNS and TLS if custom domains are used

### Product-level configuration
1. create connection profile in the app
2. validate resources
3. define Firestore projection rules
4. define deployment target rules
5. define media target rules
6. define domain/routing rules if relevant
7. define delete and restore policies

### Operating procedures
1. dry-run compare
2. deploy or sync intentionally
3. verify
4. restore/repair when drift exists
5. track warnings and failures in the product UI

## Recommended Two-Step Implementation Strategy

This matches the operator suggestion and is the right way to de-risk the work.

### Step 1. Kitchensink remote-operations surface
Goal:
- prove the end-to-end remote model in one place before embedding it across the product

What this step should include:
- a dedicated `kitchensink` or remote-ops module/page
- GCP connection profile UI
- installed-app OAuth sign-in flow
- advanced service-account import flow
- resource validation view
- guided API enablement where possible
- target configuration for:
  - Firestore
  - deployment storage
  - media storage
  - optional domain/CDN targets
- dry-run diff views for:
  - Firestore push
  - deployment sync
  - media sync
  - restore/pull
- smoke-level execution flows
- some mocks or controlled adapters where full remote operations are too heavy for the first pass

Success criteria for step 1:
- the operator can connect to GCP
- validate project/resources
- see drift between local and remote
- run a controlled deploy/sync/restore smoke flow
- understand what happened from the UI

This step is intentionally about:
- protocol
- UX
- validation
- trust

It is not yet about deep embedding into every module flow.

### Step 2. Embed the workflows into product modules
Goal:
- make remote operations feel native to the actual authoring/publishing/deployment flows

What this step should include:
- Pages-aware deployment-to-remote flow
- Content-aware remote-data drift awareness
- Media-manager-aware remote media drift awareness
- settings/configuration surfaces tied to connection profiles and target profiles
- domain/deployment rules surfaced where operators naturally expect them
- contextual remote state in the modules that own the local truth

Success criteria for step 2:
- operators do not need to live in the kitchensink page for normal work
- normal product modules expose relevant remote state and next actions
- the remote workflows feel integrated, not bolted on

## Recommended Near-Term Scope Decisions

To keep the first ticket sane, I recommend these boundaries:

### Do now
- Firestore as remote projection target
- Cloud Storage as deployment/media artifact platform
- local desktop OAuth connection flow
- explicit compare/deploy/sync/restore procedures
- connection profile concept
- kitchensink first

### Defer if needed
- full automatic resource creation
- exact cost estimation
- advanced signed/private media delivery
- broad domain orchestration beyond validation and basic supported setup
- hosted/server deployment auth patterns

## Open Decisions For The Next Stage

These should become ticket choices, not research blockers:

1. Firestore projection shape
- raw mirrors
- denormalized consumer docs
- or a mix by collection

2. Artifact split
- separate buckets by artifact class
- or one bucket with strict prefixes

3. Domain topology
- separate domains for HTML and media
- or one domain with routed prefixes

4. Restore limits
- what scopes are supported in phase 1
- what destructive protections are mandatory

5. Step-1 realism level
- how much is mocked in kitchensink
- how much is fully real against GCP from day one

## Final Recommendation Snapshot

If we implement this now, the most coherent current-scope design is:

- local app initiates GCP work
- desktop OAuth is the primary auth path
- Firestore is the remote projection store
- Cloud Storage is the shared artifact platform
- Cloud CDN + load balancer + DNS + certificates provide browser delivery when needed
- sync is explicit and operator-controlled
- deployment mirrors local prepared artifacts
- restore and compare are first-class product procedures
- implementation starts with a kitchensink remote-ops surface, then moves into real module workflows

## Official References Used

- Firestore overview:
  - https://cloud.google.com/firestore/docs/overview
- Firestore export/import:
  - https://docs.cloud.google.com/firestore/docs/manage-data/export-import
- Cloud Storage static website hosting:
  - https://cloud.google.com/storage/docs/hosting-static-website
- Cloud CDN with backend bucket:
  - https://cloud.google.com/cdn/docs/setting-up-cdn-with-bucket
- Cloud Storage object versioning:
  - https://cloud.google.com/storage/docs/object-versioning
- Cloud DNS overview:
  - https://docs.cloud.google.com/dns/docs/overview
- Certificate Manager overview:
  - https://docs.cloud.google.com/certificate-manager/docs/overview
- OAuth 2.0 for installed apps:
  - https://developers.google.com/identity/protocols/oauth2/native-app
- OAuth 2.0 policies:
  - https://developers.google.com/identity/protocols/oauth2/policies
- Application Default Credentials reference:
  - https://cloud.google.com/docs/authentication/provide-credentials-adc

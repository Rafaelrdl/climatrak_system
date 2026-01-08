# TrakService API Documentation

## Overview

TrakService is a feature-gated module for Field Service management. 
It requires tenant feature flags to be enabled before access is granted.

## Namespace & Base Path

| Property | Value |
|----------|-------|
| **App** | `apps.trakservice` |
| **Base URL** | `/api/trakservice/` |
| **Router** | Included in `config/urls.py` |

---

## Dispatch Module

### Technician Profiles

Manage technician profiles for field service assignments.

#### Endpoints

| Endpoint | Method | Description | Feature Required |
|----------|--------|-------------|------------------|
| `/technicians/` | GET | List all technician profiles | `trakservice.dispatch` |
| `/technicians/` | POST | Create a technician profile | `trakservice.dispatch` |
| `/technicians/{id}/` | GET | Get technician details | `trakservice.dispatch` |
| `/technicians/{id}/` | PATCH | Update technician profile | `trakservice.dispatch` |
| `/technicians/{id}/` | DELETE | Delete technician profile | `trakservice.dispatch` |
| `/technicians/active/` | GET | List active technicians only | `trakservice.dispatch` |

#### Model: TechnicianProfile

```python
{
    "id": "uuid",                    # Primary key (UUID)
    "user": int,                     # FK to User
    "phone": "string",               # Phone number
    "skills": ["skill1", "skill2"],  # JSONField - list of skills
    "work_start_time": "08:00:00",   # Work window start
    "work_end_time": "18:00:00",     # Work window end
    "is_active": true,               # Active status
    "allow_tracking": true,          # GPS tracking consent
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

#### Example: List Technicians

```http
GET /api/trakservice/technicians/
Authorization: Bearer <token>

HTTP/1.1 200 OK
{
    "count": 2,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "user": {
                "id": 1,
                "email": "tech1@example.com",
                "first_name": "João",
                "last_name": "Silva",
                "full_name": "João Silva"
            },
            "full_name": "João Silva",
            "phone": "+55 11 99999-0001",
            "skills": ["HVAC", "Refrigeração"],
            "work_start_time": "08:00:00",
            "work_end_time": "18:00:00",
            "is_active": true,
            "allow_tracking": true,
            "created_at": "2026-01-08T10:00:00Z",
            "updated_at": "2026-01-08T10:00:00Z"
        }
    ]
}
```

#### Example: Create Technician

```http
POST /api/trakservice/technicians/
Authorization: Bearer <token>
Content-Type: application/json

{
    "user_id": 5,
    "phone": "+55 11 99999-0002",
    "skills": ["Elétrica", "Manutenção Geral"],
    "work_start_time": "07:00:00",
    "work_end_time": "16:00:00",
    "allow_tracking": true
}

HTTP/1.1 201 Created
{
    "id": "550e8400-e29b-41d4-a716-446655440001",
    ...
}
```

#### Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| `is_active` | boolean | Filter by active status |
| `search` | string | Search by user name or email |

---

### Service Assignments

Link work orders to technicians with scheduling and status tracking.

#### Endpoints

| Endpoint | Method | Description | Feature Required |
|----------|--------|-------------|------------------|
| `/assignments/` | GET | List all assignments | `trakservice.dispatch` |
| `/assignments/` | POST | Create an assignment | `trakservice.dispatch` |
| `/assignments/{id}/` | GET | Get assignment details | `trakservice.dispatch` |
| `/assignments/{id}/` | PATCH | Update assignment | `trakservice.dispatch` |
| `/assignments/{id}/` | DELETE | Delete assignment | `trakservice.dispatch` |
| `/assignments/{id}/status/` | POST | Change assignment status | `trakservice.dispatch` |
| `/assignments/today/` | GET | Get today's assignments | `trakservice.dispatch` |
| `/assignments/week/` | GET | Get this week's assignments | `trakservice.dispatch` |
| `/assignments/by-technician/{tech_id}/` | GET | Get assignments for a technician | `trakservice.dispatch` |

#### Model: ServiceAssignment

```python
{
    "id": "uuid",                          # Primary key (UUID)
    "work_order": int,                     # FK to WorkOrder
    "technician": "uuid",                  # FK to TechnicianProfile
    "scheduled_date": "2026-01-15",        # Date of assignment
    "scheduled_start": "09:00:00",         # Optional start time
    "scheduled_end": "11:00:00",           # Optional end time
    "status": "scheduled",                 # Status enum
    "departed_at": "datetime|null",        # When tech left for site
    "arrived_at": "datetime|null",         # When tech arrived at site
    "completed_at": "datetime|null",       # When work completed
    "canceled_at": "datetime|null",        # When canceled
    "notes": "string",                     # Assignment notes
    "cancellation_reason": "string",       # Reason if canceled
    "created_by": int,                     # User who created
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

#### Status Flow

```
scheduled → en_route → on_site → done
    ↓          ↓          ↓
 canceled   canceled   canceled
```

| Status | Description | Timestamps Updated |
|--------|-------------|-------------------|
| `scheduled` | Initial state - assignment created | - |
| `en_route` | Technician departed for site | `departed_at` |
| `on_site` | Technician arrived at site | `arrived_at` |
| `done` | Work completed | `completed_at` |
| `canceled` | Assignment canceled | `canceled_at` |

#### Example: List Assignments

```http
GET /api/trakservice/assignments/?date=2026-01-15&status=scheduled
Authorization: Bearer <token>

HTTP/1.1 200 OK
{
    "count": 3,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": "660e8400-e29b-41d4-a716-446655440000",
            "work_order": 42,
            "work_order_number": "OS-2026-0042",
            "work_order_description": "Manutenção preventiva - Chiller",
            "work_order_priority": "MEDIUM",
            "work_order_status": "OPEN",
            "asset_name": "Chiller York 200TR",
            "asset_location": "Bloco A / Sala de Máquinas",
            "technician": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "full_name": "João Silva",
                "email": "joao@example.com",
                "is_active": true
            },
            "scheduled_date": "2026-01-15",
            "scheduled_start": "09:00:00",
            "scheduled_end": "11:00:00",
            "status": "scheduled",
            "status_display": "Agendado",
            "departed_at": null,
            "arrived_at": null,
            "completed_at": null,
            "canceled_at": null,
            "notes": "Levar ferramentas especiais",
            "cancellation_reason": "",
            "created_by": 1,
            "created_by_name": "Admin",
            "created_at": "2026-01-10T14:00:00Z",
            "updated_at": "2026-01-10T14:00:00Z"
        }
    ]
}
```

#### Example: Create Assignment

```http
POST /api/trakservice/assignments/
Authorization: Bearer <token>
Content-Type: application/json

{
    "work_order": 42,
    "technician": "550e8400-e29b-41d4-a716-446655440000",
    "scheduled_date": "2026-01-15",
    "scheduled_start": "09:00:00",
    "scheduled_end": "11:00:00",
    "notes": "Levar ferramentas especiais"
}

HTTP/1.1 201 Created
{
    "id": "660e8400-e29b-41d4-a716-446655440000",
    ...
}
```

#### Example: Update Status

```http
POST /api/trakservice/assignments/660e8400-e29b-41d4-a716-446655440000/status/
Authorization: Bearer <token>
Content-Type: application/json

{
    "status": "en_route"
}

HTTP/1.1 200 OK
{
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "status": "en_route",
    "departed_at": "2026-01-15T08:45:00Z",
    ...
}
```

#### Example: Cancel Assignment

```http
POST /api/trakservice/assignments/660e8400-e29b-41d4-a716-446655440000/status/
Authorization: Bearer <token>
Content-Type: application/json

{
    "status": "canceled",
    "reason": "Cliente solicitou reagendamento"
}

HTTP/1.1 200 OK
{
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "status": "canceled",
    "canceled_at": "2026-01-15T08:30:00Z",
    "cancellation_reason": "Cliente solicitou reagendamento",
    ...
}
```

#### Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| `date` | string (YYYY-MM-DD) | Filter by exact scheduled date |
| `date_from` | string (YYYY-MM-DD) | Filter scheduled_date >= |
| `date_to` | string (YYYY-MM-DD) | Filter scheduled_date <= |
| `technician_id` | uuid | Filter by technician |
| `work_order_id` | integer | Filter by work order |
| `status` | string | Filter by status (can repeat for multiple) |
| `search` | string | Search by WO number, description, asset name |

---

## Metadata Endpoints

---

## Metadata Endpoints

| Endpoint | Method | Description | Feature Required |
|----------|--------|-------------|------------------|
| `/_meta/` | GET | Module metadata and version | `trakservice.enabled` |
| `/_health/` | GET | Health check status | `trakservice.enabled` |

### Example Requests

**Get Module Metadata**
```http
GET /api/trakservice/_meta/
Authorization: Bearer <token>

HTTP/1.1 200 OK
{
    "module": "trakservice",
    "version": "1.0.0",
    "features": {
        "trakservice.enabled": true,
        "trakservice.dispatch": true,
        "trakservice.tracking": false,
        "trakservice.routing": false,
        "trakservice.km": false,
        "trakservice.quotes": false
    },
    "status": "operational"
}
```

**Get Health Status**
```http
GET /api/trakservice/_health/
Authorization: Bearer <token>

HTTP/1.1 200 OK
{
    "status": "healthy",
    "timestamp": "2026-01-08T10:30:00Z",
    "tenant_id": 1,
    "features_enabled": ["trakservice.enabled", "trakservice.dispatch"]
}
```

## Feature Flags

TrakService uses hierarchical feature flags stored per tenant:

| Feature Key | Description | Default |
|-------------|-------------|---------|
| `trakservice.enabled` | Master toggle for TrakService module | `false` |
| `trakservice.dispatch` | Dispatch/scheduling functionality | `false` |
| `trakservice.tracking` | GPS/location tracking | `false` |
| `trakservice.routing` | Route optimization | `false` |
| `trakservice.km` | Kilometer/mileage tracking | `false` |
| `trakservice.quotes` | Quotation/estimate functionality | `false` |

## Enabling TrakService for a Tenant

### Via Django Admin

1. Go to Admin → Tenants → Tenant Features
2. Click "Add Tenant Feature"
3. Select the tenant and feature key
4. Check "Enabled"
5. Save

### Via Management Command

```bash
python manage.py shell
>>> from apps.tenants.features import FeatureService
>>> FeatureService.set_feature(tenant_id=1, feature_key='trakservice.enabled', enabled=True)
>>> FeatureService.set_feature(tenant_id=1, feature_key='trakservice.dispatch', enabled=True)
```

### Via Code (in signals/services)

```python
from apps.tenants.features import FeatureService

# Enable all TrakService features
FeatureService.set_features(
    tenant_id=tenant.id,
    features={
        'trakservice.enabled': True,
        'trakservice.dispatch': True,
        'trakservice.tracking': True,
        'trakservice.routing': True,
        'trakservice.km': True,
        'trakservice.quotes': True,
    }
)
```

## API Access Control

### Endpoint Response When Feature Disabled

When a tenant tries to access a TrakService endpoint without the required features:

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
    "detail": "Feature 'trakservice.enabled' is not enabled for your organization."
}
```

### Checking Features in /api/auth/me/

The `/api/auth/me/` endpoint returns tenant features in the response:

```json
{
    "user": {
        "id": 1,
        "email": "user@example.com",
        "full_name": "John Doe"
    },
    "tenant": {
        "id": 1,
        "schema_name": "tenant_acme",
        "name": "ACME Corp",
        "slug": "acme",
        "role": "admin",
        "features": {
            "trakservice.enabled": true,
            "trakservice.dispatch": true,
            "trakservice.tracking": false,
            "trakservice.routing": false,
            "trakservice.km": false,
            "trakservice.quotes": false
        }
    }
}
```

## Backend Permission Classes

### FeatureRequired

Generic permission class for any feature:

```python
from rest_framework.permissions import IsAuthenticated
from apps.tenants.permissions import FeatureRequired

class MyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, FeatureRequired]
    required_features = ['trakservice.enabled', 'trakservice.dispatch']
```

### TrakServiceFeatureRequired

Convenience class that automatically checks `trakservice.enabled`:

```python
from apps.tenants.permissions import TrakServiceFeatureRequired

class DispatchViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, TrakServiceFeatureRequired]
    trakservice_features = ['dispatch']  # Will check trakservice.dispatch
```

### Decorator Usage

For function-based views or ViewSet actions:

```python
from apps.tenants.permissions import feature_required, trakservice_feature_required

@api_view(['POST'])
@feature_required('trakservice.enabled', 'trakservice.quotes')
def create_quote(request):
    ...

@api_view(['GET'])
@trakservice_feature_required('tracking')  # Automatically checks trakservice.enabled too
def get_location(request):
    ...
```

## Frontend Feature Gating

### Feature Store

Access feature state via Zustand store:

```typescript
import { useFeature, useTrakService, useTrakServiceFeature } from '@/store/useFeaturesStore';

function MyComponent() {
    const hasTrakService = useTrakService();
    const hasDispatch = useTrakServiceFeature('dispatch');
    
    if (!hasTrakService) return null;
    // ...
}
```

### Conditional Rendering

```tsx
import { IfTrakService, IfTrakServiceFeature } from '@/components/auth/FeatureGate';

function Navigation() {
    return (
        <nav>
            <IfTrakService>
                <Link to="/trakservice">TrakService</Link>
            </IfTrakService>
            
            <IfTrakServiceFeature feature="dispatch">
                <Link to="/trakservice/dispatch">Dispatch</Link>
            </IfTrakServiceFeature>
        </nav>
    );
}
```

### Route Guards

```tsx
import { TrakServiceRouteGuard } from '@/components/auth/FeatureGate';

<Route path="/trakservice/*" element={
    <TrakServiceRouteGuard>
        <TrakServiceRoutes />
    </TrakServiceRouteGuard>
} />

// With sub-features
<Route path="/trakservice/dispatch/*" element={
    <TrakServiceRouteGuard features={['dispatch']}>
        <DispatchRoutes />
    </TrakServiceRouteGuard>
} />
```

## Testing

### Backend Tests

```bash
cd backend
pytest apps/tenants/tests/test_tenant_features.py -v
```

### Frontend Tests

```bash
cd frontend
npm test -- --testPathPattern=features
```

## Caching

Features are cached for 5 minutes (300 seconds) per tenant to reduce database queries.
Cache is automatically invalidated when features are modified via `FeatureService`.

To manually invalidate cache:

```python
from apps.tenants.features import FeatureService
FeatureService.invalidate_cache(tenant_id)
```

## Events

When TrakService features are modified, consider publishing events for audit/integration:

```python
from apps.core_events.services import EventPublisher

EventPublisher.publish(
    tenant_id=tenant.id,
    event_name='tenant.feature_updated',
    aggregate_type='tenant',
    aggregate_id=str(tenant.id),
    data={
        'feature_key': 'trakservice.enabled',
        'enabled': True,
    }
)
```

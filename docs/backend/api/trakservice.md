# TrakService API Documentation

## Overview

TrakService is a feature-gated module for Field Service management. 
It requires tenant feature flags to be enabled before access is granted.

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

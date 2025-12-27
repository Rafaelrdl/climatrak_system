"""
Decorators for Control Center views.
"""
from functools import wraps
import time
from .models import AuditLog


def audit_action(action_type, get_tenant_slug=None, get_filters=None):
    """
    Decorator to automatically log actions to audit log.
    
    Usage:
        @audit_action(
            action_type=AuditLog.ACTION_VIEW_LIST,
            get_tenant_slug=lambda req: req.GET.get('tenant_slug'),
            get_filters=lambda req: {'sensor_id': req.GET.get('sensor_id')}
        )
        def my_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            start_time = time.time()
            
            # Execute the view
            response = view_func(request, *args, **kwargs)
            
            # Calculate execution time
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            # Extract metadata
            tenant_slug = get_tenant_slug(request) if get_tenant_slug else ''
            filters = get_filters(request) if get_filters else {}
            
            # Try to extract record count from response
            record_count = None
            if hasattr(response, 'content') and response.get('Content-Type', '').startswith('application/json'):
                try:
                    import json
                    data = json.loads(response.content)
                    if isinstance(data, dict):
                        record_count = data.get('meta', {}).get('total') or len(data.get('data', []))
                except:
                    pass
            
            # Log to audit
            try:
                AuditLog.log_action(
                    request=request,
                    action=action_type,
                    tenant_slug=tenant_slug,
                    filters=filters,
                    record_count=record_count,
                    execution_time_ms=execution_time_ms
                )
            except Exception as e:
                # Don't fail the request if audit logging fails
                print(f"⚠️ Audit log failed: {e}")
            
            return response
        
        return wrapped_view
    return decorator

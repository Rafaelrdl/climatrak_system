"""
Compatibility layer for Unfold admin decorators.

This module provides a fallback when unfold is not installed (e.g., in Celery workers).
"""

from functools import wraps

try:
    from unfold.decorators import display as unfold_display

    HAS_UNFOLD = True
except ImportError:
    HAS_UNFOLD = False
    unfold_display = None


def display(
    description=None,
    ordering=None,
    label=None,
    header=None,
    boolean=None,
    empty_value=None,
):
    """
    Wrapper for unfold.decorators.display that works when unfold is not installed.

    When unfold is installed, uses the full functionality with colored labels.
    When unfold is not installed, falls back to basic Django admin display behavior.
    """
    if HAS_UNFOLD and unfold_display is not None:
        # Use unfold's display decorator
        return unfold_display(
            description=description,
            ordering=ordering,
            label=label,
            header=header,
            boolean=boolean,
            empty_value=empty_value,
        )

    # Fallback: simple decorator that sets admin_order_field and short_description
    def decorator(func):
        @wraps(func)
        def wrapper(self, obj):
            result = func(self, obj)
            # If result is a tuple (value, display_text), return display_text
            if isinstance(result, tuple) and len(result) == 2:
                return result[1]
            return result

        if description:
            wrapper.short_description = description
        if ordering:
            wrapper.admin_order_field = ordering
        if boolean is not None:
            wrapper.boolean = boolean

        return wrapper

    return decorator

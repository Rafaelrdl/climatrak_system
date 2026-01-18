"""
Compatibility layer for admin decorators.

This module provides a unified display decorator that works across Django versions.
Previously used for Unfold compatibility, now uses Django's built-in display decorator.
"""

from functools import wraps
from django.contrib.admin import display as django_display


def display(
    description=None,
    ordering=None,
    label=None,
    header=None,
    boolean=None,
    empty_value=None,
):
    """
    Wrapper for Django's admin display decorator with Jazzmin compatibility.

    Uses Django's built-in display decorator. The `label` parameter (previously used
    by Unfold for colored labels) is handled by returning a badge HTML directly
    in the decorated function.
    
    Args:
        description: Short description for the column header
        ordering: Field name to use for sorting
        label: Dict mapping values to Bootstrap color classes (for badge styling)
        header: Not used (kept for backward compatibility)
        boolean: If True, display as boolean icon
        empty_value: Value to display when result is None
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, obj):
            result = func(self, obj)
            
            # Handle tuple returns (value, display_text) from old Unfold style
            if isinstance(result, tuple) and len(result) == 2:
                value, display_text = result
                # If label dict provided, format as Bootstrap badge
                if label and value in label:
                    from django.utils.html import format_html
                    badge_class = label[value]
                    return format_html(
                        '<span class="badge badge-{}">{}</span>',
                        badge_class,
                        display_text
                    )
                return display_text
            return result

        # Apply Django's display decorator attributes
        if description:
            wrapper.short_description = description
        if ordering:
            wrapper.admin_order_field = ordering
        if boolean is not None:
            wrapper.boolean = boolean
        if empty_value:
            wrapper.empty_value_display = empty_value

        return wrapper

    return decorator

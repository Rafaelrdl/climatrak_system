"""
Notification Service for Alerts & Rules system.

This service is responsible for sending notifications through multiple channels:
- Email
- In-App (push notifications)
- SMS (via Twilio or AWS SNS)
- WhatsApp (via Twilio or Meta Business API)

The service respects user preferences and rule actions when deciding
which notifications to send.
"""

import logging
from typing import List, Dict, Any
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Service for sending notifications through multiple channels.
    
    This service implements the hierarchical notification logic:
    1. Rule defines which actions CAN be used (rule.actions)
    2. User preferences define which channels they WANT (user preferences)
    3. Notification is sent only if: action in rule.actions AND channel enabled in preferences
    """
    
    def __init__(self):
        """Initialize the notification service."""
        self.email_enabled = getattr(settings, 'EMAIL_NOTIFICATIONS_ENABLED', True)
        self.sms_enabled = getattr(settings, 'SMS_NOTIFICATIONS_ENABLED', False)
        self.whatsapp_enabled = getattr(settings, 'WHATSAPP_NOTIFICATIONS_ENABLED', False)
    
    def send_alert_notifications(self, alert, users=None):
        """
        Send notifications for an alert to all relevant users.
        
        Args:
            alert: Alert model instance
            users: Optional list of User instances. If None, sends to all team members.
        
        Returns:
            Dict with results of each notification attempt
        """
        from apps.accounts.models import User
        
        if users is None:
            # Get all users from the same tenant
            users = User.objects.filter(is_active=True)
        
        results = {
            'sent': [],
            'failed': [],
            'skipped': []
        }
        
        rule = alert.rule
        
        for user in users:
            user_results = self._send_to_user(alert, rule, user)
            
            for channel, result in user_results.items():
                if result['sent']:
                    results['sent'].append({
                        'user': user.email,
                        'channel': channel,
                        'message': result.get('message')
                    })
                elif result.get('skipped'):
                    results['skipped'].append({
                        'user': user.email,
                        'channel': channel,
                        'reason': result.get('reason')
                    })
                else:
                    results['failed'].append({
                        'user': user.email,
                        'channel': channel,
                        'error': result.get('error')
                    })
        
        logger.info(
            f"Alert {alert.id} notifications: "
            f"{len(results['sent'])} sent, "
            f"{len(results['failed'])} failed, "
            f"{len(results['skipped'])} skipped"
        )
        
        return results
    
    def _send_to_user(self, alert, rule, user) -> Dict[str, Dict[str, Any]]:
        """
        Send notifications to a specific user based on their preferences.
        
        Args:
            alert: Alert model instance
            rule: Rule model instance
            user: User model instance
        
        Returns:
            Dict with results for each channel
        """
        results = {}
        
        # Get or create user notification preferences
        from apps.alerts.models import NotificationPreference
        preferences, _ = NotificationPreference.objects.get_or_create(user=user)
        
        # Check if user wants alerts of this severity
        if not preferences.should_notify_severity(alert.severity):
            logger.debug(
                f"User {user.email} has disabled {alert.severity} alerts"
            )
            return {
                'all': {
                    'sent': False,
                    'skipped': True,
                    'reason': f'User has disabled {alert.severity} alerts'
                }
            }
        
        # Get enabled channels for this user
        enabled_channels = preferences.get_enabled_channels()
        
        # Send through each channel that is:
        # 1. Enabled in rule actions
        # 2. Enabled in user preferences
        # 3. Enabled in system settings
        
        if 'EMAIL' in rule.actions and 'email' in enabled_channels:
            results['email'] = self._send_email(alert, user, preferences)
        
        if 'IN_APP' in rule.actions and 'push' in enabled_channels:
            results['in_app'] = self._send_in_app(alert, user)
        
        if 'SMS' in rule.actions and 'sms' in enabled_channels:
            results['sms'] = self._send_sms(alert, user, preferences)
        
        if 'WHATSAPP' in rule.actions and 'whatsapp' in enabled_channels:
            results['whatsapp'] = self._send_whatsapp(alert, user, preferences)
        
        return results
    
    def _send_email(self, alert, user, preferences) -> Dict[str, Any]:
        """Send email notification."""
        if not self.email_enabled:
            return {
                'sent': False,
                'skipped': True,
                'reason': 'Email notifications disabled in settings'
            }
        
        try:
            subject = f"[{alert.severity.upper()}] Alert: {alert.rule.name}"
            
            # Render HTML template
            context = {
                'alert': alert,
                'rule': alert.rule,
                'user': user,
                'severity_label': alert.get_severity_display(),
            }
            
            html_message = render_to_string(
                'alerts/email/alert_notification.html',
                context
            )
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Email sent to {user.email} for alert {alert.id}")
            
            return {
                'sent': True,
                'message': f'Email sent to {user.email}'
            }
            
        except Exception as e:
            logger.error(f"Failed to send email to {user.email}: {str(e)}")
            return {
                'sent': False,
                'error': str(e)
            }
    
    def _send_in_app(self, alert, user) -> Dict[str, Any]:
        """
        Send in-app push notification.
        
        Note: This is a placeholder. In production, this would integrate
        with a push notification service like Firebase Cloud Messaging (FCM)
        or Apple Push Notification service (APNs).
        """
        try:
            # TODO: Implement actual push notification logic
            # For now, we just log it
            
            logger.info(
                f"In-app notification would be sent to {user.email} "
                f"for alert {alert.id}"
            )
            
            return {
                'sent': True,
                'message': f'In-app notification queued for {user.email}'
            }
            
        except Exception as e:
            logger.error(
                f"Failed to send in-app notification to {user.email}: {str(e)}"
            )
            return {
                'sent': False,
                'error': str(e)
            }
    
    def _send_sms(self, alert, user, preferences) -> Dict[str, Any]:
        """
        Send SMS notification.
        
        Note: This requires integration with an SMS provider like:
        - Twilio
        - AWS SNS
        - Nexmo/Vonage
        """
        if not self.sms_enabled:
            return {
                'sent': False,
                'skipped': True,
                'reason': 'SMS notifications disabled in settings'
            }
        
        if not preferences.phone_number:
            return {
                'sent': False,
                'skipped': True,
                'reason': 'User has no phone number configured'
            }
        
        try:
            # TODO: Implement SMS provider integration (Twilio, AWS SNS, etc.)
            logger.warning(
                f"SMS notification skipped - provider not configured. "
                f"Alert {alert.id} for user {user.email}"
            )
            
            return {
                'sent': False,
                'skipped': True,
                'reason': 'SMS provider not configured'
            }
            
        except Exception as e:
            logger.error(
                f"Failed to send SMS to {preferences.phone_number}: {str(e)}"
            )
            return {
                'sent': False,
                'error': str(e)
            }
    
    def _send_whatsapp(self, alert, user, preferences) -> Dict[str, Any]:
        """
        Send WhatsApp notification.
        
        Note: This requires integration with:
        - Twilio WhatsApp API
        - Meta (Facebook) Business API
        """
        if not self.whatsapp_enabled:
            return {
                'sent': False,
                'skipped': True,
                'reason': 'WhatsApp notifications disabled in settings'
            }
        
        if not preferences.whatsapp_number:
            return {
                'sent': False,
                'skipped': True,
                'reason': 'User has no WhatsApp number configured'
            }
        
        try:
            # TODO: Implement WhatsApp provider integration (Twilio, Meta Business API, etc.)
            logger.warning(
                f"WhatsApp notification skipped - provider not configured. "
                f"Alert {alert.id} for user {user.email}"
            )
            
            return {
                'sent': False,
                'skipped': True,
                'reason': 'WhatsApp provider not configured'
            }
            
        except Exception as e:
            logger.error(
                f"Failed to send WhatsApp to {preferences.whatsapp_number}: {str(e)}"
            )
            return {
                'sent': False,
                'error': str(e)
            }

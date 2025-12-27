"""
Custom JWT Authentication from HttpOnly Cookies

This module provides a secure authentication backend that reads JWT tokens
from HttpOnly cookies instead of Authorization headers, protecting against XSS attacks.

Security Benefits:
- Tokens in HttpOnly cookies are inaccessible to JavaScript
- Protects against XSS token theft
- Maintains compatibility with simplejwt token validation
- Fallback to Authorization header for API clients (optional)

Usage:
    Add to settings.py REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES']:
    'apps.common.authentication.JWTCookieAuthentication'
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from django.conf import settings


class JWTCookieAuthentication(JWTAuthentication):
    """
    JWT Authentication using HttpOnly cookies
    
    Reads access_token from HttpOnly cookies instead of Authorization header.
    This prevents XSS attacks from stealing JWT tokens.
    
    Cookie Strategy (PRODUCTION):
    1. Backend sets access_token in HttpOnly cookie during login
    2. Browser automatically sends cookie with each request
    3. This class reads token from cookie and validates it
    4. No token in localStorage/sessionStorage (XSS protection)
    
    Fallback Strategy (DEVELOPMENT):
    - If cookie not present, falls back to Authorization header
    - Allows testing with tools like Postman/curl
    - Should be disabled in production for maximum security
    """
    
    def authenticate(self, request):
        """
        Authenticate request using token from HttpOnly cookie
        
        Priority:
        1. Try to read from 'access_token' cookie (secure method)
        2. Fallback to Authorization header (for API clients)
        
        Returns:
            tuple: (user, validated_token) if successful
            None: if no token found
        
        Raises:
            AuthenticationFailed: if token is invalid
        """
        # 1. Try to get token from HttpOnly cookie (PREFERRED)
        raw_token = request.COOKIES.get('access_token')
        
        if raw_token:
            # Validate token using simplejwt's built-in validation
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            
            if settings.DEBUG:
                print(f"🔐 Authenticated via cookie: {user.username}")
            
            return (user, validated_token)
        
        # 2. Fallback to Authorization header (for API clients like Postman)
        # This is optional - remove in production for cookie-only auth
        header = self.get_header(request)
        if header is None:
            return None
        
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
        
        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        
        if settings.DEBUG:
            print(f"⚠️ Authenticated via header: {user.username} (use cookies in production)")
        
        return (user, validated_token)

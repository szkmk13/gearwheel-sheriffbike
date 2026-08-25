from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import fetch_google_reviews


class GoogleReviewsView(APIView):
    """Public read-only feed of the shop's Google reviews for the landing page."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        data = fetch_google_reviews()
        if data is None:
            # Not configured, or Google is unreachable. The frontend falls back
            # to its own hardcoded numbers, so a 200 with source="fallback"
            # keeps that path simple - this is not an error the user caused.
            return Response({'source': 'fallback', 'reviews': []})
        return Response({'source': 'google', **data})

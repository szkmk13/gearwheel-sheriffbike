"""Google reviews for the landing page, via the Places API (New).

The API key must never reach the browser, so the frontend hits our own
/api/reviews/ and this module is the only thing that talks to Google.

Two constraints shape the design:
  - Google's terms allow caching place *content* for a limited time only, and
    every call is billed, so results are cached for CACHE_TTL rather than
    stored permanently.
  - Places API returns at most 5 reviews, chosen by Google. There is no way to
    page through all of them - that needs the Business Profile API and OAuth
    as the business owner.
"""

import logging

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

PLACES_URL = 'https://places.googleapis.com/v1/places/{place_id}'
FIELD_MASK = 'rating,userRatingCount,googleMapsUri,reviews'
CACHE_KEY = 'google_reviews'
CACHE_TTL = 60 * 60 * 12  # 12h - well inside Google's caching window
TIMEOUT = 6


def _shape_review(raw):
    author = raw.get('authorAttribution') or {}
    return {
        # Attribution is required by Google's terms - author name, photo and a
        # link back to the review must be displayed alongside the text.
        'author': author.get('displayName', ''),
        'author_photo': author.get('photoUri', ''),
        'author_url': author.get('uri', ''),
        'rating': raw.get('rating'),
        'text': (raw.get('originalText') or raw.get('text') or {}).get('text', ''),
        'relative_time': raw.get('relativePublishTimeDescription', ''),
        'publish_time': raw.get('publishTime', ''),
    }


def fetch_google_reviews():
    """Return {rating, total, maps_url, reviews[]} or None if unavailable.

    None means "call the fallback" - the landing page must never render an
    empty reviews section just because Google is down or unconfigured.
    """
    cached = cache.get(CACHE_KEY)
    if cached is not None:
        return cached

    api_key = settings.GOOGLE_PLACES_API_KEY
    place_id = settings.GOOGLE_PLACE_ID
    if not api_key or not place_id:
        logger.info('Google reviews not configured - GOOGLE_PLACES_API_KEY/GOOGLE_PLACE_ID missing')
        return None

    try:
        response = requests.get(
            PLACES_URL.format(place_id=place_id),
            headers={
                'X-Goog-Api-Key': api_key,
                'X-Goog-FieldMask': FIELD_MASK,
            },
            params={'languageCode': 'pl'},
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError):
        logger.exception('Failed to fetch Google reviews')
        return None

    reviews = [_shape_review(r) for r in payload.get('reviews', [])]
    # Google orders reviews by its own relevance ranking. The landing page
    # wants newest first instead. publishTime is RFC3339 and always UTC
    # ("...Z"), so a plain string sort is already chronological - no parsing
    # needed. Missing timestamps sort last rather than blowing up.
    reviews.sort(key=lambda r: r.get('publish_time') or '', reverse=True)

    data = {
        'rating': payload.get('rating'),
        'total': payload.get('userRatingCount'),
        'maps_url': payload.get('googleMapsUri', ''),
        'reviews': reviews,
    }
    cache.set(CACHE_KEY, data, CACHE_TTL)
    return data

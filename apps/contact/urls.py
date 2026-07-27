from django.urls import path

from .views import ContactFormView

urlpatterns = [
    path('contact_form/', ContactFormView.as_view(), name='contact-form'),
]

from django.urls import path
from .views import IngestView

urlpatterns = [
    path('', IngestView.as_view(), name='ingest'),
]

import pytest
from app.database.session import engine, Base
from app.database.models import Device, PairingRequest, Memory, Conversation, Message, AuditLog, Automation

@pytest.fixture(autouse=True, scope="session")
def setup_test_database():
    Base.metadata.create_all(bind=engine)
    yield

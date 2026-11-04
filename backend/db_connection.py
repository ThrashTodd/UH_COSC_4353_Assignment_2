
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

# Load the .env file from the project's root folder.
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def get_connection():
    """Create a connection to the PostgreSQL database."""

    if os.getenv("TESTING") == "true":
        databaseName = os.getenv("TEST_PGDATABASE") 
        databaseUser = os.getenv("TEST_PGUSER") 
        databasePass = os.getenv("TEST_PGPASSWORD") 
    else:
        databaseName = os.getenv("PGDATABASE")
        databaseUser = os.getenv("PGUSER") 
        databasePass = os.getenv("PGPASSWORD") 

    return psycopg.connect(
        host=os.getenv("PGHOST", "127.0.0.1"),
        port=int(os.getenv("PGPORT", "5432")),
        dbname=databaseName,
        user=databaseUser,
        password=databasePass,
        connect_timeout=5,
    )

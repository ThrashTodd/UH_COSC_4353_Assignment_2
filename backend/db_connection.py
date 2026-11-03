
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

# Load the .env file from the project's root folder.
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def get_connection(is_test = False):
    """Create a connection to the PostgreSQL database."""

    databaseName = os.getenv("TEST_PGDATABASE") if is_test else os.getenv("PGDATABASE")

    return psycopg.connect(
        host=os.getenv("PGHOST", "127.0.0.1"),
        port=int(os.getenv("PGPORT", "5432")),
        dbname=databaseName,
        user=os.getenv("PGUSER", "postgres"),
        password=os.environ["PGPASSWORD"],
        connect_timeout=5,
    )

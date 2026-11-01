
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

# Load the .env file from the project's root folder.
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def get_connection():
    """Create a connection to the PostgreSQL database."""
    return psycopg.connect(
        host=os.getenv("PGHOST", "127.0.0.1"),
        port=int(os.getenv("PGPORT", "5432")),
        dbname=os.getenv("PGDATABASE", "queuesmart"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.environ["PGPASSWORD"],
        connect_timeout=5,
    )

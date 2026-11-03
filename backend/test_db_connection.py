
from db_connection import get_connection


def test_connection(is_test = False):
    try:
        with get_connection(is_test) as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT current_database()")
                database_name = cursor.fetchone()[0]

                print("Connected to:", database_name)

                cursor.execute("""
                    SELECT service_id, service_name,
                           expected_duration
                    FROM service
                    ORDER BY service_name
                """)

                services = cursor.fetchall()

                print("\nAvailable services:")
                for service in services:
                    print(service)

        print("\nPostgreSQL connection successful!")

    except Exception as error:
        print("Database connection failed:")
        print(error)


if __name__ == "__main__":
    test_connection(is_test= False)

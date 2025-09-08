# This file is deprecated and should not be used.
# The application entry point is now `wsgi.py`.
# The application is created using the factory pattern in `app_factory.py`.

# To run the application for development, use the command:
# flask run

# For production, use a WSGI server like Gunicorn with wsgi.py:
# gunicorn --bind 0.0.0.0:5000 wsgi:app

import sys

if __name__ == '__main__':
    sys.exit("ERROR: This file (app.py) is deprecated. Please use 'flask run' or a WSGI server with wsgi.py.")

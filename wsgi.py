from app_factory import create_app
import os

# Get the config name from environment variable or use default
config_name = os.getenv('FLASK_CONFIG') or 'default'
app = create_app(config_name)

if __name__ == "__main__":
    app.run()

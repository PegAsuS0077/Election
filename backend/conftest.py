import sys
import os

# Add the backend/ directory to sys.path so that tests can import
# top-level modules like database, scraper, and main directly.
sys.path.insert(0, os.path.dirname(__file__))

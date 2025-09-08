#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Database Configuration
Centralized SQLAlchemy instance for Al-Awael ERP Platform
"""

from flask_sqlalchemy import SQLAlchemy

# Single SQLAlchemy instance for the entire application
db = SQLAlchemy()

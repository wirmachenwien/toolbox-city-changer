"""Shared Python library for the handbook print builders.

Import-only package (never executed directly): scripts/bin/build-pdf.py
and scripts/bin/build-epub.py add scripts/ to sys.path and import from
here. Modules: book (paths, config, CLI, rendering glue), mdx (MDX
component conversion), typography (smart quotes), config (TS config
bridge).
"""

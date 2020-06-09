#!/usr/bin/env python3

import json
import os
import sys

TEMPLATES_JSON_PATH = os.path.join(os.getcwd(), 'src', 'dynamic-templates.json')
TEMPLATES_JSON = json.load(open(TEMPLATES_JSON_PATH))

def process_chapter(ch):
  for d in TEMPLATES_JSON:
    ch['content'] = ch['content'].replace(d['template'], d['fallback'])
  for c in ch['sub_items']:
    process_chapter(c['Chapter'])

# Parse arguments.
if len(sys.argv) > 1:
    if sys.argv[1] == 'supports':
        # sys.argv[2] is the renderer name
        sys.exit(0)

# Read context and book from stdin given to us by mdbook.
context, book = json.load(sys.stdin)

# Replace with fallback host for non-HTML renderers.
if context['renderer'] != 'html':
  for section in book['sections']:
    process_chapter(section['Chapter'])

# Output modified book.
json.dump(book, sys.stdout)

#!/usr/bin/env python3

import json
import os
import sys

if len(sys.argv) > 1:
    if sys.argv[1] == 'supports':
        # sys.argv[2] is the renderer name
        sys.exit(0)

# Read context and book from mdbook.
context, book = json.load(sys.stdin)

TEMPLATES_JSON_PATH = os.path.join(os.getcwd(), 'src', 'dynamic-templates.json')
TEMPLATES_JSON = json.load(open(TEMPLATES_JSON_PATH))

def process_chapter(ch):
  # Just replace with fallback host for non-HTML renderers.
  if context['renderer'] != 'html':
    for d in TEMPLATES_JSON:
      ch['content'] = ch['content'].replace(d['template'], d['fallback'])

  for c in ch['sub_items']:
    process_chapter(c['Chapter'])

for section in book['sections']:
  process_chapter(section['Chapter'])

# Output book immediately since we don't modify it.
json.dump(book, sys.stdout)

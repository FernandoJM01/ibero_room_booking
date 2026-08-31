#!/bin/bash

patch_file() {
  local file=$1
  local sig=$2
  
  # Replace first occurrence
  sed -i '' -E "0,/document.addEventListener\('DOMContentLoaded', (async )?\(\) => \{/s//const init = async () => \{\n  if (!document.getElementById('$sig')) return;/" "$file"
  
  # Replace last occurrence (using a reverse trick)
  # Actually, `sed -i '' '$ s/});/};\n\ndocument.addEventListener('\''DOMContentLoaded'\'', init);\ndocument.addEventListener('\''SPA:Navigated'\'', init);\n/'` will work IF it's on the last line!
  
  # Let's just do it in python with string replace from the right!
}

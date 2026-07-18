#!/bin/sh
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8000}"
node -e "
const fs = require('fs');
const path = '/app/public/runtime-config.js';
const url = '$API_URL';
const content = 'self.__API_URL__ = \"' + url + '\";';
fs.writeFileSync(path, content);
console.log('Runtime API URL set to:', url);
"
exec node_modules/.bin/next start

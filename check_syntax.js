const fs = require('fs');
const acorn = require('acorn');

const code = fs.readFileSync('app.js', 'utf-8');
try {
  acorn.parse(code, { ecmaVersion: 2020 });
  console.log("Syntax OK");
} catch (e) {
  console.error("Syntax Error:", e.message);
}
